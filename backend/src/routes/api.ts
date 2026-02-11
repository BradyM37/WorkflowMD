/**
 * API Routes - Hardened Production Version
 * Workflow analysis and history endpoints with comprehensive error handling
 */

import { Router } from 'express';
import { pool } from '../lib/database';
import { requireAuth } from '../middleware/auth';
import { analyzeWorkflow } from '../lib/workflow-analyzer';
import { fetchWorkflows, fetchWorkflow } from '../lib/ghl-api';
import { parseWorkflowForReactFlow } from '../lib/workflow-parser';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import { 
  analyzeWorkflowSchema, 
  workflowStructureParamsSchema,
  historyQuerySchema,
  analysisIdParamsSchema
} from '../lib/validation';
import { retryQuery } from '../middleware/database-health';

// ROUND 2: Import caching and metrics
import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import { recordAnalysis, recordCacheOperation } from '../lib/metrics';

// PDF Generation
import { generateWorkflowReportPDF } from '../lib/pdf-generator';

export const apiRouter = Router();

// All API routes require authentication
apiRouter.use(requireAuth);

/**
 * GET /api/workflows
 * List all workflows from GHL for authenticated location
 */
apiRouter.get('/workflows', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected. Please connect your GoHighLevel account first.', 400, 'GHL_NOT_CONNECTED');
  }
  
  logger.info('Fetching workflows', {
    locationId,
    requestId: req.id
  });

  try {
    // ROUND 2: Try cache first
    const cacheKey = CacheKeys.workflows(locationId);
    const cacheStart = Date.now();
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      const cacheDuration = Date.now() - cacheStart;
      recordCacheOperation('hit', cache.getStats().type as any, 'workflows', cacheDuration);
      
      logger.info('Workflows served from cache', {
        locationId,
        cacheHit: true,
        cacheDuration,
        requestId: req.id
      });
      
      return ApiResponse.success(res, cached);
    }
    
    recordCacheOperation('miss', cache.getStats().type as any, 'workflows');
    
    // Fetch from GHL API
    const workflows = await fetchWorkflows(locationId);
    
    const responseData = {
      workflows,
      count: workflows.length
    };
    
    // Store in cache
    await cache.set(cacheKey, responseData, CacheTTL.WORKFLOW);
    
    logger.info('Workflows fetched successfully', {
      locationId,
      count: workflows.length,
      cached: false,
      requestId: req.id
    });

    return ApiResponse.success(res, responseData);
  } catch (error: any) {
    logger.error('Failed to fetch workflows from GHL', {
      locationId,
      requestId: req.id,
      errorMessage: error.message
    }, error);

    // Check if it's a GHL API error
    if (error.response?.status === 401 || error.response?.status === 403) {
      return ApiResponse.error(
        res,
        'Unable to access GHL account. Please re-authenticate.',
        401,
        'GHL_AUTH_ERROR'
      );
    }

    if (error.response?.status === 429) {
      return ApiResponse.error(
        res,
        'Rate limit exceeded. Please try again later.',
        429,
        'GHL_RATE_LIMIT'
      );
    }

    return ApiResponse.error(
      res,
      'Failed to fetch workflows from GHL',
      502,
      'GHL_API_ERROR'
    );
  }
}));

/**
 * GET /api/workflows/:id/structure
 * Get workflow structure for React Flow visualization
 */
apiRouter.get(
  '/workflows/:id/structure',
  validate(workflowStructureParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const locationId = req.locationId!;

    logger.info('Fetching workflow structure', {
      workflowId: id,
      locationId,
      requestId: req.id
    });

    try {
      // ROUND 2: Try cache first
      const cacheKey = CacheKeys.workflow(locationId, id);
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.info('Workflow structure served from cache', {
          workflowId: id,
          cacheHit: true,
          requestId: req.id
        });
        
        return ApiResponse.success(res, cached);
      }
      
      // Fetch workflow from GHL
      const ghlWorkflow = await fetchWorkflow(id, locationId);

      // Parse into React Flow format
      const structure = parseWorkflowForReactFlow(ghlWorkflow);
      
      const responseData = {
        workflowId: id,
        workflowName: ghlWorkflow.name,
        ...structure
      };
      
      // Cache the structure
      await cache.set(cacheKey, responseData, CacheTTL.WORKFLOW);

      logger.info('Workflow structure parsed', {
        workflowId: id,
        nodeCount: structure.nodes.length,
        edgeCount: structure.edges.length,
        cached: false,
        requestId: req.id
      });

      return ApiResponse.success(res, responseData);
    } catch (error: any) {
      logger.error('Failed to fetch workflow structure', {
        workflowId: id,
        locationId,
        requestId: req.id
      }, error);

      if (error.response?.status === 404) {
        return ApiResponse.notFound(res, 'Workflow');
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return ApiResponse.error(
          res,
          'Unable to access workflow. Please re-authenticate.',
          401,
          'GHL_AUTH_ERROR'
        );
      }

      return ApiResponse.error(
        res,
        'Failed to fetch workflow structure',
        502,
        'GHL_API_ERROR'
      );
    }
  })
);

/**
 * POST /api/workflows/:id/analyze
 * Analyze a specific workflow by ID
 */
apiRouter.post(
  '/workflows/:id/analyze',
  validate(workflowStructureParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id: workflowId } = req.params;
    const locationId = req.locationId!;
    const subscriptionStatus = req.subscriptionStatus || 'free';

    logger.info('Starting workflow analysis by ID', {
      workflowId,
      locationId,
      subscriptionStatus,
      requestId: req.id
    });

    try {
      // Check cache for recent analysis
      const cacheKey = CacheKeys.analysis(workflowId);
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.info('Analysis served from cache', {
          workflowId,
          cacheHit: true,
          requestId: req.id
        });
        
        if (subscriptionStatus === 'free' && cached.issues) {
          const limitedIssues = cached.issues.slice(0, 3);
          const hiddenCount = Math.max(0, cached.issues.length - 3);
          
          return ApiResponse.success(res, {
            ...cached,
            issues: limitedIssues,
            issuesShown: limitedIssues.length,
            upgrade: hiddenCount > 0 ? {
              message: `Upgrade to Pro to see ${hiddenCount} more issue${hiddenCount === 1 ? '' : 's'}`,
              hidden: hiddenCount,
              upgradeUrl: '/api/subscription/checkout'
            } : null
          });
        }
        
        return ApiResponse.success(res, cached);
      }
      
      // Fetch workflow from GHL
      const workflow = await fetchWorkflow(workflowId, locationId);

      // Run analysis
      const startTime = Date.now();
      const analysis = analyzeWorkflow(workflow);
      const analysisTime = Date.now() - startTime;
      const analysisTimeSeconds = analysisTime / 1000;

      recordAnalysis(
        analysisTimeSeconds,
        analysis.healthScore,
        analysis.issues.length,
        subscriptionStatus,
        true
      );

      logger.logAnalysis(workflowId, analysis.healthScore, analysis.issues.length, {
        locationId,
        analysisTimeMs: analysisTime,
        confidence: analysis.confidence,
        requestId: req.id
      });

      // Store results in database
      await retryQuery(
        () => pool.query(
          `INSERT INTO analysis_results 
           (location_id, workflow_id, workflow_name, health_score, issues_found, results) 
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            locationId,
            workflowId,
            workflow.name,
            analysis.healthScore,
            analysis.issues.length,
            JSON.stringify(analysis)
          ]
        ),
        3,
        1000
      );
      
      // Cache the result
      await cache.set(cacheKey, analysis, CacheTTL.ANALYSIS);

      // Apply feature gating for free users
      if (subscriptionStatus === 'free') {
        const limitedIssues = analysis.issues.slice(0, 3);
        const hiddenCount = Math.max(0, analysis.issues.length - 3);

        return ApiResponse.success(res, {
          ...analysis,
          issuesShown: limitedIssues.length,
          issues: limitedIssues,
          recommendations: analysis.recommendations?.slice(0, 2),
          upgrade: hiddenCount > 0 ? {
            message: `Upgrade to Pro to see ${hiddenCount} more issue${hiddenCount === 1 ? '' : 's'}`,
            hidden: hiddenCount,
            upgradeUrl: '/api/subscription/checkout'
          } : null
        });
      }

      return ApiResponse.success(res, analysis);

    } catch (error: any) {
      logger.error('Analysis failed', {
        workflowId,
        locationId,
        requestId: req.id
      }, error);

      if (error.response?.status === 404) {
        return ApiResponse.notFound(res, 'Workflow');
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return ApiResponse.error(
          res,
          'Unable to access workflow. Please re-authenticate.',
          401,
          'GHL_AUTH_ERROR'
        );
      }

      return ApiResponse.serverError(res, 'Failed to analyze workflow');
    }
  })
);

/**
 * POST /api/analyze
 * Analyze a workflow and return health score + issues (legacy endpoint)
 */
apiRouter.post(
  '/analyze',
  validate(analyzeWorkflowSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { workflowId } = req.body;
    const locationId = req.locationId!;
    const subscriptionStatus = req.subscriptionStatus || 'free';

    logger.info('Starting workflow analysis', {
      workflowId,
      locationId,
      subscriptionStatus,
      requestId: req.id
    });

    try {
      // ROUND 2: Check cache for recent analysis
      const cacheKey = CacheKeys.analysis(workflowId);
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.info('Analysis served from cache', {
          workflowId,
          locationId,
          cacheHit: true,
          requestId: req.id
        });
        
        // Still apply feature gating for free users
        if (subscriptionStatus === 'free' && cached.issues) {
          const limitedIssues = cached.issues.slice(0, 3);
          const hiddenCount = Math.max(0, cached.issues.length - 3);
          
          return ApiResponse.success(res, {
            ...cached,
            issues: limitedIssues,
            issuesShown: limitedIssues.length,
            upgrade: hiddenCount > 0 ? {
              message: `Upgrade to Pro to see ${hiddenCount} more issue${hiddenCount === 1 ? '' : 's'}`,
              hidden: hiddenCount,
              upgradeUrl: '/api/subscription/checkout'
            } : null
          });
        }
        
        return ApiResponse.success(res, cached);
      }
      
      // Fetch workflow from GHL
      const workflow = await fetchWorkflow(workflowId, locationId);

      // Run analysis
      const startTime = Date.now();
      const analysis = analyzeWorkflow(workflow);
      const analysisTime = Date.now() - startTime;
      const analysisTimeSeconds = analysisTime / 1000;

      // ROUND 2: Record metrics
      recordAnalysis(
        analysisTimeSeconds,
        analysis.healthScore,
        analysis.issues.length,
        subscriptionStatus,
        true
      );

      logger.logAnalysis(workflowId, analysis.healthScore, analysis.issues.length, {
        locationId,
        analysisTimeMs: analysisTime,
        confidence: analysis.confidence,
        requestId: req.id
      });

      // Store full results in database with retry
      await retryQuery(
        () => pool.query(
          `INSERT INTO analysis_results 
           (location_id, workflow_id, workflow_name, health_score, issues_found, results) 
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            locationId,
            workflowId,
            workflow.name,
            analysis.healthScore,
            analysis.issues.length,
            JSON.stringify(analysis)
          ]
        ),
        3,
        1000
      );
      
      // ROUND 2: Cache the analysis result (expensive to compute)
      await cache.set(cacheKey, analysis, CacheTTL.ANALYSIS);

      // Apply feature gating for free users
      if (subscriptionStatus === 'free') {
        const limitedIssues = analysis.issues.slice(0, 3);
        const hiddenCount = Math.max(0, analysis.issues.length - 3);

        const limitedAnalysis = {
          workflowId: analysis.workflowId,
          workflowName: analysis.workflowName,
          healthScore: analysis.healthScore,
          grade: analysis.grade,
          confidence: analysis.confidence,
          issuesFound: analysis.issues.length,
          issuesShown: limitedIssues.length,
          issues: limitedIssues,
          recommendations: analysis.recommendations?.slice(0, 2),
          performance: analysis.performance,
          timestamp: analysis.timestamp,
          upgrade: hiddenCount > 0 ? {
            message: `Upgrade to Pro to see ${hiddenCount} more issue${hiddenCount === 1 ? '' : 's'} and full recommendations`,
            hidden: hiddenCount,
            upgradeUrl: '/api/subscription/checkout'
          } : null
        };

        return ApiResponse.success(res, limitedAnalysis);
      }

      // Pro users get everything
      return ApiResponse.success(res, analysis);

    } catch (error: any) {
      logger.error('Analysis failed', {
        workflowId,
        locationId,
        requestId: req.id
      }, error);

      if (error.response?.status === 404) {
        return ApiResponse.notFound(res, 'Workflow');
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return ApiResponse.error(
          res,
          'Unable to access workflow. Please re-authenticate.',
          401,
          'GHL_AUTH_ERROR'
        );
      }

      if (error.message?.includes('analysis')) {
        return ApiResponse.error(
          res,
          'Analysis engine error. Please try again.',
          500,
          'ANALYSIS_ERROR'
        );
      }

      return ApiResponse.serverError(res, 'Failed to analyze workflow');
    }
  })
);

/**
 * GET /api/history
 * Get analysis history for authenticated location
 */
apiRouter.get(
  '/history',
  validate(historyQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const locationId = req.locationId!;
    const subscriptionStatus = req.subscriptionStatus || 'free';
    const { page, limit, workflowId, minScore, maxScore } = req.query as any;
    
    // Free users: 7 days, Pro users: 90 days
    const daysLimit = subscriptionStatus === 'pro' ? 90 : 7;
    
    logger.info('Fetching analysis history', {
      locationId,
      subscriptionStatus,
      daysLimit,
      page,
      limit,
      requestId: req.id
    });

    try {
      // Build dynamic query
      let queryText = `
        SELECT id, workflow_id, workflow_name, health_score, issues_found, created_at 
        FROM analysis_results 
        WHERE location_id = $1 
        AND created_at > NOW() - INTERVAL '${daysLimit} days'
      `;
      
      const queryParams: any[] = [locationId];
      let paramCount = 1;
      
      if (workflowId) {
        paramCount++;
        queryText += ` AND workflow_id = $${paramCount}`;
        queryParams.push(workflowId);
      }
      
      if (minScore !== undefined) {
        paramCount++;
        queryText += ` AND health_score >= $${paramCount}`;
        queryParams.push(minScore);
      }
      
      if (maxScore !== undefined) {
        paramCount++;
        queryText += ` AND health_score <= $${paramCount}`;
        queryParams.push(maxScore);
      }
      
      queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit);
      queryParams.push((page - 1) * limit);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM analysis_results 
        WHERE location_id = $1 
        AND created_at > NOW() - INTERVAL '${daysLimit} days'
      `;
      
      const countParams = [locationId];
      if (workflowId) {
        countQuery += ` AND workflow_id = $2`;
        countParams.push(workflowId);
      }
      
      const [result, countResult] = await Promise.all([
        retryQuery(() => pool.query(queryText, queryParams), 2, 500),
        retryQuery(() => pool.query(countQuery, countParams), 2, 500)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      logger.info('History fetched', {
        locationId,
        count: result.rows.length,
        total,
        page,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        history: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        subscription: {
          status: subscriptionStatus,
          retentionDays: daysLimit
        }
      });
    } catch (error) {
      logger.error('Failed to fetch history', {
        locationId,
        requestId: req.id
      }, error as Error);
      
      return ApiResponse.serverError(res, 'Failed to fetch analysis history');
    }
  })
);

/**
 * GET /api/analysis/:id
 * Get specific analysis result by ID
 */
apiRouter.get(
  '/analysis/:id',
  validate(analysisIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const locationId = req.locationId!;
    const subscriptionStatus = req.subscriptionStatus || 'free';

    logger.info('Fetching analysis result', {
      analysisId: id,
      locationId,
      requestId: req.id
    });

    try {
      const result = await retryQuery(
        () => pool.query(
          'SELECT * FROM analysis_results WHERE id = $1 AND location_id = $2',
          [id, locationId]
        ),
        2,
        500
      );

      if (result.rows.length === 0) {
        logger.warn('Analysis not found', {
          analysisId: id,
          locationId,
          requestId: req.id
        });
        
        return ApiResponse.notFound(res, 'Analysis');
      }

      const analysis = result.rows[0];
      
      // Apply feature gating to stored results for free users
      if (subscriptionStatus === 'free' && analysis.results) {
        const results = analysis.results;
        const limitedIssues = results.issues?.slice(0, 3) || [];
        const hiddenCount = Math.max(0, (results.issues?.length || 0) - 3);
        
        analysis.results = {
          ...results,
          issues: limitedIssues,
          issuesShown: limitedIssues.length,
          issuesFound: results.issues?.length || 0,
          upgrade: hiddenCount > 0 ? {
            message: `Upgrade to Pro to see ${hiddenCount} more issue${hiddenCount === 1 ? '' : 's'}`,
            upgradeUrl: '/api/subscription/checkout'
          } : null
        };
      }

      logger.info('Analysis result fetched', {
        analysisId: id,
        locationId,
        requestId: req.id
      });

      return ApiResponse.success(res, analysis);
    } catch (error) {
      logger.error('Failed to fetch analysis', {
        analysisId: id,
        locationId,
        requestId: req.id
      }, error as Error);
      
      return ApiResponse.serverError(res, 'Failed to fetch analysis');
    }
  })
);

/**
 * DELETE /api/analysis/:id
 * Delete an analysis result
 */
apiRouter.delete(
  '/analysis/:id',
  validate(analysisIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const locationId = req.locationId!;

    logger.info('Deleting analysis', {
      analysisId: id,
      locationId,
      requestId: req.id
    });

    try {
      const result = await retryQuery(
        () => pool.query(
          'DELETE FROM analysis_results WHERE id = $1 AND location_id = $2 RETURNING id',
          [id, locationId]
        ),
        2,
        500
      );

      if (result.rowCount === 0) {
        return ApiResponse.notFound(res, 'Analysis');
      }

      logger.info('Analysis deleted', {
        analysisId: id,
        locationId,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        deleted: true,
        id: parseInt(id)
      });
    } catch (error) {
      logger.error('Failed to delete analysis', {
        analysisId: id,
        locationId,
        requestId: req.id
      }, error as Error);
      
      return ApiResponse.serverError(res, 'Failed to delete analysis');
    }
  })
);

/**
 * GET /api/analysis/:id/pdf
 * Generate and download PDF report for an analysis
 */
apiRouter.get(
  '/analysis/:id/pdf',
  validate(analysisIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const locationId = req.locationId!;

    logger.info('Generating PDF report', {
      analysisId: id,
      locationId,
      requestId: req.id
    });

    try {
      // Fetch analysis from database
      const result = await retryQuery(
        () => pool.query(
          'SELECT * FROM analysis_results WHERE id = $1 AND location_id = $2',
          [id, locationId]
        ),
        2,
        500
      );

      if (result.rows.length === 0) {
        logger.warn('Analysis not found for PDF generation', {
          analysisId: id,
          locationId,
          requestId: req.id
        });
        
        return ApiResponse.notFound(res, 'Analysis');
      }

      const analysisRecord = result.rows[0];
      const analysisData = analysisRecord.results;

      // Generate PDF
      const startTime = Date.now();
      const pdfBuffer = await generateWorkflowReportPDF(analysisData);
      const generationTime = Date.now() - startTime;

      logger.info('PDF report generated successfully', {
        analysisId: id,
        locationId,
        pdfSize: pdfBuffer.length,
        generationTimeMs: generationTime,
        requestId: req.id
      });

      // Set response headers for PDF download
      const filename = `workflow-report-${id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Failed to generate PDF report', {
        analysisId: id,
        locationId,
        requestId: req.id
      }, error as Error);
      
      return ApiResponse.serverError(res, 'Failed to generate PDF report');
    }
  })
);
