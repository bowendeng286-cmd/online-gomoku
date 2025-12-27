'use client';

import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthLevel {
  label: string;
  color: string;
  width: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrengthLevel = (): StrengthLevel => {
    if (!password) return { label: '', color: 'bg-gray-200', width: '0%' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { label: '弱', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { label: '中等', color: 'bg-yellow-500', width: '66%' };
    return { label: '强', color: 'bg-green-500', width: '100%' };
  };

  const strength = getStrengthLevel();

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">密码强度</span>
        <span className={`text-xs font-medium ${
          strength.color === 'bg-red-500' ? 'text-red-600' :
          strength.color === 'bg-yellow-500' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: strength.width }}
        />
      </div>
    </div>
  );
}