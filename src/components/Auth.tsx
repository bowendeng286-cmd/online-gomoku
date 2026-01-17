'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PasswordStrength from './PasswordStrength';

interface AuthProps {
  onAuthSuccess: () => void;
}

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register, guestLogin } = useAuth();

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (value.length < 2) {
          return '用户名至少需要2个字符';
        }
        if (value.length > 50) {
          return '用户名不能超过50个字符';
        }
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
          return '用户名只能包含字母、数字、下划线和中文';
        }
        break;
      case 'password':
        if (!value) {
          return '请输入密码';
        }
        if (value.length < 6) {
          return '密码至少需要6个字符';
        }
        break;
      case 'confirmPassword':
        if (!isLogin && !value) {
          return '请确认密码';
        }
        if (!isLogin && value !== formData.password) {
          return '两次输入的密码不一致';
        }
        break;
    }
    return '';
  }, [isLogin, formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    setErrors(prev => ({ ...prev, [name]: '' }));
    setGeneralError('');
    
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleFieldBlur = (name: string) => {
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    const newErrors: FormErrors = {};
    const fields = isLogin 
      ? ['username', 'password'] 
      : ['username', 'password', 'confirmPassword'];
    
    fields.forEach(field => {
      const error = validateField(field, formData[field as keyof FormData]);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    setGeneralError('');

    try {
      if (isLogin) {
        const result = await login(formData.username, formData.password);
        if (!result.success) {
          setGeneralError(result.error || '登录失败，请检查用户名和密码');
        } else {
          onAuthSuccess();
        }
      } else {
        const result = await register(formData.username, formData.password);
        if (!result.success) {
          setGeneralError(result.error || '注册失败，请重试');
        } else {
          onAuthSuccess();
        }
      }
    } catch (error) {
      setGeneralError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
    setGeneralError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleGuestLogin = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setLoading(true);
    setGeneralError('');

    try {
      const result = await guestLogin();
      if (!result.success) {
        setGeneralError(result.error || '游客登录失败，请重试');
      } else {
        onAuthSuccess();
      }
    } catch (error) {
      setGeneralError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-gradient"></div>
        <div className="auth-pattern"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card glass-card animate-fade-in">
          <div className="auth-header">
            <div className="auth-logo animate-float">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                <path d="M8 16L16 8"/>
              </svg>
            </div>
            <h1 className="auth-title">
              <span className="text-gradient">五子棋对战</span>
            </h1>
            <p className="auth-subtitle">在线联机对战平台</p>
          </div>

          {generalError && (
            <div className="alert alert-error animate-fade-in">
              <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <svg className="form-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                用户名
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur('username')}
                className={`input input-auth ${errors.username ? 'input-error' : ''}`}
                placeholder="请输入用户名"
                autoComplete="username"
              />
              {errors.username && (
                <div className="form-error animate-fade-in">
                  <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.username}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <svg className="form-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                密码
              </label>
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('password')}
                  className={`input input-auth ${errors.password ? 'input-error' : ''}`}
                  placeholder="请输入密码"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-toggle"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="form-error animate-fade-in">
                  <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.password}
                </div>
              )}
              {!isLogin && formData.password && (
                <PasswordStrength password={formData.password} />
              )}
            </div>

            {!isLogin && (
              <div className="form-group animate-fade-in">
                <label className="form-label">
                  <svg className="form-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  确认密码
                </label>
                <div className="input-group">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    className={`input input-auth ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="input-toggle"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="form-error animate-fade-in">
                    <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.confirmPassword}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-large btn-auth"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {isLogin ? '登录中...' : '注册中...'}
                </>
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>

            <div className="auth-divider">
              <span className="auth-divider-text">或</span>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="btn btn-secondary btn-large btn-auth"
              disabled={loading}
            >
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              游客登录
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              {isLogin ? '还没有账号？' : '已有账号？'}
              <button
                type="button"
                onClick={toggleMode}
                className="auth-toggle"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #f8fafc;
        }

        .auth-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .auth-gradient {
          position: absolute;
          inset: 0;
          background: var(--primary-gradient);
          background-size: 200% 200%;
          animation: gradientMove 15s ease infinite;
          opacity: 0.1;
        }

        .auth-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(245, 87, 108, 0.1) 0%, transparent 50%);
        }

        .auth-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          padding: 1rem;
        }

        .auth-card {
          padding: 2.5rem 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: var(--primary-gradient);
          border-radius: 20px;
          margin-bottom: 1.25rem;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          color: white;
        }

        .auth-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .auth-subtitle {
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 400;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
        }

        .alert-error {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .alert-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
        }

        .form-label-icon {
          width: 16px;
          height: 16px;
          color: #64748b;
        }

        .input-auth {
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid #e2e8f0;
          padding: 0.875rem 1rem;
          transition: all 0.3s ease;
          font-size: 0.9375rem;
        }

        .input-auth:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .input-auth::placeholder {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-group .input {
          padding-right: 2.75rem;
        }

        .input-toggle {
          position: absolute;
          right: 0.875rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: color 0.3s ease;
        }

        .input-toggle:hover {
          color: var(--primary);
        }

        .toggle-icon {
          width: 18px;
          height: 18px;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f43f5e;
          font-size: 0.75rem;
        }

        .error-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .btn-auth {
          margin-top: 0.5rem;
          padding: 0.875rem 1.25rem;
          font-size: 1rem;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 0.25rem 0;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .auth-divider-text {
          color: #94a3b8;
          font-size: 0.8125rem;
        }

        .auth-footer {
          margin-top: 1.5rem;
          text-align: center;
        }

        .auth-footer-text {
          color: #64748b;
          font-size: 0.875rem;
        }

        .auth-toggle {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-left: 0.25rem;
          transition: color 0.3s ease;
          font-size: 0.875rem;
        }

        .auth-toggle:hover {
          color: var(--primary-dark);
        }

        /* Small phones (iPhone SE, etc.) */
        @media (max-width: 375px) {
          .auth-content {
            padding: 0.5rem;
          }

          .auth-card {
            padding: 1.5rem 1rem;
          }

          .auth-logo {
            width: 60px;
            height: 60px;
            border-radius: 16px;
          }

          .logo-icon {
            width: 30px;
            height: 30px;
          }

          .auth-title {
            font-size: 1.5rem;
          }

          .auth-subtitle {
            font-size: 0.875rem;
          }

          .auth-form {
            gap: 1rem;
          }

          .btn-auth {
            padding: 0.75rem 1rem;
            font-size: 0.9375rem;
          }
        }

        /* Large phones (iPhone Pro Max, etc.) */
        @media (min-width: 376px) and (max-width: 430px) {
          .auth-content {
            padding: 0.75rem;
          }

          .auth-card {
            padding: 2rem 1.5rem;
          }

          .auth-title {
            font-size: 1.75rem;
          }
        }

        /* Tablets */
        @media (min-width: 641px) and (max-width: 768px) {
          .auth-content {
            padding: 1.25rem;
          }

          .auth-card {
            padding: 2.5rem 2.25rem;
          }

          .auth-logo {
            width: 76px;
            height: 76px;
          }

          .auth-title {
            font-size: 2rem;
          }
        }

        /* Desktop */
        @media (min-width: 769px) {
          .auth-content {
            padding: 2rem;
          }

          .auth-card {
            padding: 3rem 2.5rem;
          }

          .auth-logo {
            width: 80px;
            height: 80px;
          }

          .logo-icon {
            width: 40px;
            height: 40px;
          }

          .auth-title {
            font-size: 2rem;
          }

          .auth-form {
            gap: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
