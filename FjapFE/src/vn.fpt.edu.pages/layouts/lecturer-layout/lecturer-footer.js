import React from 'react';
import { Layout, Row, Col, Typography, Space } from 'antd';
import { 
  MailOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined,
  FacebookOutlined,
  TwitterOutlined,
  LinkedinOutlined
} from '@ant-design/icons';

const { Footer } = Layout;
const { Text, Link } = Typography;

const LecturerFooter = () => {
  return (
    <Footer style={{
      background: '#1e293b',
      color: '#ffffff',
      padding: '32px 24px',
      marginTop: 'auto',
    }}>
      <Row gutter={[32, 32]}>
        <Col xs={24} sm={12} md={6}>
          <div>
            <img 
              src="/FJAP.png" 
              alt="FPT Japan Academy" 
              style={{ height: 40, marginBottom: 16, filter: 'brightness(0) invert(1)' }}
            />
            <Text style={{ color: '#94a3b8', display: 'block', marginBottom: 16 }}>
              Empowering students through innovative education and technology.
            </Text>
            <Space>
              <Link href="#" style={{ color: '#94a3b8' }}>
                <FacebookOutlined style={{ fontSize: 18 }} />
              </Link>
              <Link href="#" style={{ color: '#94a3b8' }}>
                <TwitterOutlined style={{ fontSize: 18 }} />
              </Link>
              <Link href="#" style={{ color: '#94a3b8' }}>
                <LinkedinOutlined style={{ fontSize: 18 }} />
              </Link>
            </Space>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div>
            <Text strong style={{ color: '#ffffff', fontSize: 16, display: 'block', marginBottom: 16 }}>
              Quick Links
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="#" style={{ color: '#94a3b8' }}>Dashboard</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>Classes</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>Homework</Link>
              <Link href="grades" style={{ color: '#94a3b8' }}>Grades</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>Materials</Link>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div>
            <Text strong style={{ color: '#ffffff', fontSize: 16, display: 'block', marginBottom: 16 }}>
              Support
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="#" style={{ color: '#94a3b8' }}>Help Center</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>Documentation</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>Contact Support</Link>
              <Link href="#" style={{ color: '#94a3b8' }}>System Status</Link>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div>
            <Text strong style={{ color: '#ffffff', fontSize: 16, display: 'block', marginBottom: 16 }}>
              Contact Info
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MailOutlined style={{ color: '#94a3b8' }} />
                <Text style={{ color: '#94a3b8' }}>support@fjap.edu.vn</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneOutlined style={{ color: '#94a3b8' }} />
                <Text style={{ color: '#94a3b8' }}>+84 28 7300 1886</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EnvironmentOutlined style={{ color: '#94a3b8' }} />
                <Text style={{ color: '#94a3b8' }}>FPT University, Ho Chi Minh City</Text>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        borderTop: '1px solid #334155',
        marginTop: 32,
        paddingTop: 24,
        textAlign: 'center',
      }}>
        <Text style={{ color: '#94a3b8' }}>
          © 2024 FPT Japan Academy Platform. All rights reserved.
        </Text>
      </div>
    </Footer>
  );
};

export default LecturerFooter;
