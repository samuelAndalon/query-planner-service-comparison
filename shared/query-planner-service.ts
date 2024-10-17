import {
  buildSchemaFromAST,
  operationFromDocument,
  Schema,
  Supergraph
} from '@apollo/federation-internals';
import { QueryPlan, QueryPlanner } from '@apollo/query-planner';
import { parse } from 'graphql';

export interface QueryPlanResult {
  queryPlan: QueryPlan;
  error?: string;
}

export class QueryPlannerService {
  private readonly schema: Schema;
  private readonly queryPlanner: QueryPlanner;

  constructor(supergraphSdl: string) {
    const supergraphAST = parse(supergraphSdl, { noLocation: true });
    this.schema = buildSchemaFromAST(supergraphAST, { validate: false });
    this.queryPlanner = new QueryPlanner(
      Supergraph.build(supergraphSdl, { validateSupergraph: false }), {
      cache: undefined,
      reuseQueryFragments: false,
      generateQueryFragments: true
    });
  }
  buildQueryPlan(operationName: string, query: string): QueryPlanResult {
    try {
      const operation = operationFromDocument(
        this.schema,
        parse(query),
        {
          operationName,
          validate: false,
        }
      );
      const queryPlan = this.queryPlanner.buildQueryPlan(operation);
      return {
        queryPlan
      };
    } catch (e: any) {
      return {
        queryPlan: {
          kind: 'QueryPlan'
        },
        error: e.message,
      };
    }
  }
}
