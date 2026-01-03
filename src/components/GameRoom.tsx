'use client';

import React, { useState, useEffect } from 'react';
import Chat from './Chat';

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  role: 'black' | 'white';
  content: string;
  timestamp: number;
}

interface GameRoomProps {
  roomId: string;
  playerRole: 'black' | 'white' | null;
  opponentJoined: boolean;
  onStartNewGame: () => void;
  onLeaveRoom: () => void;
  onSendMessage?: (message: string) => Promise<boolean>;
  firstHand?: 'black' | 'white';
  gameState?: {
    status: string;
    winner?: string | null;
  };
  newGameVotes?: { black: boolean; white: boolean };
  newGameMessage?: string;
  opponentInfo?: any;
  playerInfo?: any;
  token?: string;
  chatMessages?: ChatMessage[];
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

export default function GameRoom({
  roomId,
  playerRole,
  opponentJoined,
  onStartNewGame,
  onLeaveRoom,
  onSendMessage,
  firstHand = 'black',
  gameState,
  newGameVotes = { black: false, white: false },
  newGameMessage = '',
  opponentInfo,
  playerInfo,
  token,
  chatMessages = []
}: GameRoomProps) {
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

    // 每15秒刷新一次（游戏中不需要太频繁）
    const interval = setInterval(fetchOnlineStats, 15000);

    return () => clearInterval(interval);
  }, [token]);
  return (
    <div className="game-room">
      <style jsx>{`
        .new-game-section {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #dee2e6;
        }
        
        .winner-announcement {
          font-weight: bold;
          color: #28a745;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }
        
        .vote-message {
          background-color: #d1ecf1;
          color: #0c5460;
          padding: 0.5rem;
          border-radius: 0.25rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        .vote-status {
          margin-bottom: 1rem;
        }
        
        .vote-item {
          padding: 0.25rem 0;
          font-size: 0.9rem;
        }
        
        .vote-item.voted {
          color: #28a745;
          font-weight: 500;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .player-details {
          margin-top: 0.5rem;
          font-size: 0.85rem;
        }
        
        .player-name {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.25rem;
        }
        
        .player-elo {
          color: #7f8c8d;
          font-size: 0.8rem;
        }
        
        .online-stats-room {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 1px solid #dee2e6;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .online-stats-room .stats-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .online-stats-room .stats-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }
        
        .online-stats-room .stats-label {
          font-size: 0.75rem;
          color: #6c757d;
          margin-bottom: 0.25rem;
        }
        
        .online-stats-room .stats-value {
          font-size: 1rem;
          font-weight: 600;
        }
        
        .online-stats-room .stats-value.online-users {
          color: #007bff;
        }
        
        .online-stats-room .stats-value.playing {
          color: #28a745;
        }
        
        .online-stats-room .stats-value.matching {
          color: #ffc107;
        }
        
        .online-stats-room .stats-value.rooms {
          color: #6f42c1;
        }
        
        .online-stats-room .stats-loading,
        .online-stats-room .stats-error {
          text-align: center;
          color: #6c757d;
          font-size: 0.9rem;
        }
      `}</style>
      <div className="room-header">
        {/* 在线用户统计 */}
        <div className="online-stats-room">
          <div className="stats-container">
            {statsLoading ? (
              <div className="stats-loading">加载中...</div>
            ) : onlineStats ? (
              <>
                <div className="stats-item">
                  <span className="stats-label">在线</span>
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
                  <span className="stats-label">房间</span>
                  <span className="stats-value rooms">{onlineStats.totalRooms}</span>
                </div>
              </>
            ) : (
              <div className="stats-error">统计不可用</div>
            )}
          </div>
        </div>
        
        <div className="room-info">
          <h3>房间信息</h3>
          <p>房间号: <span className="room-id">{roomId}</span></p>
        </div>
        
        <div className="player-info">
          <div className={`player you ${playerRole || ''}`}>
            <span className="player-label">你</span>
            <span className={`player-role ${playerRole || ''}`}>
              {playerRole ? (playerRole === 'black' ? '黑子' : '白子') : '观察者'}
            </span>
            {playerInfo && (
              <div className="player-details">
                <div className="player-name">{playerInfo.username}</div>
                <div className="player-elo">Elo: {playerInfo.eloRating}</div>
              </div>
            )}
          </div>
          
          <div className={`player opponent ${opponentJoined ? 'joined' : 'waiting'}`}>
            <span className="player-label">对手</span>
            <span className="player-status">
              {opponentJoined ? '已加入' : '等待中...'}
            </span>
            {opponentInfo ? (
              <div className="player-details">
                <div className="player-name">{opponentInfo.username}</div>
                <div className="player-elo">Elo: {opponentInfo.eloRating}</div>
              </div>
            ) : (
              opponentJoined && (
                <div className="player-details">
                  <div className="player-name">对手</div>
                  <div className="player-elo">Elo: 加载中...</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="room-controls">
        {/* New game voting section */}
        {gameState?.status === 'ended' && opponentJoined && (
          <div className="new-game-section">
            <h4>游戏结束</h4>
            {gameState.winner && (
              <p className="winner-announcement">
                {gameState.winner === 'black' ? '黑方' : '白方'}获胜！
              </p>
            )}
            
            {newGameMessage && (
              <div className="vote-message">
                {newGameMessage}
              </div>
            )}
            
            <div className="vote-status">
              <div className={`vote-item ${newGameVotes.black ? 'voted' : ''}`}>
                黑方: {newGameVotes.black ? '✅ 已同意' : '⏳ 等待同意'}
              </div>
              <div className={`vote-item ${newGameVotes.white ? 'voted' : ''}`}>
                白方: {newGameVotes.white ? '✅ 已同意' : '⏳ 等待同意'}
              </div>
            </div>
            
            {/* Only show button for the current player if they haven't voted yet */}
            {playerRole && !newGameVotes[playerRole] && (
              <button 
                className="btn btn-primary" 
                onClick={onStartNewGame}
              >
                同意开始新游戏（换边）
              </button>
            )}
          </div>
        )}
        
        {/* Normal game controls */}
        {gameState?.status !== 'ended' && (
          <button 
            className="btn btn-primary" 
            onClick={onStartNewGame}
            disabled
            title="游戏结束后才能开始新游戏"
          >
            开始新游戏（游戏进行中）
          </button>
        )}
        
        <button
          className="btn btn-secondary"
          onClick={onLeaveRoom}
        >
          离开房间
        </button>
      </div>

      {/* 聊天室 */}
      {token && (
        <Chat
          roomId={roomId}
          token={token}
          playerRole={playerRole}
          onSendMessage={onSendMessage}
          initialMessages={chatMessages}
        />
      )}
    </div>
  );
}