import React from 'react';
import { Result, Card, Typography, Spin } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';

const { Title, Text } = Typography;

/**
 * Placeholder for shared report view
 * TODO: Implement full shared report viewing functionality
 */
const SharedReportView: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: 24
    }}>
      <Card style={{ maxWidth: 500, textAlign: 'center' }}>
        <Result
          icon={<FilePdfOutlined style={{ color: '#667eea' }} />}
          title="Shared Report"
          subTitle="This feature is coming soon. You'll be able to view shared response time reports here."
          extra={
            <Text type="secondary">Report Token: {token}</Text>
          }
        />
      </Card>
    </div>
  );
};

export default SharedReportView;
