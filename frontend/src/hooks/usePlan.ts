import { useAuth } from '../contexts/AuthContext';
import { useMemo, useCallback, useState } from 'react';

export type PlanType = 'free' | 'pro' | 'agency';

export interface PlanLimits {
  historyDays: number;
  maxInsights: number;
  exportEnabled: boolean;
  alertsEnabled: boolean;
  teamAnalytics: boolean;
  aiInsights: boolean;
  whiteLabelEnabled: boolean;
  shareableReports: boolean;
  apiAccess: boolean;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    historyDays: 7,
    maxInsights: 3,
    exportEnabled: false,
    alertsEnabled: false,
    teamAnalytics: false,
    aiInsights: false,
    whiteLabelEnabled: false,
    shareableReports: false,
    apiAccess: false,
  },
  pro: {
    historyDays: 365,
    maxInsights: 50,
    exportEnabled: true,
    alertsEnabled: true,
    teamAnalytics: true,
    aiInsights: true,
    whiteLabelEnabled: false,
    shareableReports: false,
    apiAccess: false,
  },
  agency: {
    historyDays: -1, // Unlimited
    maxInsights: -1, // Unlimited
    exportEnabled: true,
    alertsEnabled: true,
    teamAnalytics: true,
    aiInsights: true,
    whiteLabelEnabled: true,
    shareableReports: true,
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
  triggerUpgradePrompt: (feature: string, requiredPlan?: 'pro' | 'agency') => void;
  requiredPlanForPrompt: 'pro' | 'agency';
}

export function usePlan(): UsePlanReturn {
  const { subscription } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string | null>(null);
  const [requiredPlanForPrompt, setRequiredPlanForPrompt] = useState<'pro' | 'agency'>('pro');

  // Map subscription to plan type (support for legacy 'pro' status)
  const planType: PlanType = useMemo(() => {
    if (subscription === 'pro') return 'pro';
    if (subscription === 'agency') return 'agency' as PlanType;
    return 'free';
  }, [subscription]);

  const limits = useMemo(() => PLAN_LIMITS[planType], [planType]);

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
    (feature: string, requiredPlan: 'pro' | 'agency' = 'pro') => {
      setPromptFeature(feature);
      setRequiredPlanForPrompt(requiredPlan);
      setShowUpgradePrompt(true);
    },
    []
  );

  return {
    planType,
    limits,
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
