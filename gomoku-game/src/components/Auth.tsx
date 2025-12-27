'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        } else {
          onAuthSuccess();
        }
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        if (formData.username.length < 3) {
          setError('Username must be at least 3 characters');
          return;
        }
        
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }

        const result = await register(formData.username, formData.email, formData.password);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else {
          onAuthSuccess();
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? '欢迎回来' : '加入游戏'}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? '登录到您的账户开始游戏' : '创建新账户开始五子棋对战'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                minLength={3}
                maxLength={50}
                placeholder="请输入用户名"
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="请输入邮箱"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              placeholder={isLogin ? "请输入密码" : "请输入至少6位密码"}
              className="form-input"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                placeholder="请再次输入密码"
                className="form-input"
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isLogin ? '登录中...' : '注册中...'}
              </div>
            ) : (
              isLogin ? '登录' : '注册'
            )}
          </button>
        </form>

        <div className="auth-toggle">
          <span>
            {isLogin ? '还没有账户？' : '已有账户？'}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="toggle-button"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </div>
  );

  // Add styles
  return (
    <style jsx>{`
      .auth-container {
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
      }

      .auth-card {
        background: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .auth-title {
        font-size: 28px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
      }

      .auth-subtitle {
        color: #6b7280;
        font-size: 16px;
        margin: 0;
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group label {
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }

      .form-input {
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .form-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .error-message {
        background: #fef2f2;
        color: #ef4444;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        border: 1px solid #fecaca;
      }

      .auth-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-top: 8px;
      }

      .auth-button:hover:not(:disabled) {
        background: #2563eb;
      }

      .auth-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .auth-toggle {
        text-align: center;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
        font-size: 14px;
        color: #6b7280;
      }

      .toggle-button {
        background: none;
        border: none;
        color: #3b82f6;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        margin-left: 4px;
      }

      .toggle-button:hover {
        color: #2563eb;
      }

      @media (max-width: 480px) {
        .auth-container {
          max-width: 100%;
          padding: 0 16px;
        }
        
        .auth-card {
          padding: 24px;
        }
        
        .auth-title {
          font-size: 24px;
        }
      }
    `}</style>
  );
}