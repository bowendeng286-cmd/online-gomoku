'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const winRate = user.gamesPlayed > 0 
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
    : 0;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          <div className="avatar-circle">
            {user.username.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="user-details">
          <div className="username">{user.username}</div>
          <div className="user-stats">
            <span className="elo-rating">Elo: {user.eloRating}</span>
            <span className="win-rate">胜率: {winRate}%</span>
          </div>
        </div>
      </div>
      
      <div className="user-actions">
        <button 
          onClick={handleLogout}
          className="logout-button"
        >
          退出登录
        </button>
      </div>

      <style jsx>{`
        .user-profile {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .user-avatar .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }

        .user-details {
          flex: 1;
        }

        .username {
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .user-stats {
          display: flex;
          gap: 12px;
          font-size: 14px;
        }

        .elo-rating {
          color: #059669;
          font-weight: 500;
        }

        .win-rate {
          color: #6366f1;
          font-weight: 500;
        }

        .user-actions {
          display: flex;
          justify-content: flex-end;
        }

        .logout-button {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .logout-button:hover {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .user-profile {
            padding: 12px;
          }
          
          .user-info {
            gap: 8px;
          }
          
          .user-avatar .avatar-circle {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
          
          .username {
            font-size: 14px;
          }
          
          .user-stats {
            gap: 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}