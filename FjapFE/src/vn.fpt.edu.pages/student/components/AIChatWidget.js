import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Spin, message } from 'antd';
import { SendOutlined, RobotOutlined } from '@ant-design/icons';
import AIApi from '../../../vn.fpt.edu.api/AIApi';

const { TextArea } = Input;
const { Text } = Typography;

const AIChatWidget = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là AI Study Companion. Tôi có thể giúp bạn về bài tập, deadline, môn học và nhiều thứ khác. Hãy hỏi tôi bất cứ điều gì!',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await AIApi.chat(userMessage);
      
      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.response || response.message || 'Xin lỗi, tôi không thể trả lời câu hỏi này.',
        },
      ]);
    } catch (error) {
      console.error('Error chatting with AI:', error);
      message.error('Không thể kết nối với AI. Vui lòng thử lại sau.');
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      className="function-card section-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RobotOutlined className="function-icon" />
          <Text strong>AI Study Companion</Text>
        </div>
      }
      style={{ height: '100%' }}
    >
      <div
        style={{
          height: '400px',
          overflowY: 'auto',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#1890ff' : '#ffffff',
                color: msg.role === 'user' ? '#ffffff' : '#000000',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <Text style={{ color: msg.role === 'user' ? '#ffffff' : '#000000', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </Text>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <Spin size="small" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập câu hỏi của bạn..."
          rows={2}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!inputValue.trim()}
        >
          Gửi
        </Button>
      </div>
    </Card>
  );
};

export default AIChatWidget;

