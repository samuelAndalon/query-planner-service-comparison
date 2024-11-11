import express, { Request, Response } from 'express';
import { QueryPlannerService } from '../shared/query-planner-service';
import fs from 'fs';

const port = 3000;
const queryPlannerService = new QueryPlannerService(
  fs.readFileSync('./shared/schema.graphql', 'utf-8')
);

express()
  .use(express.json({ limit: '50mb' }))
  .post('/build-query-plan', async (request: Request, response: Response) => {
    console.log(`building query plan on ${process.pid}`);
    const { operationName, query } = request.body;
    const queryPlanResult = queryPlannerService.buildQueryPlan(operationName, query);
    response.json({
      runtime: 'node',
      ...queryPlanResult
    });
  })
  .listen(port, () => {
    console.log(`Express node server listening at http://localhost:${port}`);
  });