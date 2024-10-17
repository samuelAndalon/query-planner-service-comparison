import { QueryPlannerService } from '../shared/query-planner-service.ts';
import fs from 'node:fs';

const port = 3002;
const queryPlannerService = new QueryPlannerService(
  fs.readFileSync('./shared/supergraph.graphql', 'utf-8')
);

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/build-query-plan") {
    console.log(`building query plan on process id: ${Deno.pid}`);

    // Parse the incoming JSON body
    const { operationName, query } = await req.json();

    // Build the query plan
    const queryPlanResult = queryPlannerService.buildQueryPlan(operationName, query);

    // Create the response with additional data
    const response = {
      runtime: 'deno',
      ...queryPlanResult,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fallback response for unsupported routes/methods
  return new Response("Not Found", { status: 404 });
});

console.log(`Deno server listening at http://localhost:${port}`);
