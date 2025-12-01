import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Spin, message } from 'antd';
import { SendOutlined, RobotOutlined, CloseOutlined, MessageOutlined } from '@ant-design/icons';
import AIApi from '../../../vn.fpt.edu.api/AIApi';
import './FloatingAIChatWidget.css';

const { TextArea } = Input;
const { Text } = Typography;

const FloatingAIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am AI Study Companion. I can help you with homework, deadlines, subjects, and many other things. Ask me anything!',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input when chat opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [messages, isOpen]);

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
          content: response.response || response.message || 'Sorry, I cannot answer this question.',
        },
      ]);
    } catch (error) {
      console.error('Error chatting with AI:', error);
      message.error('Unable to connect to AI. Please try again later.');
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, an error occurred while processing your question. Please try again later.',
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

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button */}
      <div className="floating-chat-button" onClick={toggleChat}>
        {isOpen ? (
          <CloseOutlined style={{ fontSize: '24px', color: '#fff' }} />
        ) : (
          <>
            <MessageOutlined style={{ fontSize: '24px', color: '#fff' }} />
            <span className="chat-badge">AI</span>
          </>
        )}
      </div>

      {/* Chat Box */}
      <div className={`floating-chat-box ${isOpen ? 'open' : ''}`}>
        <Card
          className="chat-card"
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                <Text strong>AI Study Companion</Text>
              </div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={toggleChat}
                style={{ padding: 0, minWidth: 'auto' }}
              />
            </div>
          }
          variant="borderless"
        >
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
              >
                <div className="message-bubble">
                  <Text style={{ color: msg.role === 'user' ? '#ffffff' : '#000000', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Text>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message ai-message">
                <div className="message-bubble">
                  <Spin size="small" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-container">
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your question..."
              rows={2}
              disabled={loading}
              className="chat-input"
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={!inputValue.trim()}
              className="chat-send-button"
            >
              Send
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
};

export default FloatingAIChatWidget;

