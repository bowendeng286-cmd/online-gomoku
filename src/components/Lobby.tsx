'use client';

import React, { useState, useEffect } from 'react';

interface LobbyProps {
  onCreateRoom: (options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) => void;
  onJoinRoom: (roomId: string) => void;
  onQuickMatch: () => void;
  token?: string;
}

interface OnlineStats {
  totalOnlineUsers: number;
  usersInRooms: number;
  usersInMatchQueue: number;
  idleUsers: number;
  totalRooms: number;
  activeRooms: number;
  waitingRooms: number;
  totalPlayers: number;
  timestamp: number;
}

export default function Lobby({ onCreateRoom, onJoinRoom, onQuickMatch, token }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customRoomId, setCustomRoomId] = useState('');
  const [firstPlayer, setFirstPlayer] = useState<'black' | 'white'>('black');
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim());
    }
  };

  const handleQuickMatch = () => {
    onQuickMatch();
  };

  const fetchOnlineStats = async () => {
    if (!token) return;
    
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/game?action=get_online_stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.type === 'online_stats') {
          setOnlineStats(data.payload);
        }
      }
    } catch (error) {
      console.error('Failed to fetch online stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchOnlineStats();
    const interval = setInterval(fetchOnlineStats, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleCreateRoom = () => {
    const options: { customRoomId?: string; firstPlayer?: 'black' | 'white' } = {};
    
    if (customRoomId.trim()) {
      options.customRoomId = customRoomId.trim().toUpperCase();
    }
    
    options.firstPlayer = firstPlayer;
    
    onCreateRoom(options);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-background">
        <div className="lobby-gradient"></div>
      </div>

      <div className="lobby-content">
        <div className="lobby-header animate-fade-in">
          <div className="lobby-logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
              <path d="M8 16L16 8"/>
            </svg>
          </div>
          <h1 className="lobby-title">
            <span className="text-gradient">五子棋对战</span>
          </h1>
          <p className="lobby-subtitle">在线联机对战平台</p>
        </div>

        <div className="lobby-stats glass-card animate-slide-right">
          <h3 className="stats-title">
            <svg className="stats-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            实时统计
          </h3>
          
          {statsLoading ? (
            <div className="stats-loading">
              <span className="spinner"></span>
              加载中...
            </div>
          ) : onlineStats ? (
            <div className="stats-grid">
              <div className="stat-card stat-online">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{onlineStats.totalOnlineUsers}</div>
                  <div className="stat-label">在线玩家</div>
                </div>
              </div>

              <div className="stat-card stat-playing">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{onlineStats.usersInRooms}</div>
                  <div className="stat-label">游戏中</div>
                </div>
              </div>

              <div className="stat-card stat-matching">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{onlineStats.usersInMatchQueue}</div>
                  <div className="stat-label">匹配中</div>
                </div>
              </div>

              <div className="stat-card stat-rooms">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{onlineStats.totalRooms}</div>
                  <div className="stat-label">房间数</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="stats-error">无法获取统计信息</div>
          )}
        </div>

        <div className="lobby-actions animate-slide-left">
          <div className="action-card glass-card">
            <div className="action-header">
              <div className="action-icon action-icon-create">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="action-info">
                <h3 className="action-title">创建房间</h3>
                <p className="action-desc">创建一个新房间，邀请好友加入对战</p>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-large btn-action"
              onClick={handleCreateRoom}
            >
              立即创建
            </button>

            <button 
              className="btn btn-outline btn-small btn-toggle"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              {showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}
            </button>
            
            {showAdvancedOptions && (
              <div className="advanced-options animate-fade-in">
                <div className="option-group">
                  <label className="option-label">
                    <svg className="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    自定义房间号
                  </label>
                  <input
                    type="text"
                    placeholder="输入自定义房间号（留空自动生成）"
                    value={customRoomId}
                    onChange={(e) => setCustomRoomId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    className="input"
                    maxLength={10}
                  />
                </div>
                
                <div className="option-group">
                  <label className="option-label">
                    <svg className="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    </svg>
                    先手选择
                  </label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="firstPlayer"
                        value="black"
                        checked={firstPlayer === 'black'}
                        onChange={(e) => setFirstPlayer(e.target.value as 'black' | 'white')}
                      />
                      <span className="radio-custom"></span>
                      <span className="radio-text">黑棋先手</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="firstPlayer"
                        value="white"
                        checked={firstPlayer === 'white'}
                        onChange={(e) => setFirstPlayer(e.target.value as 'black' | 'white')}
                      />
                      <span className="radio-custom"></span>
                      <span className="radio-text">白棋先手</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="action-card glass-card">
            <div className="action-header">
              <div className="action-icon action-icon-match">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="action-info">
                <h3 className="action-title">快速匹配</h3>
                <p className="action-desc">随机匹配对手，立即开始游戏</p>
              </div>
            </div>

            <button 
              className="btn btn-secondary btn-large btn-action"
              onClick={handleQuickMatch}
            >
              开始匹配
            </button>
          </div>

          <div className="action-card glass-card">
            <div className="action-header">
              <div className="action-icon action-icon-join">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="action-info">
                <h3 className="action-title">加入房间</h3>
                <p className="action-desc">输入房间号，加入好友的游戏</p>
              </div>
            </div>

            <div className="join-room">
              <input
                type="text"
                placeholder="输入房间号"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="input"
                maxLength={10}
              />
              <button 
                className="btn btn-outline btn-action"
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .lobby-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #f8fafc;
          padding: 1rem;
        }

        .lobby-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .lobby-gradient {
          position: absolute;
          inset: 0;
          background: var(--primary-gradient);
          background-size: 200% 200%;
          animation: gradientMove 15s ease infinite;
          opacity: 0.08;
        }

        .lobby-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .lobby-header {
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .lobby-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: var(--primary-gradient);
          border-radius: 18px;
          margin-bottom: 1rem;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          color: white;
        }

        .lobby-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .lobby-subtitle {
          font-size: 1rem;
          color: #64748b;
        }

        .lobby-stats {
          padding: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .stats-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 1rem;
        }

        .stats-icon {
          width: 22px;
          height: 22px;
          color: var(--primary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: var(--radius-lg);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon svg {
          width: 20px;
          height: 20px;
          color: white;
        }

        .stat-online .stat-icon {
          background: var(--primary-gradient);
        }

        .stat-playing .stat-icon {
          background: var(--success-gradient);
        }

        .stat-matching .stat-icon {
          background: var(--warning-gradient);
        }

        .stat-rooms .stat-icon {
          background: var(--secondary-gradient);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8125rem;
          color: #64748b;
        }

        .stats-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
        }

        .stats-error {
          text-align: center;
          color: #f43f5e;
          font-size: 0.875rem;
        }

        .lobby-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-header {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .action-icon svg {
          width: 24px;
          height: 24px;
          color: white;
        }

        .action-icon-create {
          background: var(--primary-gradient);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
        }

        .action-icon-match {
          background: var(--secondary-gradient);
          box-shadow: 0 6px 20px rgba(118, 75, 162, 0.3);
        }

        .action-icon-join {
          background: var(--success-gradient);
          box-shadow: 0 6px 20px rgba(56, 239, 125, 0.3);
        }

        .action-info {
          flex: 1;
        }

        .action-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.375rem;
        }

        .action-desc {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        .btn-action {
          width: 100%;
        }

        .btn-toggle {
          align-self: flex-start;
          padding: 0.5rem 0.875rem;
          font-size: 0.875rem;
        }

        .advanced-options {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          padding: 1rem;
          background: rgba(102, 126, 234, 0.05);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .option-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
        }

        .option-icon {
          width: 14px;
          height: 14px;
          color: var(--primary);
        }

        .radio-group {
          display: flex;
          gap: 1.25rem;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.8125rem;
          color: #475569;
        }

        .radio-label input {
          display: none;
        }

        .radio-custom {
          width: 16px;
          height: 16px;
          border: 2px solid #cbd5e1;
          border-radius: 50%;
          position: relative;
          transition: all 0.3s ease;
        }

        .radio-label input:checked + .radio-custom {
          border-color: var(--primary);
          background: var(--primary-gradient);
        }

        .radio-label input:checked + .radio-custom::after {
          content: '';
          position: absolute;
          inset: 2.5px;
          background: white;
          border-radius: 50%;
        }

        .radio-text {
          font-weight: 500;
        }

        .join-room {
          display: flex;
          gap: 0.5rem;
        }

        .join-room .input {
          flex: 1;
        }

        .join-room .btn {
          flex-shrink: 0;
        }

        /* Small phones (iPhone SE, etc.) */
        @media (max-width: 375px) {
          .lobby-container {
            padding: 0.5rem;
          }

          .lobby-content {
            gap: 0.875rem;
          }

          .lobby-logo {
            width: 56px;
            height: 56px;
            border-radius: 14px;
          }

          .logo-icon {
            width: 28px;
            height: 28px;
          }

          .lobby-title {
            font-size: 1.5rem;
          }

          .lobby-subtitle {
            font-size: 0.875rem;
          }

          .lobby-stats {
            padding: 1rem;
          }

          .stats-grid {
            gap: 0.5rem;
          }

          .stat-card {
            padding: 0.75rem;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
          }

          .stat-icon svg {
            width: 18px;
            height: 18px;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .stat-label {
            font-size: 0.75rem;
          }

          .action-card {
            padding: 1rem;
          }

          .action-icon {
            width: 40px;
            height: 40px;
          }

          .action-icon svg {
            width: 20px;
            height: 20px;
          }

          .action-title {
            font-size: 1rem;
          }

          .action-desc {
            font-size: 0.8125rem;
          }

          .join-room {
            flex-direction: column;
          }
        }

        /* Large phones (iPhone Pro Max, etc.) */
        @media (min-width: 376px) and (max-width: 430px) {
          .lobby-title {
            font-size: 1.75rem;
          }

          .stats-grid {
            gap: 0.75rem;
          }

          .stat-value {
            font-size: 1.375rem;
          }
        }

        /* Tablets */
        @media (min-width: 431px) and (max-width: 768px) {
          .lobby-container {
            padding: 1.25rem;
          }

          .lobby-content {
            gap: 1.5rem;
          }

          .lobby-logo {
            width: 68px;
            height: 68px;
          }

          .logo-icon {
            width: 34px;
            height: 34px;
          }

          .lobby-title {
            font-size: 2.25rem;
          }

          .lobby-stats {
            padding: 1.75rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .stat-card {
            padding: 1.125rem;
          }

          .stat-icon {
            width: 44px;
            height: 44px;
          }

          .stat-value {
            font-size: 1.625rem;
          }

          .action-card {
            padding: 1.625rem;
          }

          .action-icon {
            width: 52px;
            height: 52px;
          }
        }

        /* Large tablets and small desktops */
        @media (min-width: 769px) and (max-width: 1024px) {
          .lobby-container {
            padding: 1.5rem;
          }

          .lobby-content {
            gap: 1.75rem;
          }

          .lobby-logo {
            width: 72px;
            height: 72px;
          }

          .logo-icon {
            width: 36px;
            height: 36px;
          }

          .lobby-title {
            font-size: 2.25rem;
          }

          .lobby-stats {
            padding: 2rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }

          .lobby-actions {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-card {
            padding: 1.75rem;
          }

          .action-icon {
            width: 56px;
            height: 56px;
          }
        }

        /* Desktop */
        @media (min-width: 1025px) {
          .lobby-container {
            padding: 2rem;
          }

          .lobby-content {
            gap: 2rem;
          }

          .lobby-logo {
            width: 72px;
            height: 72px;
          }

          .logo-icon {
            width: 36px;
            height: 36px;
          }

          .lobby-title {
            font-size: 2.5rem;
          }

          .lobby-stats {
            padding: 2rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .lobby-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          .action-card {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
