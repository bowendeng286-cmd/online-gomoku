'use client';

import React from 'react';
import Auth from '@/components/Auth';
import { AuthProvider } from '@/contexts/AuthContext';

export default function TestPage() {
  const handleAuthSuccess = () => {
    alert('认证成功！');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-50">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    </AuthProvider>
  );
}