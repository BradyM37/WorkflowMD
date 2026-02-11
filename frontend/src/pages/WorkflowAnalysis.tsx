import React, { useState } from 'react';
import { Card, Drawer, Tag, Space, Divider, Typography, Button, Tabs } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ThunderboltOutlined, BugOutlined } from '@ant-design/icons';
import WorkflowGraph from '../components/WorkflowGraph';
import { Node, Edge } from 'reactflow';
import { MOCK_WORKFLOW_GRAPH_ANALYSIS } from '../mocks/mockData';
import './WorkflowAnalysis.css';

const { Title, Text, Paragraph } = Typography;

// Use centralized mock data
const mockAnalysisResults = MOCK_WORKFLOW_GRAPH_ANALYSIS;

const WorkflowAnalysis: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    type: 'node' | 'edge';
    data: Node | Edge;
  } | null>(null);

  const handleNodeClick = (node: Node) => {
    setSelectedElement({ type: 'node', data: node });
    setDrawerVisible(true);
  };

  const handleEdgeClick = (edge: Edge) => {
    setSelectedElement({ type: 'edge', data: edge });
    setDrawerVisible(true);
  };

  const renderSeverityTag = (severity: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'blue',
    };
    return <Tag color={colors[severity]}>{severity.toUpperCase()}</Tag>;
  };

  const renderImpactEffort = (impact: string, effort: string) => (
    <Space>
      <Text type="secondary">Impact:</Text>
      <Tag color={impact === 'high' ? 'green' : impact === 'medium' ? 'blue' : 'default'}>
        {impact}
      </Tag>
      <Text type="secondary">Effort:</Text>
      <Tag color={effort === 'low' ? 'green' : effort === 'medium' ? 'orange' : 'red'}>
        {effort}
      </Tag>
    </Space>
  );

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const calculateTotalDeductions = () => {
    const loopDeductions = mockAnalysisResults.loops.reduce((sum, loop) => sum + loop.pointsDeducted, 0);
    const conflictDeductions = mockAnalysisResults.conflicts.reduce((sum, conflict) => sum + conflict.pointsDeducted, 0);
    const perfDeductions = mockAnalysisResults.performance.issues.reduce((sum, issue) => sum + issue.pointsDeducted, 0);
    return loopDeductions + conflictDeductions + perfDeductions;
  };

  const analysisItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="analysis-section">
          <Card className="score-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={2} style={{ marginBottom: 8 }}>
                  {mockAnalysisResults.performance.score}
                  <Text type="secondary" style={{ fontSize: 18, marginLeft: 8, color: '#8c8c8c' }}>
                    / 100
                  </Text>
                </Title>
                <Paragraph type="secondary" style={{ color: '#8c8c8c' }}>Overall Workflow Health Score</Paragraph>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>Confidence</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag 
                    color={getConfidenceColor(mockAnalysisResults.performance.confidence)}
                    style={{ fontSize: 14, padding: '4px 12px', fontWeight: 600 }}
                  >
                    {mockAnalysisResults.performance.confidence.toUpperCase()}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#8c8c8c' }}>
                  Based on workflow complexity
                </Text>
              </div>
            </div>
          </Card>

          <Card title="Issue Breakdown" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 16 }}>Total Deductions: -{calculateTotalDeductions()} points</Text>
              </div>
              {mockAnalysisResults.loops.map((loop) => (
                <div key={loop.id} className="issue-breakdown-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <WarningOutlined style={{ color: '#ef4444', marginRight: 8 }} />
                      <Text >{loop.description}</Text>
                    </div>
                    <Tag color="red" style={{ fontWeight: 600 }}>-{loop.pointsDeducted} pts</Tag>
                  </div>
                </div>
              ))}
              {mockAnalysisResults.conflicts.map((conflict) => (
                <div key={conflict.id} className="issue-breakdown-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <ThunderboltOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                      <Text >{conflict.description}</Text>
                    </div>
                    <Tag color="orange" style={{ fontWeight: 600 }}>-{conflict.pointsDeducted} pts</Tag>
                  </div>
                </div>
              ))}
              {mockAnalysisResults.performance.issues.map((issue) => (
                <div key={issue.id} className="issue-breakdown-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <BugOutlined style={{ color: '#ef4444', marginRight: 8 }} />
                      <Text >{issue.description}</Text>
                    </div>
                    <Tag color={issue.severity === 'high' ? 'red' : 'orange'} style={{ fontWeight: 600 }}>
                      -{issue.pointsDeducted} pts
                    </Tag>
                  </div>
                </div>
              ))}
            </Space>
          </Card>

          {mockAnalysisResults.history && mockAnalysisResults.history.length > 0 && (
            <Card title="Progress Tracker" style={{ marginTop: 16 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary" style={{ color: '#8c8c8c' }}>Your workflow health over time</Text>
                <div className="progress-timeline">
                  {mockAnalysisResults.history.map((entry, index) => {
                    const isLatest = index === mockAnalysisResults.history!.length - 1;
                    const previous = index > 0 ? mockAnalysisResults.history![index - 1] : null;
                    const improvement = previous ? entry.score - previous.score : 0;
                    
                    return (
                      <div key={entry.date} className="progress-entry" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: isLatest ? 'none' : '1px solid #e5e7eb',
                        background: isLatest ? '#f0fdf4' : 'transparent',
                        paddingLeft: isLatest ? '12px' : '0',
                        paddingRight: isLatest ? '12px' : '0',
                        borderRadius: isLatest ? '6px' : '0',
                      }}>
                        <div>
                          <Text strong >{new Date(entry.date).toLocaleDateString()}</Text>
                          {isLatest && <Tag color="green" style={{ marginLeft: 8 }}>Current</Tag>}
                          <div>
                            <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>{entry.issues} issues</Text>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text strong style={{ fontSize: 18 }}>{entry.score}</Text>
                          {improvement !== 0 && (
                            <div>
                              <Text style={{ 
                                color: improvement > 0 ? '#10b981' : '#ef4444',
                                fontSize: 12,
                                fontWeight: 600 
                              }}>
                                {improvement > 0 ? '↑' : '↓'} {Math.abs(improvement)} pts
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Space>
            </Card>
          )}

          <Card title="Quick Summary" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div className="summary-item">
                <WarningOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                <Text strong >{mockAnalysisResults.loops.length} Loop(s) Detected</Text>
              </div>
              <div className="summary-item">
                <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                <Text strong >{mockAnalysisResults.conflicts.length} Trigger Conflict(s)</Text>
              </div>
              <div className="summary-item">
                <BugOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                <Text strong >{mockAnalysisResults.performance.issues.length} Performance Issue(s)</Text>
              </div>
              <div className="summary-item">
                <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                <Text strong >{mockAnalysisResults.suggestions.length} Optimization Suggestion(s)</Text>
              </div>
            </Space>
          </Card>
        </div>
      ),
    },
    {
      key: 'loops',
      label: `Loops (${mockAnalysisResults.loops.length})`,
      children: (
        <div className="analysis-section">
          {mockAnalysisResults.loops.map((loop) => (
            <Card key={loop.id} style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong >{loop.description}</Text>
                  <Space>
                    <Tag color="red" style={{ fontWeight: 600 }}>-{loop.pointsDeducted} pts</Tag>
                    {renderSeverityTag(loop.severity)}
                  </Space>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong style={{ fontSize: 12, color: '#6b7280' }}>💡 HOW TO FIX</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8, color: '#8c8c8c' }}>{loop.suggestion}</Paragraph>
                </div>
                <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', marginTop: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>Quick Tip: </Text>
                  <Text style={{ fontSize: 12, color: '#595959' }}>
                    Add an "If/Else" condition with a contact field counter to break loops after N iterations
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>Affected nodes: {loop.nodes.join(' → ')}</Text>
              </Space>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'conflicts',
      label: `Conflicts (${mockAnalysisResults.conflicts.length})`,
      children: (
        <div className="analysis-section">
          {mockAnalysisResults.conflicts.map((conflict) => (
            <Card key={conflict.id} style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong >{conflict.description}</Text>
                  <Space>
                    <Tag color="orange" style={{ fontWeight: 600 }}>-{conflict.pointsDeducted} pts</Tag>
                    {renderSeverityTag(conflict.severity)}
                  </Space>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong style={{ fontSize: 12, color: '#6b7280' }}>💡 HOW TO FIX</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8, color: '#8c8c8c' }}>{conflict.suggestion}</Paragraph>
                </div>
                <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', marginTop: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>Quick Tip: </Text>
                  <Text style={{ fontSize: 12, color: '#595959' }}>
                    Use GHL's "Trigger Filter" settings to add conditions that prevent simultaneous execution
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>Triggers: {conflict.triggers.join(', ')}</Text>
              </Space>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'performance',
      label: `Performance (${mockAnalysisResults.performance.issues.length})`,
      children: (
        <div className="analysis-section">
          {mockAnalysisResults.performance.issues.map((issue) => {
            const quickTips: Record<string, string> = {
              slow_action: 'Batch multiple actions together or use webhooks for async processing',
              missing_error_handling: 'Add "If/Else" condition after critical actions to check success/failure',
              inefficient_condition: 'Combine multiple conditions into a single "Advanced" condition',
              redundant_delay: 'Combine consecutive delays into a single delay action',
            };
            
            return (
              <Card key={issue.id} style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong >{issue.description}</Text>
                    <Space>
                      <Tag color={issue.severity === 'high' ? 'red' : 'orange'} style={{ fontWeight: 600 }}>
                        -{issue.pointsDeducted} pts
                      </Tag>
                      {renderSeverityTag(issue.severity)}
                    </Space>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>
                    <Text strong style={{ fontSize: 12, color: '#6b7280' }}>💡 HOW TO FIX</Text>
                    <Paragraph type="secondary" style={{ marginTop: 8, color: '#8c8c8c' }}>{issue.suggestion}</Paragraph>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', marginTop: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>Quick Tip: </Text>
                    <Text style={{ fontSize: 12, color: '#595959' }}>
                      {quickTips[issue.type] || 'Optimize this action for better performance'}
                    </Text>
                  </div>
                  <Space>
                    <Tag>Node: {issue.nodeId}</Tag>
                    <Tag color="purple">{issue.type.replace(/_/g, ' ')}</Tag>
                  </Space>
                </Space>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      key: 'suggestions',
      label: `Suggestions (${mockAnalysisResults.suggestions.length})`,
      children: (
        <div className="analysis-section">
          {mockAnalysisResults.suggestions.map((suggestion) => (
            <Card key={suggestion.id} style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong >{suggestion.title}</Text>
                <Paragraph type="secondary" style={{ color: '#8c8c8c' }}>{suggestion.description}</Paragraph>
                <div style={{ background: '#eff6ff', padding: '8px 12px', borderRadius: '6px', marginTop: 8 }}>
                  <Text strong style={{ fontSize: 12, color: '#1e40af' }}>💡 Quick Tip: </Text>
                  <Text style={{ fontSize: 12, color: '#1e40af' }}>
                    {suggestion.quickTip}
                  </Text>
                </div>
                {renderImpactEffort(suggestion.impact, suggestion.effort)}
              </Space>
            </Card>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="workflow-analysis-page">
      <div className="analysis-layout">
        <div className="graph-panel">
          <WorkflowGraph
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            highlightIssues={true}
          />
        </div>

        <div className="analysis-panel">
          <div className="panel-header">
            <Title level={3} >Analysis Results</Title>
            <Button type="primary">Run New Analysis</Button>
          </div>
          <Tabs items={analysisItems} />
        </div>
      </div>

      <Drawer
        title={selectedElement?.type === 'node' ? 'Node Details' : 'Connection Details'}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {selectedElement?.type === 'node' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Type:</Text>
              <Title level={5} >{(selectedElement.data as Node).type?.toUpperCase()}</Title>
            </div>
            <Divider />
            <div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Label:</Text>
              <Paragraph style={{ color: '#595959' }}>{(selectedElement.data as Node).data.label}</Paragraph>
            </div>
            <Divider />
            <div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Node ID:</Text>
              <Text code >{(selectedElement.data as Node).id}</Text>
            </div>
            {(selectedElement.data as Node).data.hasIssue && (
              <>
                <Divider />
                <Card size="small" style={{ background: '#fee2e2', border: '1px solid #ef4444' }}>
                  <Space direction="vertical">
                    <Text strong style={{ color: '#991b1b' }}>
                      ⚠️ Performance Issue Detected
                    </Text>
                    <Text type="secondary" style={{ color: '#8c8c8c' }}>This action has high execution time</Text>
                  </Space>
                </Card>
              </>
            )}
            {(selectedElement.data as Node).data.hasConflict && (
              <>
                <Divider />
                <Card size="small" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                  <Space direction="vertical">
                    <Text strong style={{ color: '#92400e' }}>
                      ⚡ Trigger Conflict
                    </Text>
                    <Text type="secondary" style={{ color: '#8c8c8c' }}>This trigger may conflict with others</Text>
                  </Space>
                </Card>
              </>
            )}
          </Space>
        )}

        {selectedElement?.type === 'edge' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>From:</Text>
              <Text strong > Node {(selectedElement.data as Edge).source}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>To:</Text>
              <Text strong > Node {(selectedElement.data as Edge).target}</Text>
            </div>
            {(selectedElement.data as Edge).label && (
              <>
                <Divider />
                <div>
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Condition:</Text>
                  <Tag>{(selectedElement.data as Edge).label}</Tag>
                </div>
              </>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default WorkflowAnalysis;
