/**
 * OpenAPI/Swagger Specification
 * Auto-generated API documentation
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import { 
  analyzeWorkflowSchema, 
  workflowStructureParamsSchema,
  historyQuerySchema,
  analysisIdParamsSchema
} from './validation';

// Helper to avoid deep type inference issues with zod-to-json-schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJsonSchema = (schema: any): any => zodToJsonSchema(schema as any);

/**
 * OpenAPI 3.0 Specification
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GHL Workflow Debugger API',
    version: '2.0.0',
    description: `
# GHL Workflow Debugger API

Production-grade REST API for analyzing GoHighLevel workflows.

## Features

- 🔍 **Comprehensive Analysis** - Detect loops, conflicts, and performance issues
- 📊 **Health Scoring** - Get actionable health scores (0-100) for each workflow
- 🔒 **Secure** - OAuth 2.0 authentication with GHL
- 🚀 **Fast** - Redis caching and optimized queries
- 📈 **Monitored** - Prometheus metrics and Sentry error tracking

## Authentication

All API endpoints require authentication via GHL OAuth 2.0.

1. Redirect users to \`/auth/login\`
2. Handle callback at \`/auth/callback\`
3. Store secure cookies
4. Use cookies for subsequent API calls

## Rate Limits

| Tier | General API | Analysis | History Retention |
|------|-------------|----------|-------------------|
| Free | 20 req/min  | 10/hour  | 7 days            |
| Pro  | 100 req/min | 100/hour | 90 days           |

## Versioning

Current version: **v1**

Base path: \`/api\`

Future breaking changes will use \`/v2\`, \`/v3\`, etc.
    `.trim(),
    contact: {
      name: 'API Support',
      email: 'support@ghl-debugger.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://ghl-debugger.com/terms'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.ghl-debugger.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and monitoring endpoints'
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization'
    },
    {
      name: 'Workflows',
      description: 'Workflow retrieval and analysis'
    },
    {
      name: 'History',
      description: 'Analysis history and results'
    },
    {
      name: 'Subscription',
      description: 'Subscription management and billing'
    },
    {
      name: 'Webhooks',
      description: 'Stripe webhook handlers'
    },
    {
      name: 'Metrics',
      description: 'Monitoring and metrics (internal)'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Basic health check',
        description: 'Returns service health status',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        service: { type: 'string', example: 'ghl-workflow-debugger' },
                        version: { type: 'string', example: '2.0.0' },
                        timestamp: { type: 'string', format: 'date-time' },
                        environment: { type: 'string', example: 'production' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/detailed': {
      get: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Returns detailed health including database status',
        operationId: 'getDetailedHealth',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        checks: {
                          type: 'object',
                          properties: {
                            database: { type: 'string', enum: ['healthy', 'unhealthy'] },
                            memory: {
                              type: 'object',
                              properties: {
                                used: { type: 'number' },
                                total: { type: 'number' },
                                unit: { type: 'string', example: 'MB' }
                              }
                            },
                            uptime: { type: 'number', description: 'Uptime in seconds' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service is degraded or unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Metrics'],
        summary: 'Prometheus metrics endpoint',
        description: 'Returns metrics in Prometheus format',
        operationId: 'getMetrics',
        responses: {
          '200': {
            description: 'Metrics in Prometheus format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/api/workflows",status="200"} 42'
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      get: {
        tags: ['Auth'],
        summary: 'Initiate OAuth login',
        description: 'Redirects to GHL OAuth authorization page',
        operationId: 'login',
        responses: {
          '302': {
            description: 'Redirect to GHL OAuth'
          }
        }
      }
    },
    '/auth/callback': {
      get: {
        tags: ['Auth'],
        summary: 'OAuth callback handler',
        description: 'Handles OAuth callback from GHL and sets secure cookies',
        operationId: 'callback',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Authorization code from GHL'
          }
        ],
        responses: {
          '302': {
            description: 'Redirect to frontend with success'
          },
          '400': {
            description: 'Invalid or missing authorization code',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Clears authentication cookies',
        operationId: 'logout',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Successfully logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string', example: 'Logged out successfully' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/workflows': {
      get: {
        tags: ['Workflows'],
        summary: 'List all workflows',
        description: 'Get all workflows from GHL for authenticated location',
        operationId: 'listWorkflows',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of workflows',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        workflows: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Workflow' }
                        },
                        count: { type: 'number', example: 15 }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - invalid or expired auth',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateLimitError' }
              }
            }
          },
          '502': {
            description: 'GHL API error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/workflows/{id}/structure': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow structure',
        description: 'Get workflow structure in React Flow format for visualization',
        operationId: 'getWorkflowStructure',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Workflow ID'
          }
        ],
        responses: {
          '200': {
            description: 'Workflow structure',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        workflowId: { type: 'string' },
                        workflowName: { type: 'string' },
                        nodes: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/FlowNode' }
                        },
                        edges: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/FlowEdge' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Workflow not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/analyze': {
      post: {
        tags: ['Workflows'],
        summary: 'Analyze a workflow',
        description: 'Run comprehensive analysis on a workflow and return health score + issues',
        operationId: 'analyzeWorkflow',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: toJsonSchema(analyzeWorkflowSchema) as any,
              example: {
                workflowId: 'wf_abc123xyz'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Analysis completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalysisResult' }
                  }
                }
              }
            }
          },
          '429': {
            description: 'Analysis rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateLimitError' }
              }
            }
          }
        }
      }
    },
    '/api/history': {
      get: {
        tags: ['History'],
        summary: 'Get analysis history',
        description: 'Retrieve past analysis results for authenticated location',
        operationId: 'getHistory',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Results per page'
          },
          {
            name: 'workflowId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by workflow ID'
          },
          {
            name: 'minScore',
            in: 'query',
            schema: { type: 'integer', minimum: 0, maximum: 100 },
            description: 'Minimum health score filter'
          },
          {
            name: 'maxScore',
            in: 'query',
            schema: { type: 'integer', minimum: 0, maximum: 100 },
            description: 'Maximum health score filter'
          }
        ],
        responses: {
          '200': {
            description: 'Analysis history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        history: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/HistoryEntry' }
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/analysis/{id}': {
      get: {
        tags: ['History'],
        summary: 'Get specific analysis',
        description: 'Retrieve a specific analysis result by ID',
        operationId: 'getAnalysis',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Analysis ID'
          }
        ],
        responses: {
          '200': {
            description: 'Analysis result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalysisResult' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Analysis not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['History'],
        summary: 'Delete analysis',
        description: 'Delete a specific analysis result',
        operationId: 'deleteAnalysis',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Analysis ID'
          }
        ],
        responses: {
          '200': {
            description: 'Analysis deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        deleted: { type: 'boolean', example: true },
                        id: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Analysis not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'ghl_access_token',
        description: 'Secure HTTP-only cookie set after OAuth login'
      }
    },
    schemas: {
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'wf_abc123' },
          name: { type: 'string', example: 'Lead Nurture Sequence' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          created: { type: 'string', format: 'date-time' },
          updated: { type: 'string', format: 'date-time' }
        }
      },
      FlowNode: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            }
          },
          data: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              stepType: { type: 'string' }
            }
          }
        }
      },
      FlowEdge: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          type: { type: 'string' }
        }
      },
      AnalysisResult: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
          workflowName: { type: 'string' },
          healthScore: { type: 'number', minimum: 0, maximum: 100, example: 85 },
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'], example: 'B' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          issuesFound: { type: 'number', example: 3 },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'infinite-loop' },
                severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                message: { type: 'string' },
                location: { type: 'string' }
              }
            }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      HistoryEntry: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          workflow_id: { type: 'string' },
          workflow_name: { type: 'string' },
          health_score: { type: 'number' },
          issues_found: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 150 },
          totalPages: { type: 'integer', example: 8 },
          hasMore: { type: 'boolean', example: true }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Resource not found' },
              code: { type: 'string', example: 'NOT_FOUND' }
            }
          }
        }
      },
      RateLimitError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
              retryAfter: { type: 'integer', description: 'Seconds until retry' },
              upgradeUrl: { type: 'string', description: 'Upgrade link for free users' }
            }
          }
        }
      }
    }
  }
};
