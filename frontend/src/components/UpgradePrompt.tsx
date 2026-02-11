import React from 'react';
import { X, Check, Zap, Building2, Crown } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'pro' | 'agency';
  requiredPlan?: 'pro' | 'agency';
  feature?: string;
}

const FEATURES = {
  free: {
    name: 'Free',
    price: '$0',
    icon: Zap,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: '7-day history', included: true },
      { name: 'Limited insights (3)', included: true },
      { name: 'Export reports', included: false },
      { name: 'Slack/email alerts', included: false },
      { name: 'Team analytics', included: false },
      { name: 'AI insights', included: false },
      { name: 'White-label branding', included: false },
      { name: 'Shareable reports', included: false },
      { name: 'API access', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    price: '$100/mo',
    icon: Crown,
    popular: true,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: 'Full history (365 days)', included: true },
      { name: 'Unlimited insights', included: true },
      { name: 'Export reports (CSV, PDF)', included: true },
      { name: 'Slack/email alerts', included: true },
      { name: 'Team analytics', included: true },
      { name: 'AI-powered insights', included: true },
      { name: 'White-label branding', included: false },
      { name: 'Shareable reports', included: false },
      { name: 'API access', included: false },
    ],
  },
  agency: {
    name: 'Agency',
    price: '$200/mo',
    icon: Building2,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: 'Unlimited history', included: true },
      { name: 'Unlimited insights', included: true },
      { name: 'Export reports (CSV, PDF)', included: true },
      { name: 'Slack/email alerts', included: true },
      { name: 'Team analytics', included: true },
      { name: 'AI-powered insights', included: true },
      { name: 'White-label branding', included: true },
      { name: 'Shareable client reports', included: true },
      { name: 'Full API access', included: true },
    ],
  },
};

// GHL Marketplace app URL - update with your actual app ID
const MARKETPLACE_URL = 'https://marketplace.gohighlevel.com/app/YOUR_APP_ID';

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  currentPlan,
  requiredPlan = 'pro',
  feature,
}) => {
  if (!isOpen) return null;

  const handleUpgrade = (plan: 'pro' | 'agency') => {
    // Open GHL Marketplace in new tab
    window.open(`${MARKETPLACE_URL}?plan=${plan}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Unlock Premium Features
            </h2>
            {feature && (
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">{feature}</span> requires a {requiredPlan === 'agency' ? 'Agency' : 'Pro'} subscription
              </p>
            )}
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(['free', 'pro', 'agency'] as const).map((plan) => {
              const planData = FEATURES[plan];
              const Icon = planData.icon;
              const isCurrentPlan = currentPlan === plan;
              const isPopular = 'popular' in planData && planData.popular;
              const canUpgrade = plan !== 'free' && (
                currentPlan === 'free' || 
                (currentPlan === 'pro' && plan === 'agency')
              );

              return (
                <div
                  key={plan}
                  className={`relative rounded-xl border-2 p-6 transition-all ${
                    isPopular
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                      : isCurrentPlan
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                      plan === 'free' 
                        ? 'bg-gray-100 dark:bg-gray-700' 
                        : plan === 'pro'
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : 'bg-purple-100 dark:bg-purple-900/50'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        plan === 'free'
                          ? 'text-gray-600 dark:text-gray-400'
                          : plan === 'pro'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {planData.name}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {planData.price}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {planData.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 flex-shrink-0 ${
                          feat.included
                            ? 'text-green-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`} />
                        <span className={`text-sm ${
                          feat.included
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-500 line-through'
                        }`}>
                          {feat.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {canUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(plan as 'pro' | 'agency')}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900'
                      }`}
                    >
                      Upgrade to {planData.name}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    >
                      {isCurrentPlan ? 'Current Plan' : 'N/A'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Subscriptions are managed through the{' '}
            <a
              href={MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GoHighLevel Marketplace
            </a>
            . Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
