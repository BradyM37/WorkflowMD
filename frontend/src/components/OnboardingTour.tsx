import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

interface OnboardingTourProps {
  run?: boolean;
  onComplete?: () => void;
}

/**
 * Onboarding Tour Component
 * Guided tour for first-time users
 * Uses react-joyride for smooth step-by-step experience
 */
const OnboardingTour: React.FC<OnboardingTourProps> = ({ run: propRun, onComplete }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [filteredSteps, setFilteredSteps] = useState<Step[]>([]);

  // Define step targets for validation
  const stepTargets = [
    'body',
    '.ant-tabs-tab:first-child',
    '.ant-tabs-tab:nth-child(2)',
    '[href="/workflow-graph"]',
    '[href="/settings"]',
    'body',
    'body'
  ];

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    
    // Don't run on login/register pages
    const isAuthPage = window.location.pathname.includes('/login') || 
                       window.location.pathname.includes('/register') ||
                       window.location.pathname.includes('/forgot') ||
                       window.location.pathname.includes('/reset');
    
    if (!hasCompletedOnboarding && propRun !== false && !isAuthPage) {
      // Auto-start after a short delay, but only if required elements exist
      const timer = setTimeout(() => {
        // Check if dashboard elements exist before starting
        const tabsExist = document.querySelector('.ant-tabs-tab');
        if (!tabsExist) {
          return; // Don't start tour if not on dashboard
        }
        
        // Filter to only valid steps
        const validSteps = steps.filter((step, index) => {
          const target = stepTargets[index];
          if (target === 'body') return true;
          try {
            const element = document.querySelector(target);
            return element !== null;
          } catch {
            return false;
          }
        });
        
        if (validSteps.length > 0) {
          setFilteredSteps(validSteps);
          setRun(true);
        }
      }, 2000); // Increased delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [propRun]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            🎉 Welcome to FirstResponse!
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
            Let's take a quick tour to help you find and fix workflow issues faster.
            This will only take 30 seconds.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.ant-tabs-tab:first-child',
      content: (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>📋 Your Workflows</h3>
          <p>
            All your GoHighLevel workflows appear here. Click "Analyze Workflow" 
            to scan for issues, performance problems, and optimization opportunities.
          </p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: '.ant-tabs-tab:nth-child(2)',
      content: (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>📊 Past Scans</h3>
          <p>
            View your analysis history here. Track health scores over time and 
            see how your workflows improve.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[href="/workflow-graph"]',
      content: (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>🔍 Workflow Graph</h3>
          <p>
            Visualize your workflow structure. See loops, conflicts, and 
            performance bottlenecks at a glance.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[href="/settings"]',
      content: (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>⚙️ Settings</h3>
          <p>
            Customize your experience. Toggle dark mode, manage notifications,
            and configure your preferences.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            ⌨️ Pro Tip: Keyboard Shortcuts
          </h2>
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <kbd style={{ 
                background: '#f0f0f0', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                marginRight: '8px'
              }}>
                Ctrl+D
              </kbd> 
              Dashboard
            </div>
            <div style={{ marginBottom: '8px' }}>
              <kbd style={{ 
                background: '#f0f0f0', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                marginRight: '8px'
              }}>
                Ctrl+G
              </kbd> 
              Workflow Graph
            </div>
            <div style={{ marginBottom: '8px' }}>
              <kbd style={{ 
                background: '#f0f0f0', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                marginRight: '8px'
              }}>
                Ctrl+/
              </kbd> 
              Show All Shortcuts
            </div>
          </div>
          <p>Press <kbd style={{ 
            background: '#f0f0f0', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>Ctrl+/</kbd> anytime to see all keyboard shortcuts!</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: 'body',
      content: (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            🚀 You're All Set!
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
            Start analyzing workflows to find configuration errors, 
            performance bottlenecks, and optimization opportunities.
          </p>
          <p style={{ fontSize: '14px', color: '#8c8c8c' }}>
            You can replay this tour anytime from Settings.
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      // Mark onboarding as completed
      localStorage.setItem('onboarding_completed', 'true');
      setRun(false);
      if (onComplete) onComplete();
    } else if (type === EVENTS.STEP_AFTER) {
      // Update step index
      setStepIndex(index + 1);
    }
  };

  // Don't render Joyride at all until we're ready to run
  // This prevents Popper/Floater from initializing on non-existent elements
  if (!run || filteredSteps.length === 0) {
    return null;
  }

  return (
    <>
      <Joyride
        steps={filteredSteps}
        run={run}
        continuous
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        disableScrolling
        scrollToFirstStep={false}
        floaterProps={{
          disableAnimation: true,
        }}
        styles={{
          options: {
            primaryColor: '#667eea',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 12,
            fontSize: 15,
          },
          tooltipContent: {
            padding: '20px 12px',
          },
          buttonNext: {
            background: '#667eea',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 20px',
          },
          buttonBack: {
            color: '#667eea',
            fontSize: 14,
            fontWeight: 600,
          },
          buttonSkip: {
            color: '#8c8c8c',
            fontSize: 14,
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </>
  );
};

/**
 * Trigger button for restarting the onboarding tour
 */
export const StartTourButton: React.FC = () => {
  const [run, setRun] = useState(false);

  const handleStartTour = () => {
    localStorage.removeItem('onboarding_completed');
    setRun(true);
    setTimeout(() => setRun(false), 100); // Reset
    setTimeout(() => {
      window.location.reload(); // Reload to restart tour properly
    }, 200);
  };

  return (
    <Button
      icon={<RocketOutlined />}
      onClick={handleStartTour}
      size="large"
    >
      Restart Tutorial
    </Button>
  );
};

export default OnboardingTour;
