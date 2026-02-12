import { useAuth } from '../contexts/AuthContext';
import { useMemo, useCallback, useState } from 'react';

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

export interface PlanLimits {
  historyDays: number;
  maxLocations: number;
  maxTeamMembers: number;
  alertsPerWeek: number;
  exportEnabled: boolean;
  aiInsights: boolean;
  slackEnabled: boolean;
  revenueAttribution: boolean;
  whiteLabelEnabled: boolean;
  apiAccess: boolean;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    historyDays: 7,
    maxLocations: 1,
    maxTeamMembers: 3,
    alertsPerWeek: 5,
    exportEnabled: false,
    aiInsights: false,
    slackEnabled: false,
    revenueAttribution: false,
    whiteLabelEnabled: false,
    apiAccess: false,
  },
  starter: {
    historyDays: 30,
    maxLocations: 3,
    maxTeamMembers: 10,
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: false,
    slackEnabled: false,
    revenueAttribution: false,
    whiteLabelEnabled: false,
    apiAccess: false,
  },
  pro: {
    historyDays: 90,
    maxLocations: 10,
    maxTeamMembers: 25,
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: true,
    slackEnabled: true,
    revenueAttribution: true,
    whiteLabelEnabled: false,
    apiAccess: false,
  },
  agency: {
    historyDays: 365,
    maxLocations: 50,
    maxTeamMembers: -1, // Unlimited
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: true,
    slackEnabled: true,
    revenueAttribution: true,
    whiteLabelEnabled: true,
    apiAccess: true,
  },
};

export interface UsePlanReturn {
  planType: PlanType;
  limits: PlanLimits;
  isPro: boolean;
  isAgency: boolean;
  isFree: boolean;
  canAccess: (feature: keyof PlanLimits) => boolean;
  requiresPro: (feature: keyof PlanLimits) => boolean;
  requiresAgency: (feature: keyof PlanLimits) => boolean;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
  promptFeature: string | null;
  triggerUpgradePrompt: (feature: string, requiredPlan?: 'starter' | 'pro' | 'agency') => void;
  requiredPlanForPrompt: 'starter' | 'pro' | 'agency';
  isStarter: boolean;
}

export function usePlan(): UsePlanReturn {
  const { subscription } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string | null>(null);
  const [requiredPlanForPrompt, setRequiredPlanForPrompt] = useState<'starter' | 'pro' | 'agency'>('starter');

  // Map subscription to plan type
  const planType: PlanType = useMemo(() => {
    if (subscription === 'starter') return 'starter';
    if (subscription === 'pro') return 'pro';
    if (subscription === 'agency') return 'agency';
    return 'free';
  }, [subscription]);

  const limits = useMemo(() => PLAN_LIMITS[planType], [planType]);

  const isStarter = planType === 'starter' || planType === 'pro' || planType === 'agency';
  const isPro = planType === 'pro' || planType === 'agency';
  const isAgency = planType === 'agency';
  const isFree = planType === 'free';

  const canAccess = useCallback(
    (feature: keyof PlanLimits): boolean => {
      const value = limits[feature];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      return false;
    },
    [limits]
  );

  const requiresPro = useCallback(
    (feature: keyof PlanLimits): boolean => {
      // Returns true if this feature requires Pro and user doesn't have it
      const proLimits = PLAN_LIMITS.pro;
      const proValue = proLimits[feature];
      const hasFeature = canAccess(feature);
      
      if (typeof proValue === 'boolean') {
        return proValue && !hasFeature;
      }
      return false;
    },
    [canAccess]
  );

  const requiresAgency = useCallback(
    (feature: keyof PlanLimits): boolean => {
      // Returns true if this feature requires Agency and user doesn't have it
      const agencyLimits = PLAN_LIMITS.agency;
      const proLimits = PLAN_LIMITS.pro;
      const agencyValue = agencyLimits[feature];
      const proValue = proLimits[feature];
      const hasFeature = canAccess(feature);
      
      // Feature is agency-only if agency has it but pro doesn't
      if (typeof agencyValue === 'boolean' && typeof proValue === 'boolean') {
        return agencyValue && !proValue && !hasFeature;
      }
      return false;
    },
    [canAccess]
  );

  const triggerUpgradePrompt = useCallback(
    (feature: string, requiredPlan: 'starter' | 'pro' | 'agency' = 'starter') => {
      setPromptFeature(feature);
      setRequiredPlanForPrompt(requiredPlan);
      setShowUpgradePrompt(true);
    },
    []
  );

  return {
    planType,
    limits,
    isStarter,
    isPro,
    isAgency,
    isFree,
    canAccess,
    requiresPro,
    requiresAgency,
    showUpgradePrompt,
    setShowUpgradePrompt,
    promptFeature,
    triggerUpgradePrompt,
    requiredPlanForPrompt,
  };
}

export default usePlan;
