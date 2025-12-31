'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  role: 'black' | 'white';
  content: string;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  token: string;
  playerRole: 'black' | 'white' | null;
  onSendMessage?: (message: string) => Promise<boolean>;
  initialMessages?: ChatMessage[];
  newMessages?: ChatMessage[];
}

export default function Chat({
  roomId,
  token,
  playerRole,
  onSendMessage,
  initialMessages = [],
  newMessages = []
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 更新新消息
  useEffect(() => {
    if (newMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newUniqueMessages = newMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...newUniqueMessages];
      });
    }
  }, [newMessages]);

  // 初始化消息
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);

    try {
      const success = await onSendMessage?.(trimmed);
      if (success) {
        setInputMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (message: ChatMessage) => {
    return message.role === playerRole;
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>聊天室</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>开始与对手聊天吧！</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${isOwnMessage(message) ? 'message-own' : 'message-opponent'}`}
            >
              <div className="message-header">
                <span className={`message-role message-${message.role}`}>
                  {message.role === 'black' ? '黑方' : '白方'}
                </span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          className="chat-textarea"
          disabled={isSending || !playerRole}
          rows={1}
        />
        <button
          onClick={handleSendMessage}
          disabled={isSending || !inputMessage.trim() || !playerRole}
          className="chat-send-btn"
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
