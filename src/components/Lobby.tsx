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

    // 每10秒刷新一次
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
    <div className="lobby">
      <div className="lobby-header">
        <h1 className="game-title">五子棋对战</h1>
        <p className="game-subtitle">在线联机对战</p>
        
        {/* 在线用户统计 */}
        <div className="online-stats">
          <div className="stats-container">
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
        </div>
      </div>

      <div className="lobby-actions">
        <div className="action-group">
          <button 
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
          >
            创建房间
          </button>
          <p className="action-desc">创建一个新房间，邀请好友加入</p>
          
          <button 
            className="btn btn-outline btn-small"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}
          </button>
          
          {showAdvancedOptions && (
            <div className="advanced-options">
              <div className="option-group">
                <label>自定义房间号（可选）：</label>
                <input
                  type="text"
                  placeholder="输入自定义房间号"
                  value={customRoomId}
                  onChange={(e) => setCustomRoomId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="input-custom-room"
                  maxLength={10}
                />
                <small>留空将自动生成房间号</small>
              </div>
              
              <div className="option-group">
                <label>先手选择：</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="firstPlayer"
                      value="black"
                      checked={firstPlayer === 'black'}
                      onChange={(e) => setFirstPlayer(e.target.value as 'black' | 'white')}
                    />
                    黑棋先手（默认）
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="firstPlayer"
                      value="white"
                      checked={firstPlayer === 'white'}
                      onChange={(e) => setFirstPlayer(e.target.value as 'black' | 'white')}
                    />
                    白棋先手
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="action-group">
          <button 
            className="btn btn-secondary btn-large"
            onClick={handleQuickMatch}
          >
            快速匹配
          </button>
          <p className="action-desc">随机匹配对手，立即开始游戏</p>
        </div>

        <div className="action-group">
          <div className="join-room">
            <input
              type="text"
              placeholder="输入房间号"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="input-room"
            />
            <button 
              className="btn btn-outline"
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
            >
              加入房间
            </button>
          </div>
          <p className="action-desc">输入好友的房间号加入游戏</p>
        </div>
      </div>
    </div>
  );
}