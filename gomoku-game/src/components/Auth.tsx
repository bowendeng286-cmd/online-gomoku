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
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
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
  
  const { login, register } = useAuth();

  useEffect(() => {
    // Reset form when switching between login/register
    setErrors({});
    setGeneralError('');
  }, [isLogin]);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!isLogin && value.length < 2) {
          return '用户名至少需要2个字符';
        }
        if (!isLogin && value.length > 50) {
          return '用户名不能超过50个字符';
        }
        if (!isLogin && !/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
          return '用户名只能包含字母、数字、下划线和中文';
        }
        break;
      case 'email':
        if (!value) {
          return '请输入邮箱地址';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return '请输入有效的邮箱地址';
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
      ? ['email', 'password'] 
      : ['username', 'email', 'password', 'confirmPassword'];
    
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
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setGeneralError(result.error || '登录失败，请检查邮箱和密码');
        } else {
          onAuthSuccess();
        }
      } else {
        const result = await register(formData.username, formData.email, formData.password);
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
      email: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
    setGeneralError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'username':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-3 py-4 sm:px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob sm:-top-40 sm:-right-40 sm:w-80 sm:h-80"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 sm:-bottom-40 sm:-left-40 sm:w-80 sm:h-80"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 sm:w-80 sm:h-80"></div>
      </div>

      <div className="relative w-full max-w-md sm:max-w-lg">
        {/* Logo/Title Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-3 transform hover:scale-105 transition-transform duration-200 sm:w-20 sm:h-20 sm:mb-4">
            <svg className="w-8 h-8 text-white sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:text-3xl">
            五子棋对战
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isLogin ? '欢迎回来' : '加入我们'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {!isLogin && (
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
            )}

            <AuthInput
              id="email"
              name="email"
              type="email"
              label="邮箱地址"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={() => handleFieldBlur('email')}
              onFocus={() => setFocusedField('email')}
              error={errors.email}
              focused={focusedField === 'email'}
              icon={getInputIcon('email')}
              required
              placeholder="请输入邮箱地址"
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-start space-x-2 animate-shake sm:px-4 sm:py-3">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm">{generalError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg sm:py-3"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-white sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">{isLogin ? '登录中' : '注册中'}</span>
                </div>
              ) : (
                <span className="text-sm">{isLogin ? '立即登录' : '立即注册'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 text-xs sm:px-4">或</span>
            </div>
          </div>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-xs sm:text-sm transition-colors duration-200 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center sm:mt-6">
          <p className="text-xs text-gray-500">
            登录即表示同意服务条款和隐私政策
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