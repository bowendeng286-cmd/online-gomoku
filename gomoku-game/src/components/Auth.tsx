'use client';

import React, { useState, useEffect } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [touchedFields, setTouchedFields] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  
  const { login, register } = useAuth();

  useEffect(() => {
    // Add entrance animation
    const timer = setTimeout(() => setIsAnimating(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value && touchedFields.username) return '用户名不能为空';
        if (value.length < 3) return '用户名至少需要3个字符';
        if (value.length > 50) return '用户名不能超过50个字符';
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) return '用户名只能包含字母、数字、下划线和中文';
        return '';
      
      case 'email':
        if (!value && touchedFields.email) return '邮箱不能为空';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return '请输入有效的邮箱地址';
        return '';
      
      case 'password':
        if (!value && touchedFields.password) return '密码不能为空';
        if (value.length < 6) return '密码至少需要6个字符';
        if (value.length > 100) return '密码不能超过100个字符';
        if (!/(?=.*[a-zA-Z])/.test(value)) return '密码至少包含一个字母';
        if (!/(?=.*\d)/.test(value)) return '密码至少包含一个数字';
        return '';
      
      case 'confirmPassword':
        if (!isLogin) {
          if (!value && touchedFields.confirmPassword) return '请确认密码';
          if (value !== formData.password) return '两次输入的密码不一致';
        }
        return '';
      
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear global error when user types
    setError('');
    
    // Validate field in real-time if it has been touched
    if (touchedFields[name as keyof typeof touchedFields]) {
      const fieldError = validateField(name, value);
      setFieldErrors({
        ...fieldErrors,
        [name]: fieldError
      });
    }
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouchedFields({
      ...touchedFields,
      [name]: true
    });
    
    const fieldError = validateField(name, formData[name as keyof typeof formData]);
    setFieldErrors({
      ...fieldErrors,
      [name]: fieldError
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate all fields before submission
    const allTouched = Object.keys(touchedFields).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {} as typeof touchedFields);
    setTouchedFields(allTouched);

    const newFieldErrors = {
      username: validateField('username', formData.username),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword)
    };
    setFieldErrors(newFieldErrors);

    // Check if there are any validation errors
    const hasValidationErrors = Object.values(newFieldErrors).some(error => error !== '');
    if (hasValidationErrors) {
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.error || '登录失败');
        } else {
          onAuthSuccess();
        }
      } else {
        const result = await register(formData.username, formData.email, formData.password);
        if (!result.success) {
          setError(result.error || '注册失败');
        } else {
          onAuthSuccess();
        }
      }
    } catch (error) {
      setError('发生未知错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setError('');
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setFieldErrors({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setTouchedFields({
        username: false,
        email: false,
        password: false,
        confirmPassword: false
      });
      setIsAnimating(true);
    }, 300);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-pattern"></div>
      </div>
      
      <div className={`auth-card ${isAnimating ? 'animate-in' : ''}`}>
        <div className="auth-header">
          <div className="auth-icon">
            <div className="icon-gomoku"></div>
          </div>
          <h1 className="auth-title">
            {isLogin ? '欢迎回来' : '加入游戏'}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? '登录账户，开始精彩的五子棋对战' : '创建账户，体验最有趣的在线五子棋'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">
                <span className="label-icon">👤</span>
                用户名
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                required
                minLength={3}
                maxLength={50}
                placeholder="请输入3-50位用户名"
                className={`form-input ${fieldErrors.username ? 'input-error' : ''}`}
              />
              {fieldErrors.username && (
                <div className="field-error">{fieldErrors.username}</div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">✉️</span>
              邮箱
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
              placeholder="请输入邮箱地址"
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
            />
            {fieldErrors.email && (
              <div className="field-error">{fieldErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔒</span>
              密码
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                required
                minLength={6}
                placeholder={isLogin ? "请输入密码" : "请输入至少6位密码，包含字母和数字"}
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="field-error">{fieldErrors.password}</div>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <span className="label-icon">🔒</span>
                确认密码
              </label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                  minLength={6}
                  placeholder="请再次输入密码"
                  className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <div className="field-error">{fieldErrors.confirmPassword}</div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
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
                <div className="loading-spinner"></div>
                {isLogin ? '登录中...' : '注册中...'}
              </div>
            ) : (
              <>
                <span className="button-icon">{isLogin ? '🎮' : '🚀'}</span>
                {isLogin ? '立即登录' : '立即注册'}
              </>
            )}
          </button>
        </form>

        <div className="auth-toggle">
          <span className="toggle-text">
            {isLogin ? '还没有账户？' : '已有账户？'}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="toggle-button"
          >
            {isLogin ? '免费注册' : '立即登录'}
          </button>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <span>等级对战</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>快速匹配</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>战绩统计</span>
          </div>
        </div>
      </div>
    </div>
  );
}