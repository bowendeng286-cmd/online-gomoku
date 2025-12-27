'use client';

import React, { useState } from 'react';

interface User {
  id: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

interface AuthFormProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const action = isLogin ? 'login' : 'register';
      const body = isLogin 
        ? { action, username, password }
        : { action, username, password, confirmPassword };

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onAuthSuccess(data.user, data.token);
      } else {
        setError(data.error || '操作失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? '登录游戏' : '注册账号'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            五子棋对战平台
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="用户名 (3-20个字符)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={isLogin ? "密码" : "密码 (至少6个字符)"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (!isLogin && password !== confirmPassword)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </form>

        {!isLogin && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">测试账号：</h3>
            <p className="text-xs text-blue-600">用户名: player1, 密码: 123456</p>
            <p className="text-xs text-blue-600">用户名: player2, 密码: 123456</p>
            <p className="text-xs text-blue-600">用户名: test, 密码: test123</p>
          </div>
        )}
      </div>
    </div>
  );
}