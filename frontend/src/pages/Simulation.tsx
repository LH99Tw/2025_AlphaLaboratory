import React from 'react';
import { Card, Typography, Empty, Button, Space } from 'antd';
import { PlayCircleOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Simulation: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <RocketOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
          <Title level={2}>모의투자</Title>
          <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto 32px' }}>
            실제 시장 환경에서 안전하게 투자 전략을 테스트하고 검증할 수 있는 모의투자 시스템입니다.
            백테스트 결과를 바탕으로 실시간 시장 데이터를 활용한 시뮬레이션을 제공합니다.
          </Paragraph>
          
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4} style={{ color: '#999' }}>🚧 개발 중</Title>
                <Paragraph style={{ color: '#999' }}>
                  모의투자 기능은 현재 개발 중입니다.<br />
                  곧 실제 시장 데이터를 활용한 실시간 시뮬레이션을 제공할 예정입니다.
                </Paragraph>
              </div>
            }
          >
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} size="large" disabled>
                모의투자 시작
              </Button>
              <Button size="large" disabled>
                전략 설정
              </Button>
            </Space>
          </Empty>
        </div>
      </Card>
    </div>
  );
};

export default Simulation;
