import React from 'react';
import { Popover, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface HelpTooltipProps {
  title: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  iconStyle?: React.CSSProperties;
}

/**
 * Contextual help tooltip component
 * Shows a "?" icon that displays explanation on hover
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  title, 
  content, 
  placement = 'top',
  iconStyle 
}) => {
  return (
    <Popover
      title={<Text strong>{title}</Text>}
      content={<div style={{ maxWidth: 300 }}>{content}</div>}
      placement={placement}
      trigger="hover"
    >
      <QuestionCircleOutlined 
        style={{ 
          color: '#8c8c8c', 
          cursor: 'help',
          marginLeft: 4,
          fontSize: 14,
          ...iconStyle 
        }} 
      />
    </Popover>
  );
};

// Pre-built tooltips for common metrics

export const ResponseTimeTooltip: React.FC = () => (
  <HelpTooltip
    title="Response Time"
    content={
      <>
        <Paragraph style={{ margin: 0, fontSize: 13 }}>
          The time between when a lead first contacts you and when your team responds.
        </Paragraph>
        <Paragraph style={{ margin: '8px 0 0', fontSize: 13 }}>
          <Text type="success">Elite: &lt;5 min</Text> • <Text type="warning">Avg: 15-60 min</Text>
        </Paragraph>
      </>
    }
  />
);

export const MissedLeadsTooltip: React.FC = () => (
  <HelpTooltip
    title="Missed Leads"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        Leads with no human response within 24 hours. Automated messages don't count—we track 
        actual personal outreach to give you accurate metrics.
      </Paragraph>
    }
  />
);

export const ConversionRateTooltip: React.FC = () => (
  <HelpTooltip
    title="Conversion Rate"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        Percentage of leads that converted to customers. Calculated as: 
        <Text code style={{ fontSize: 12 }}>(Converted Leads ÷ Total Leads) × 100</Text>
      </Paragraph>
    }
  />
);

export const ROITooltip: React.FC = () => (
  <HelpTooltip
    title="ROI (Return on Investment)"
    content={
      <>
        <Paragraph style={{ margin: 0, fontSize: 13 }}>
          Estimated revenue recovered from faster response times.
        </Paragraph>
        <Paragraph style={{ margin: '8px 0 0', fontSize: 13 }}>
          Based on industry research showing 21x higher conversion rates when responding within 5 minutes.
        </Paragraph>
      </>
    }
  />
);

export const BenchmarkTierTooltip: React.FC = () => (
  <HelpTooltip
    title="Benchmark Tier"
    content={
      <>
        <Paragraph style={{ margin: 0, fontSize: 13 }}>
          Your performance compared to industry standards:
        </Paragraph>
        <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 13 }}>
          <li><Text type="success">Elite</Text>: Under 5 min</li>
          <li><Text style={{ color: '#1890ff' }}>Fast</Text>: 5-15 min</li>
          <li><Text type="warning">Average</Text>: 15-60 min</li>
          <li><Text type="danger">Slow</Text>: Over 60 min</li>
        </ul>
      </>
    }
  />
);

export const LeadScoreTooltip: React.FC = () => (
  <HelpTooltip
    title="Lead Score"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        A 0-100 score indicating lead quality based on engagement, source, and behavior patterns. 
        Higher scores = more likely to convert.
      </Paragraph>
    }
  />
);

export const WorkflowHealthTooltip: React.FC = () => (
  <HelpTooltip
    title="Workflow Health"
    content={
      <>
        <Paragraph style={{ margin: 0, fontSize: 13 }}>
          Overall health score for your GHL workflows based on:
        </Paragraph>
        <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 13 }}>
          <li>Error rates and failed actions</li>
          <li>Response time consistency</li>
          <li>Lead drop-off points</li>
          <li>Automation coverage</li>
        </ul>
      </>
    }
  />
);

export const FirstResponseTooltip: React.FC = () => (
  <HelpTooltip
    title="First Response Time"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        Time from lead creation to the first human touchpoint (call, text, or email). 
        This is the #1 factor in lead conversion rates.
      </Paragraph>
    }
  />
);

export const TeamPerformanceTooltip: React.FC = () => (
  <HelpTooltip
    title="Team Performance"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        Individual team member response times and lead handling metrics. 
        Use this to identify top performers and coaching opportunities.
      </Paragraph>
    }
  />
);

export const AlertThresholdTooltip: React.FC = () => (
  <HelpTooltip
    title="Alert Threshold"
    content={
      <Paragraph style={{ margin: 0, fontSize: 13 }}>
        When response time exceeds this threshold, you'll receive an alert via your configured 
        channels (Slack, email, etc.). Recommended: 5-15 minutes.
      </Paragraph>
    }
  />
);

// Export all tooltips as a collection for easy importing
export const HelpTooltips = {
  ResponseTime: ResponseTimeTooltip,
  MissedLeads: MissedLeadsTooltip,
  ConversionRate: ConversionRateTooltip,
  ROI: ROITooltip,
  BenchmarkTier: BenchmarkTierTooltip,
  LeadScore: LeadScoreTooltip,
  WorkflowHealth: WorkflowHealthTooltip,
  FirstResponse: FirstResponseTooltip,
  TeamPerformance: TeamPerformanceTooltip,
  AlertThreshold: AlertThresholdTooltip,
};

export default HelpTooltip;
