/**
 * Demo Data Generator
 * Realistic sample data for users to explore the dashboard without GHL connection
 */

// Team members with varied performance profiles
const DEMO_TEAM = [
  { id: 'user_1', name: 'Sarah Johnson', email: 'sarah@demo.com', role: 'Sales Lead' },
  { id: 'user_2', name: 'Mike Chen', email: 'mike@demo.com', role: 'Sales Rep' },
  { id: 'user_3', name: 'Emily Davis', email: 'emily@demo.com', role: 'Sales Rep' },
  { id: 'user_4', name: 'James Wilson', email: 'james@demo.com', role: 'Support' },
  { id: 'user_5', name: 'Lisa Martinez', email: 'lisa@demo.com', role: 'Sales Rep' },
];

const CHANNELS = ['SMS', 'Email', 'Phone', 'Facebook', 'Instagram', 'Web Chat'];
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Quinn', 'Blake', 'Avery'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomChoice(domains)}`;
}

// Generate response time based on team member performance profile
function generateResponseTime(userId: string, isMissed: boolean): number | null {
  if (isMissed) return null;
  
  // Each team member has different response patterns
  const profiles: Record<string, { fast: number; medium: number; slow: number }> = {
    'user_1': { fast: 70, medium: 25, slow: 5 },   // Sarah - excellent
    'user_2': { fast: 50, medium: 35, slow: 15 },  // Mike - good
    'user_3': { fast: 40, medium: 40, slow: 20 },  // Emily - average
    'user_4': { fast: 30, medium: 40, slow: 30 },  // James - needs improvement
    'user_5': { fast: 55, medium: 35, slow: 10 },  // Lisa - good
  };
  
  const profile = profiles[userId] || { fast: 40, medium: 40, slow: 20 };
  const rand = Math.random() * 100;
  
  if (rand < profile.fast) {
    // Fast: 30 seconds to 5 minutes
    return randomInt(30, 300);
  } else if (rand < profile.fast + profile.medium) {
    // Medium: 5 to 30 minutes
    return randomInt(300, 1800);
  } else {
    // Slow: 30 minutes to 4 hours
    return randomInt(1800, 14400);
  }
}

interface DemoConversation {
  id: string;
  ghlConversationId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  channel: string;
  firstInboundAt: Date;
  firstResponseAt: Date | null;
  responseTimeSeconds: number | null;
  isMissed: boolean;
  assignedUserId: string | null;
  assignedUserName: string | null;
  status: string;
}

function generateDemoConversations(count: number = 50): DemoConversation[] {
  const conversations: DemoConversation[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const user = Math.random() > 0.1 ? randomChoice(DEMO_TEAM) : null; // 10% unassigned
    const isMissed = Math.random() < 0.12; // 12% missed rate
    const responseTime = generateResponseTime(user?.id || '', isMissed);
    
    // Spread conversations over the last 30 days
    const daysAgo = Math.random() * 30;
    const hoursAgo = Math.random() * 24;
    const inboundAt = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
    
    const responseAt = responseTime 
      ? new Date(inboundAt.getTime() + responseTime * 1000)
      : null;
    
    conversations.push({
      id: `demo_conv_${i + 1}`,
      ghlConversationId: `ghl_demo_${i + 1}`,
      contactName: `${firstName} ${lastName}`,
      contactEmail: generateEmail(firstName, lastName),
      contactPhone: generatePhone(),
      channel: randomChoice(CHANNELS),
      firstInboundAt: inboundAt,
      firstResponseAt: responseAt,
      responseTimeSeconds: responseTime,
      isMissed,
      assignedUserId: user?.id || null,
      assignedUserName: user?.name || null,
      status: isMissed ? 'open' : 'closed',
    });
  }
  
  // Sort by date descending
  return conversations.sort((a, b) => b.firstInboundAt.getTime() - a.firstInboundAt.getTime());
}

// Cache conversations so they're consistent within a session
let cachedConversations: DemoConversation[] | null = null;

function getDemoConversations(): DemoConversation[] {
  if (!cachedConversations) {
    cachedConversations = generateDemoConversations(50);
  }
  return cachedConversations;
}

export function getDemoMetrics(days: number = 7) {
  const conversations = getDemoConversations();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filtered = conversations.filter(c => c.firstInboundAt >= cutoff);
  
  const responded = filtered.filter(c => c.responseTimeSeconds !== null);
  const missed = filtered.filter(c => c.isMissed);
  const fast = responded.filter(c => c.responseTimeSeconds! < 300);
  
  const avgResponseTime = responded.length > 0
    ? Math.round(responded.reduce((sum, c) => sum + c.responseTimeSeconds!, 0) / responded.length)
    : 0;
  
  return {
    totalConversations: filtered.length,
    respondedCount: responded.length,
    missedCount: missed.length,
    avgResponseTime,
    fastResponseRate: responded.length > 0 
      ? Math.round((fast.length / responded.length) * 100) 
      : 0,
    under1Min: responded.filter(c => c.responseTimeSeconds! < 60).length,
    under5Min: fast.length,
    under15Min: responded.filter(c => c.responseTimeSeconds! < 900).length,
  };
}

export function getDemoMissedLeads(limit: number = 20, offset: number = 0) {
  const conversations = getDemoConversations();
  const missed = conversations.filter(c => c.isMissed);
  
  return {
    conversations: missed.slice(offset, offset + limit),
    total: missed.length,
    count: Math.min(limit, missed.length - offset),
    offset,
    limit,
  };
}

export function getDemoTeamStats(days: number = 7) {
  const conversations = getDemoConversations();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filtered = conversations.filter(c => c.firstInboundAt >= cutoff && c.assignedUserId);
  
  const teamStats = DEMO_TEAM.map(user => {
    const userConvs = filtered.filter(c => c.assignedUserId === user.id);
    const responded = userConvs.filter(c => c.responseTimeSeconds !== null);
    const missed = userConvs.filter(c => c.isMissed);
    
    const avgResponseTime = responded.length > 0
      ? Math.round(responded.reduce((sum, c) => sum + c.responseTimeSeconds!, 0) / responded.length)
      : 0;
    
    const fastestResponse = responded.length > 0
      ? Math.min(...responded.map(c => c.responseTimeSeconds!))
      : 0;
    
    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      totalResponses: responded.length,
      avgResponseTime,
      fastestResponse,
      missedCount: missed.length,
    };
  });
  
  return teamStats.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
}

export function getDemoTrend(days: number = 30) {
  const conversations = getDemoConversations();
  const trend: { date: string; avgResponseTime: number; totalConversations: number; missedCount: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayConvs = conversations.filter(c => 
      c.firstInboundAt >= dayStart && c.firstInboundAt <= dayEnd
    );
    
    const responded = dayConvs.filter(c => c.responseTimeSeconds !== null);
    const avgResponseTime = responded.length > 0
      ? Math.round(responded.reduce((sum, c) => sum + c.responseTimeSeconds!, 0) / responded.length)
      : 0;
    
    trend.push({
      date: dayStart.toISOString().split('T')[0],
      avgResponseTime,
      totalConversations: dayConvs.length,
      missedCount: dayConvs.filter(c => c.isMissed).length,
    });
  }
  
  return trend;
}

export function getDemoChannelStats(days: number = 7) {
  const conversations = getDemoConversations();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filtered = conversations.filter(c => c.firstInboundAt >= cutoff);
  
  const channelMap = new Map<string, DemoConversation[]>();
  filtered.forEach(c => {
    const list = channelMap.get(c.channel) || [];
    list.push(c);
    channelMap.set(c.channel, list);
  });
  
  return Array.from(channelMap.entries()).map(([channel, convs]) => {
    const responded = convs.filter(c => c.responseTimeSeconds !== null);
    return {
      channel,
      totalConversations: convs.length,
      avgResponseTime: responded.length > 0
        ? Math.round(responded.reduce((sum, c) => sum + c.responseTimeSeconds!, 0) / responded.length)
        : 0,
      missedCount: convs.filter(c => c.isMissed).length,
      fastResponses: convs.filter(c => c.responseTimeSeconds !== null && c.responseTimeSeconds < 300).length,
    };
  }).sort((a, b) => b.totalConversations - a.totalConversations);
}

export function getDemoRevenueSummary(days: number = 30) {
  const metrics = getDemoMetrics(days);
  const avgDealValue = 2500; // Demo average deal value
  
  const fastResponseRevenue = Math.round(metrics.under5Min * 0.35 * avgDealValue); // 35% conversion for fast
  const slowResponseLost = Math.round((metrics.respondedCount - metrics.under5Min) * 0.15 * avgDealValue); // Lost from slow
  const missedLost = Math.round(metrics.missedCount * 0.25 * avgDealValue); // Lost from missed
  
  return {
    revenueFromFastResponses: fastResponseRevenue,
    estimatedLostFromSlow: slowResponseLost,
    estimatedLostFromMissed: missedLost,
    totalPotentialLost: slowResponseLost + missedLost,
    avgDealValue,
    conversionByBucket: [
      { bucket: 'under1min', label: 'Under 1 min', leads: metrics.under1Min, conversionRate: 45, benchmarkRate: 45, revenue: Math.round(metrics.under1Min * 0.45 * avgDealValue), estimatedLost: 0 },
      { bucket: '1to5min', label: '1-5 min', leads: metrics.under5Min - metrics.under1Min, conversionRate: 35, benchmarkRate: 35, revenue: Math.round((metrics.under5Min - metrics.under1Min) * 0.35 * avgDealValue), estimatedLost: 0 },
      { bucket: '5to15min', label: '5-15 min', leads: metrics.under15Min - metrics.under5Min, conversionRate: 22, benchmarkRate: 22, revenue: Math.round((metrics.under15Min - metrics.under5Min) * 0.22 * avgDealValue), estimatedLost: Math.round((metrics.under15Min - metrics.under5Min) * 0.13 * avgDealValue) },
      { bucket: 'over15min', label: 'Over 15 min', leads: metrics.respondedCount - metrics.under15Min, conversionRate: 10, benchmarkRate: 10, revenue: Math.round((metrics.respondedCount - metrics.under15Min) * 0.1 * avgDealValue), estimatedLost: slowResponseLost },
      { bucket: 'missed', label: 'Missed', leads: metrics.missedCount, conversionRate: 0, benchmarkRate: 0, revenue: 0, estimatedLost: missedLost },
    ],
    roiProjection: {
      currentAvgMinutes: Math.round(metrics.avgResponseTime / 60),
      potentialGain: Math.round((slowResponseLost + missedLost) * 0.6), // Could recover 60%
    },
    insights: {
      speedImpactMultiplier: 4.5,
      missedLeadCost: metrics.missedCount > 0 ? Math.round(missedLost / metrics.missedCount) : 0,
      valuePerMinuteImprovement: Math.round((slowResponseLost + missedLost) / Math.max(1, metrics.avgResponseTime / 60)),
    },
  };
}

export function getDemoActivity(limit: number = 20) {
  const conversations = getDemoConversations();
  const recent = conversations.slice(0, limit);
  
  return recent.map(c => ({
    id: c.id,
    type: c.isMissed ? 'missed' : 'response',
    responderName: c.assignedUserName || 'Team',
    contactName: c.contactName,
    channel: c.channel,
    responseTimeSeconds: c.responseTimeSeconds,
    timestamp: c.firstResponseAt || c.firstInboundAt,
    isMissed: c.isMissed,
  }));
}

export function getDemoGoals(days: number = 7) {
  const metrics = getDemoMetrics(days);
  const targetSeconds = 120; // 2 minute target
  const under2Min = metrics.under1Min + Math.round((metrics.under5Min - metrics.under1Min) * 0.4);
  const percentage = metrics.respondedCount > 0 ? Math.round((under2Min / metrics.respondedCount) * 100) : 0;
  
  return {
    goal: {
      targetSeconds,
      targetFormatted: '2 minutes',
    },
    progress: {
      totalResponses: metrics.respondedCount,
      responsesMeetingGoal: under2Min,
      percentage,
      avgResponseTime: metrics.avgResponseTime,
      bestResponseTime: 28,
    },
    today: {
      totalResponses: Math.round(metrics.respondedCount / days),
      responsesMeetingGoal: Math.round(under2Min / days),
      percentage: percentage + randomInt(-5, 10),
      goalAchieved: percentage >= 90,
    },
    shouldCelebrate: false,
    dailyProgress: getDemoTrend(days).map(d => ({
      ...d,
      responsesMeetingGoal: Math.round(d.totalConversations * (percentage / 100)),
      percentage: percentage + randomInt(-10, 10),
    })),
  };
}

// Reset demo data (for testing)
export function resetDemoData() {
  cachedConversations = null;
}

export const DEMO_LOCATION_ID = 'demo_location_123';
export const DEMO_TEAM_MEMBERS = DEMO_TEAM;
