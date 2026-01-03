'use client';

import React, { forwardRef } from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  focused?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, focused, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={`block w-full ${
              icon ? 'pl-10' : 'pl-3'
            } pr-3 py-3 border border-gray-300 rounded-lg transition-all duration-200 ${
              focused 
                ? 'border-indigo-500 ring-2 ring-indigo-200' 
                : 'hover:border-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
            } ${className}`}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;