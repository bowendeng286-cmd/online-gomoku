'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GameHistory {
  id: number;
  roomId: string;
  opponent: string;
  playerColor: 'black' | 'white';
  result: 'win' | 'loss' | 'draw';
  date: string;
  duration: number | null;
}

interface UserStats {
  userId: number;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  recentGames: GameHistory[];
}

export default function GameStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      setError('获取战绩数据失败');
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return '未知';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const getResultIcon = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return '🏆';
      case 'loss':
        return '😔';
      case 'draw':
        return '🤝';
    }
  };

  const getResultText = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return '胜利';
      case 'loss':
        return '失败';
      case 'draw':
        return '平局';
    }
  };

  const getResultColor = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return '#10b981';
      case 'loss':
        return '#ef4444';
      case 'draw':
        return '#f59e0b';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="game-stats">
        <div className="stats-message">
          请先登录查看战绩
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="game-stats">
        <div className="loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p>加载战绩中...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="game-stats">
        <div className="error-message">
          {error || '无法加载战绩数据'}
        </div>
      </div>
    );
  }

  return (
    <div className="game-stats">
      <div className="stats-header">
        <h2>游戏战绩</h2>
        <button onClick={fetchStats} className="refresh-button">
          刷新
        </button>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-value">{stats.eloRating}</div>
          <div className="stat-label">Elo等级分</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.gamesPlayed}</div>
          <div className="stat-label">总局数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.winRate}%</div>
          <div className="stat-label">胜率</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">当前连胜</div>
        </div>
      </div>

      <div className="detailed-stats">
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-number win">{stats.gamesWon}</span>
            <span className="stat-text">胜利</span>
          </div>
          <div className="stat-item">
            <span className="stat-number loss">{stats.gamesLost}</span>
            <span className="stat-text">失败</span>
          </div>
          <div className="stat-item">
            <span className="stat-number draw">{stats.gamesDrawn}</span>
            <span className="stat-text">平局</span>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-number">{stats.bestStreak}</span>
            <span className="stat-text">最佳连胜</span>
          </div>
        </div>
      </div>

      <div className="recent-games">
        <h3>最近对局</h3>
        {stats.recentGames.length === 0 ? (
          <p className="no-games">暂无对局记录</p>
        ) : (
          <div className="games-list">
            {stats.recentGames.map((game) => (
              <div key={game.id} className="game-item">
                <div className="game-result">
                  <span className="result-icon">{getResultIcon(game.result)}</span>
                  <span 
                    className="result-text"
                    style={{ color: getResultColor(game.result) }}
                  >
                    {getResultText(game.result)}
                  </span>
                </div>
                <div className="game-details">
                  <div className="opponent">对手: {game.opponent}</div>
                  <div className="game-info">
                    <span className="color">
                      {game.playerColor === 'black' ? '⚫ 黑棋' : '⚪ 白棋'}
                    </span>
                    <span className="duration">{formatDuration(game.duration)}</span>
                  </div>
                  <div className="date">{formatDate(game.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .game-stats {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .stats-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .refresh-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }

        .refresh-button:hover {
          background: #2563eb;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }

        .detailed-stats {
          margin-bottom: 24px;
        }

        .stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .stat-item {
          flex: 1;
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .stat-number.win {
          color: #10b981;
        }

        .stat-number.loss {
          color: #ef4444;
        }

        .stat-number.draw {
          color: #f59e0b;
        }

        .stat-text {
          font-size: 14px;
          color: #6b7280;
        }

        .recent-games h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .no-games {
          color: #6b7280;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }

        .games-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .game-item {
          display: flex;
          gap: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 4px solid #e5e7eb;
        }

        .game-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .result-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .result-text {
          font-size: 12px;
          font-weight: 500;
        }

        .game-details {
          flex: 1;
        }

        .opponent {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .game-info {
          display: flex;
          gap: 12px;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .color {
          font-weight: 500;
        }

        .date {
          font-size: 12px;
          color: #9ca3af;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6b7280;
        }

        .loading p {
          margin-top: 12px;
        }

        .stats-message,
        .error-message {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .error-message {
          color: #ef4444;
        }

        @media (max-width: 640px) {
          .game-stats {
            padding: 16px;
          }

          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .stat-card {
            padding: 12px;
          }

          .stat-value {
            font-size: 20px;
          }

          .stats-row {
            flex-direction: column;
            gap: 8px;
          }

          .game-item {
            gap: 12px;
            padding: 10px;
          }

          .game-info {
            flex-direction: column;
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
}