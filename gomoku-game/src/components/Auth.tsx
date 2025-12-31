'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthInput from './AuthInput';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const { login, register, guestLogin } = useAuth();

  useEffect(() => {
    // Reset form when switching between login/register
    setErrors({});
    setGeneralError('');
  }, [isLogin]);

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
    
    // Clear errors for this field
    setErrors(prev => ({ ...prev, [name]: '' }));
    setGeneralError('');
    
    // Real-time validation
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleFieldBlur = (name: string) => {
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error }));
    setFocusedField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate all fields
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

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'username':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'password':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'confirmPassword':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-200">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            五子棋对战
          </h1>
          <p className="text-gray-600">
            {isLogin ? '欢迎回来，继续你的精彩对局' : '加入我们，开启五子棋之旅'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AuthInput
              id="username"
              name="username"
              type="text"
              label="用户名"
              value={formData.username}
              onChange={handleInputChange}
              onBlur={() => handleFieldBlur('username')}
              onFocus={() => setFocusedField('username')}
              error={errors.username}
              focused={focusedField === 'username'}
              icon={getInputIcon('username')}
              required
              minLength={2}
              maxLength={50}
              placeholder="请输入用户名"
              disabled={loading}
            />

            <div className="space-y-2">
              <AuthInput
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="密码"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur('password')}
                onFocus={() => setFocusedField('password')}
                error={errors.password}
                focused={focusedField === 'password'}
                icon={getInputIcon('password')}
                required
                minLength={6}
                placeholder={isLogin ? "请输入密码" : "请输入至少6位密码"}
                disabled={loading}
              />
              {!isLogin && (
                <PasswordStrength password={formData.password} />
              )}
            </div>

            {!isLogin && (
              <AuthInput
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                label="确认密码"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur('confirmPassword')}
                onFocus={() => setFocusedField('confirmPassword')}
                error={errors.confirmPassword}
                focused={focusedField === 'confirmPassword'}
                icon={getInputIcon('confirmPassword')}
                required
                minLength={6}
                placeholder="请再次输入密码"
                disabled={loading}
              />
            )}

            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2 animate-shake">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{generalError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{isLogin ? '登录中...' : '注册中...'}</span>
                </div>
              ) : (
                <span>{isLogin ? '立即登录' : '立即注册'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或</span>
            </div>
          </div>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors duration-200 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
            </button>
          </div>
        </div>

        {/* Guest Login Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading || isSubmitting}
            className="w-full flex items-center justify-center py-3 px-4 border-2 border-indigo-200 text-sm font-medium rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>游客登录</span>
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">
            游客账号在3分钟无活动后将自动销毁
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            登录即表示同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}