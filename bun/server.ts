import { QueryPlannerService } from '../shared/query-planner-service';

const port = 3001;
const queryPlannerService = new QueryPlannerService(
  await Bun.file('./shared/supergraph.graphql').text()
);

Bun.serve({
  port,
  async fetch(request: Request) {
    const url = new URL(request.url);
    const routeKey = `${request.method}${url.pathname}`;
    if (routeKey === 'POST/build-query-plan') {
      console.log(`building query plan on ${process.pid}`);
      const { operationName, query } = await request.json();
      const queryPlanResult = queryPlannerService.buildQueryPlan(operationName, query);
      return new Response(JSON.stringify({
        runtime: 'bun',
        ...queryPlanResult
      }), {
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      });
    }
    return new Response(undefined, { status: 404 });
  }
});

console.log(`Bun server listening at http://localhost:${port}`);