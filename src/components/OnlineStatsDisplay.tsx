'use client';

import React, { useState, useEffect } from 'react';

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

interface OnlineStatsDisplayProps {
  token?: string;
  compact?: boolean;
}

export default function OnlineStatsDisplay({ token, compact = false }: OnlineStatsDisplayProps) {
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // 获取在线用户统计
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
          setLastUpdate(Date.now());
        }
      }
    } catch (error) {
      console.error('Failed to fetch online stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 定时刷新在线统计
  useEffect(() => {
    if (!token) return;

    // 立即获取一次
    fetchOnlineStats();

    // 根据是否紧凑模式调整刷新频率
    const interval = setInterval(fetchOnlineStats, compact ? 15000 : 10000);

    return () => clearInterval(interval);
  }, [token, compact]);

  if (compact) {
    return (
      <div className="online-stats-compact">
        {statsLoading ? (
          <div className="stats-loading-compact">加载中...</div>
        ) : onlineStats ? (
          <div className="stats-compact">
            <div className="stats-item-compact">
              <span className="stats-label-compact">在线</span>
              <span className="stats-value-compact online-users">{onlineStats.totalOnlineUsers}</span>
            </div>
            <div className="stats-item-compact">
              <span className="stats-label-compact">匹配中</span>
              <span className="stats-value-compact matching">{onlineStats.usersInMatchQueue}</span>
            </div>
            <div className="stats-item-compact">
              <span className="stats-label-compact">游戏中</span>
              <span className="stats-value-compact playing">{onlineStats.usersInRooms}</span>
            </div>
          </div>
        ) : (
          <div className="stats-error-compact">获取失败</div>
        )}
      </div>
    );
  }

  return (
    <div className="online-stats">
      {statsLoading ? (
        <div className="stats-loading">加载中...</div>
      ) : onlineStats ? (
        <div className="stats-content">
          <div className="stats-item">
            <span className="stats-label">在线玩家</span>
            <span className="stats-value online-users">{onlineStats.totalOnlineUsers}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">游戏中</span>
            <span className="stats-value playing">{onlineStats.usersInRooms}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">匹配中</span>
            <span className="stats-value matching">{onlineStats.usersInMatchQueue}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">房间数</span>
            <span className="stats-value rooms">{onlineStats.totalRooms}</span>
          </div>
        </div>
      ) : (
        <div className="stats-error">无法获取统计信息</div>
      )}
    </div>
  );
}