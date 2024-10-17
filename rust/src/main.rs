use apollo_compiler::validation::Valid;
use apollo_compiler::{ExecutableDocument, Name, Schema};
use apollo_federation::query_plan::query_planner::QueryPlanOptions;
use apollo_federation::{
    query_plan::{
        query_planner::{QueryPlanner, QueryPlannerConfig},
        QueryPlan,
    },
    Supergraph,
};
use axum::extract::State;
use axum::{
    error_handling::HandleErrorLayer, http::StatusCode, response::IntoResponse, routing::post,
    serve, Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{borrow::Cow, fs, sync::Arc, thread, time::Duration};
use tokio::net::TcpListener;
use tower::{load_shed, timeout::error, BoxError, ServiceBuilder};

const PORT: i32 = 3004;
const FILENAME: &str = "./supergraph/supergraph.graphql";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BuildQueryPlanRequest {
    operation_name: String,
    query: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildQueryPlanResponse {
    error: Option<String>,
    query_plan: Option<QueryPlan>,
}

type SharedState = Arc<AppState>;
struct AppState {
    query_planner: QueryPlanner,
}

#[tokio::main]
async fn main() {
    let supergraph_sdl: String = fs::read_to_string(FILENAME).unwrap();
    let query_planner = QueryPlanner::new(
        &Supergraph::from_schema(Schema::parse_and_validate(supergraph_sdl, FILENAME).unwrap())
            .unwrap(),
        get_query_planner_config(),
    )
    .unwrap();

    let shared_state = Arc::new(AppState { query_planner });

    let app = Router::new()
        .route("/build-query-plan", post(build_query_plan))
        .with_state(shared_state)
        .layer(
            ServiceBuilder::new()
                .layer(HandleErrorLayer::new(handle_error))
                .load_shed()
                .concurrency_limit(1000)
                .timeout(Duration::from_secs(60))
                .into_inner(),
        );

    let addr = format!("{}:{}", "127.0.0.1", PORT);
        println!("listening on {}", addr);
    serve(TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}

async fn build_query_plan(
    State(state): State<SharedState>,
    Json(payload): Json<BuildQueryPlanRequest>,
) -> Json<Value> {
    let query_planner = &state.query_planner;
    println!(
        "building query plan in thread {} - {:?}",
        thread::current().name().unwrap(),
        thread::current().id()
    );
    let document = Valid::assume_valid(
        ExecutableDocument::parse(query_planner.api_schema().schema(), payload.query, "query")
            .unwrap(),
    );
    let name = Option::from(Name::new(&*payload.operation_name).unwrap());
    let query_plan = Option::from(
        query_planner
            .build_query_plan(&document, Option::from(name), QueryPlanOptions::default())
            .unwrap(),
    );
    Json(json!(BuildQueryPlanResponse {
        query_plan,
        error: None,
    }))
}

async fn handle_error(error: BoxError) -> impl IntoResponse {
    if error.is::<error::Elapsed>() {
        return (StatusCode::REQUEST_TIMEOUT, Cow::from("request timed out"));
    }

    if error.is::<load_shed::error::Overloaded>() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Cow::from("service is overloaded, try again later"),
        );
    }

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Cow::from(format!("Unhandled internal error: {}", error)),
    )
}

fn get_query_planner_config() -> QueryPlannerConfig {
    QueryPlannerConfig {
        reuse_query_fragments: false,
        generate_query_fragments: true,
        subgraph_graphql_validation: false,
        incremental_delivery: Default::default(),
        debug: Default::default(),
        type_conditioned_fetching: Default::default(),
    }
}
