/**
 * Demo Mode Routes
 * Returns sample data for users exploring without GHL connection
 */

import { Router } from 'express';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import {
  getDemoMetrics,
  getDemoMissedLeads,
  getDemoTeamStats,
  getDemoTrend,
  getDemoChannelStats,
  getDemoRevenueSummary,
  getDemoActivity,
  getDemoGoals,
  DEMO_LOCATION_ID,
  DEMO_TEAM_MEMBERS,
} from '../lib/demo-data';
import { BENCHMARKS } from '../lib/response-analyzer';

const demoRouter = Router();

// Simple middleware to log demo access
const logDemo = (endpoint: string) => {
  logger.info(`Demo mode: ${endpoint}`);
};

/**
 * GET /api/demo/overview
 */
demoRouter.get(
  '/overview',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 7;
    logDemo('overview');
    
    const metrics = getDemoMetrics(days);
    
    return ApiResponse.success(res, {
      metrics,
      benchmarks: BENCHMARKS,
      period: { days, startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      isDemo: true,
    });
  })
);

/**
 * GET /api/demo/trend
 */
demoRouter.get(
  '/trend',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 30;
    logDemo('trend');
    
    const trend = getDemoTrend(days);
    
    return ApiResponse.success(res, { trend, days, isDemo: true });
  })
);

/**
 * GET /api/demo/missed
 */
demoRouter.get(
  '/missed',
  asyncHandler(async (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    logDemo('missed');
    
    const result = getDemoMissedLeads(limit, offset);
    
    return ApiResponse.success(res, { ...result, isDemo: true });
  })
);

/**
 * GET /api/demo/team
 */
demoRouter.get(
  '/team',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 7;
    logDemo('team');
    
    const team = getDemoTeamStats(days);
    
    return ApiResponse.success(res, { team, period: { days }, isDemo: true });
  })
);

/**
 * GET /api/demo/channels
 */
demoRouter.get(
  '/channels',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 7;
    logDemo('channels');
    
    const channels = getDemoChannelStats(days);
    
    return ApiResponse.success(res, { channels, period: { days }, isDemo: true });
  })
);

/**
 * GET /api/demo/activity
 */
demoRouter.get(
  '/activity',
  asyncHandler(async (req: any, res: any) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    logDemo('activity');
    
    const activities = getDemoActivity(limit);
    
    return ApiResponse.success(res, { 
      activities, 
      count: activities.length, 
      period: '24h',
      isDemo: true 
    });
  })
);

/**
 * GET /api/demo/goals
 */
demoRouter.get(
  '/goals',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 7;
    logDemo('goals');
    
    const goals = getDemoGoals(days);
    
    return ApiResponse.success(res, { ...goals, period: { days }, isDemo: true });
  })
);

/**
 * GET /api/demo/revenue
 */
demoRouter.get(
  '/revenue',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 30;
    logDemo('revenue');
    
    const metrics = getDemoRevenueSummary(days);
    
    return ApiResponse.success(res, {
      ...metrics,
      period: { days, startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      headline: {
        moneyFromSpeed: `$${metrics.revenueFromFastResponses.toLocaleString()}`,
        moneyLostSlow: `$${metrics.estimatedLostFromSlow.toLocaleString()}`,
        moneyLostMissed: `$${metrics.estimatedLostFromMissed.toLocaleString()}`,
        totalOpportunityCost: `$${metrics.totalPotentialLost.toLocaleString()}`,
        potentialGain: `$${metrics.roiProjection.potentialGain.toLocaleString()}`,
      },
      isDemo: true,
    });
  })
);

/**
 * GET /api/demo/revenue/summary
 */
demoRouter.get(
  '/revenue/summary',
  asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 30;
    logDemo('revenue/summary');
    
    const metrics = getDemoRevenueSummary(days);
    
    const summary = {
      fastResponsesGenerated: {
        value: metrics.revenueFromFastResponses,
        formatted: `$${metrics.revenueFromFastResponses.toLocaleString()}`,
        label: 'Revenue from fast responses',
        subtext: 'Responses under 5 minutes that converted',
      },
      potentialLost: {
        value: metrics.totalPotentialLost,
        formatted: `$${metrics.totalPotentialLost.toLocaleString()}`,
        label: 'Estimated lost revenue',
        subtext: `${metrics.conversionByBucket.find(b => b.bucket === 'missed')?.leads || 0} missed + slow responses`,
      },
      improvementGain: {
        value: metrics.roiProjection.potentialGain,
        formatted: `$${metrics.roiProjection.potentialGain.toLocaleString()}`,
        label: 'Potential monthly gain',
        subtext: 'If you improved to 3-min average',
      },
      speedMultiplier: {
        value: metrics.insights.speedImpactMultiplier,
        formatted: `${metrics.insights.speedImpactMultiplier}x`,
        label: 'Speed advantage',
        subtext: 'Fast responders convert more',
      },
      missedLeadCost: {
        value: metrics.insights.missedLeadCost,
        formatted: `$${Math.round(metrics.insights.missedLeadCost).toLocaleString()}`,
        label: 'Cost per missed lead',
        subtext: 'Average opportunity cost',
      },
      valuePerMinute: {
        value: metrics.insights.valuePerMinuteImprovement,
        formatted: `$${Math.round(metrics.insights.valuePerMinuteImprovement).toLocaleString()}`,
        label: 'Value per minute faster',
        subtext: 'Monthly gain per minute improved',
      },
    };
    
    return ApiResponse.success(res, {
      summary,
      conversionFunnel: metrics.conversionByBucket.map(b => ({
        bucket: b.label,
        leads: b.leads,
        conversions: Math.round(b.leads * (b.conversionRate / 100)),
        conversionRate: `${b.conversionRate}%`,
        benchmarkRate: `${b.benchmarkRate}%`,
        revenue: `$${b.revenue.toLocaleString()}`,
        lost: `$${b.estimatedLost.toLocaleString()}`,
      })),
      period: { days },
      isDemo: true,
    });
  })
);

/**
 * GET /api/demo/sync/status
 */
demoRouter.get(
  '/sync/status',
  asyncHandler(async (req: any, res: any) => {
    return ApiResponse.success(res, {
      status: 'idle',
      lastSyncAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      isDemo: true,
    });
  })
);

/**
 * GET /api/demo/insights
 */
demoRouter.get(
  '/insights',
  asyncHandler(async (req: any, res: any) => {
    logDemo('insights');
    
    const insights = [
      {
        id: 'demo_1',
        type: 'response_time',
        severity: 'warning',
        title: 'Response time spike on weekends',
        description: 'Average response time increases by 45% on weekends. Consider adjusting weekend coverage.',
        metric: '12 min avg vs 8 min weekday',
        recommendation: 'Add weekend coverage or set up auto-responders',
      },
      {
        id: 'demo_2',
        type: 'channel',
        severity: 'opportunity',
        title: 'SMS converts 2x better than email',
        description: 'Leads contacted via SMS have a 28% conversion rate vs 14% for email.',
        metric: '28% vs 14% conversion',
        recommendation: 'Prioritize SMS follow-ups for high-value leads',
      },
      {
        id: 'demo_3',
        type: 'team',
        severity: 'info',
        title: 'Sarah Johnson is your fastest responder',
        description: 'Sarah averages 2.5 minute response times - 60% faster than team average.',
        metric: '2.5 min avg',
        recommendation: 'Have Sarah mentor slower team members',
      },
    ];
    
    return ApiResponse.success(res, {
      insights,
      grouped: {
        critical: [],
        warning: insights.filter(i => i.severity === 'warning'),
        opportunity: insights.filter(i => i.severity === 'opportunity'),
        info: insights.filter(i => i.severity === 'info'),
      },
      total: insights.length,
      isDemo: true,
    });
  })
);

/**
 * GET /api/demo/user/:userId
 */
demoRouter.get(
  '/user/:userId',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.params.userId;
    const days = parseInt(req.query.days as string) || 30;
    logDemo(`user/${userId}`);
    
    const team = getDemoTeamStats(days);
    const user = team.find(t => t.userId === userId) || team[0];
    
    return ApiResponse.success(res, {
      userId: user.userId,
      userName: user.userName,
      stats: {
        totalResponses: user.totalResponses,
        avgResponseTime: user.avgResponseTime,
        fastestResponse: user.fastestResponse,
        slowestResponse: user.avgResponseTime * 2.5,
        missedCount: user.missedCount,
        under1Min: Math.round(user.totalResponses * 0.3),
        under5Min: Math.round(user.totalResponses * 0.6),
      },
      dailyTrend: getDemoTrend(days).map(d => ({
        ...d,
        totalConversations: Math.round(d.totalConversations / 5),
      })),
      recentConversations: [],
      badges: [
        { type: 'speed_demon', earnedAt: new Date(), icon: '⚡', label: 'Speed Demon' },
        { type: 'streak_3', earnedAt: new Date(), icon: '🔥', label: '3-Day Streak' },
      ],
      isDemo: true,
    });
  })
);

export default demoRouter;
