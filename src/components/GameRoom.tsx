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
    const interval = setInterval(fetchOnlineStats, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const gameEnded = gameState?.status === 'ended';
  const winner = gameState?.winner;
  const isWinner = winner === playerRole;

  return (
    <div className="game-room-container">
      <div className="game-room-background">
        <div className="game-gradient"></div>
      </div>

      <div className="game-room-content">
        <div className="game-header glass-card animate-fade-in">
          <div className="room-info">
            <div className="room-badge">
              <svg className="room-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              房间: <span className="room-id">{roomId}</span>
            </div>
          </div>

          <div className="game-actions">
            <button className="btn btn-outline btn-small" onClick={onLeaveRoom}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              离开房间
            </button>
          </div>
        </div>

        <div className="game-main">
          <div className="players-panel glass-card animate-slide-left">
            <div className={`player-card player-${playerRole} ${playerRole === 'black' ? 'player-black' : 'player-white'}`}>
              <div className={`player-avatar avatar-${playerRole}`}>
                {playerInfo?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="player-info">
                <div className="player-name">{playerInfo?.username || '玩家'}</div>
                <div className="player-role">
                  {playerRole === 'black' ? '黑棋' : '白棋'}
                  {isWinner && gameEnded && (
                    <span className="winner-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      获胜
                    </span>
                  )}
                </div>
                {playerInfo?.elo !== undefined && (
                  <div className="player-elo">等级分: {playerInfo.elo}</div>
                )}
              </div>
            </div>

            <div className="vs-divider">
              <div className="vs-badge">VS</div>
            </div>

            <div className={`player-card player-opponent ${opponentInfo?.role === 'black' ? 'player-black' : 'player-white'}`}>
              <div className={`player-avatar avatar-${opponentInfo?.role || 'black'}`}>
                {opponentJoined 
                  ? (opponentInfo?.username?.[0]?.toUpperCase() || 'O')
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                }
              </div>
              <div className="player-info">
                <div className="player-name">
                  {opponentJoined ? (opponentInfo?.username || '对手') : '等待对手...'}
                </div>
                <div className="player-role">
                  {opponentJoined ? (opponentInfo?.role === 'black' ? '黑棋' : '白棋') : '---'}
                  {!isWinner && gameEnded && winner && (
                    <span className="winner-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      获胜
                    </span>
                  )}
                </div>
                {opponentJoined && opponentInfo?.elo !== undefined && (
                  <div className="player-elo">等级分: {opponentInfo.elo}</div>
                )}
              </div>
            </div>

            {gameEnded && (
              <div className="game-result-panel animate-fade-in">
                <div className="result-message">
                  {winner === 'black' ? '黑棋' : '白棋'}获胜！
                </div>
                <button className="btn btn-primary btn-small btn-new-game" onClick={onStartNewGame}>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  再来一局
                </button>
              </div>
            )}

            {!opponentJoined && (
              <div className="waiting-panel">
                <div className="waiting-spinner">
                  <span className="spinner"></span>
                </div>
                <div className="waiting-text">等待玩家加入...</div>
                <div className="waiting-room-id">
                  房间号: <span className="room-id-highlight">{roomId}</span>
                </div>
              </div>
            )}
          </div>

          <div className="game-board-section">
            {gameEnded && (
              <div className="game-overlay game-ended-overlay animate-fade-in">
                <div className="overlay-content">
                  <div className="overlay-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="overlay-title">
                    {winner === 'black' ? '黑棋' : '白棋'}获胜！
                  </div>
                  <button className="btn btn-primary btn-large" onClick={onStartNewGame}>
                    再来一局
                  </button>
                </div>
              </div>
            )}

            <div className="game-board-wrapper">
              <div className="game-status-bar glass-card">
                {gameState?.status === 'playing' && (
                  <div className="status-playing">
                    <span className={`turn-dot turn-${playerRole === 'black' ? 'white' : 'black'} ${playerRole === 'black' ? 'turn-white' : 'turn-black'}`}></span>
                    <span className="status-text">当前回合: <strong>{playerRole === 'black' ? '白棋' : '黑棋'}</strong></span>
                  </div>
                )}
                {gameState?.status === 'waiting' && (
                  <div className="status-waiting">
                    <span className="spinner"></span>
                    等待玩家加入...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="chat-panel glass-card animate-slide-right">
            <div className="chat-header">
              <svg className="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              对话聊天
            </div>
            <Chat 
              roomId={roomId}
              token={token || ''}
              playerRole={playerRole}
              onSendMessage={onSendMessage}
              initialMessages={chatMessages}
              newMessages={[]}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .game-room-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }

        .game-room-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .game-gradient {
          position: absolute;
          inset: 0;
          background: var(--primary-gradient);
          background-size: 200% 200%;
          animation: gradientMove 15s ease infinite;
          opacity: 0.05;
        }

        .game-room-content {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          gap: 1rem;
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
        }

        .room-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .room-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: var(--radius-lg);
          color: var(--primary);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .room-icon {
          width: 18px;
          height: 18px;
        }

        .room-id {
          font-family: 'Courier New', monospace;
          font-weight: 700;
        }

        .game-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .game-main {
          flex: 1;
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          gap: 1rem;
          min-height: 0;
        }

        .players-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .player-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.9);
          transition: all 0.3s ease;
        }

        .player-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .player-black {
          border-left: 4px solid #1a1a1a;
        }

        .player-white {
          border-left: 4px solid #ffffff;
        }

        .player-avatar {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .avatar-black {
          background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%);
        }

        .avatar-white {
          background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
          color: #1a1a1a;
          border: 2px solid #e2e8f0;
        }

        .player-info {
          flex: 1;
          min-width: 0;
        }

        .player-name {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
          font-size: 1rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-role {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .player-role.black {
          color: #1a1a1a;
        }

        .player-role.white {
          color: #64748b;
        }

        .winner-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: var(--success-gradient);
          color: white;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }

        .winner-badge svg {
          width: 12px;
          height: 12px;
        }

        .player-elo {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .vs-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0;
        }

        .vs-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .game-result-panel {
          padding: 1.25rem;
          background: rgba(56, 239, 125, 0.1);
          border: 1px solid rgba(56, 239, 125, 0.2);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .result-message {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--success);
          margin-bottom: 1rem;
        }

        .btn-new-game {
          width: 100%;
        }

        .waiting-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          text-align: center;
        }

        .waiting-spinner {
          width: 48px;
          height: 48px;
        }

        .waiting-spinner .spinner {
          width: 100%;
          height: 100%;
          border-width: 3px;
        }

        .waiting-text {
          font-size: 0.9rem;
          color: #64748b;
        }

        .waiting-room-id {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .room-id-highlight {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: var(--primary);
          font-size: 1rem;
        }

        .game-board-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          min-height: 0;
        }

        .game-board-wrapper {
          position: relative;
          width: 100%;
          max-width: 600px;
        }

        .game-status-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          margin-bottom: 1rem;
        }

        .status-playing {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .turn-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .turn-dot.turn-black {
          background: #1a1a1a;
        }

        .turn-dot.turn-white {
          background: #ffffff;
          border: 2px solid #e2e8f0;
        }

        .status-text {
          font-size: 0.95rem;
          color: #475569;
        }

        .status-waiting {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        .game-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .game-ended-overlay {
          background: rgba(56, 239, 125, 0.95);
        }

        .overlay-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .overlay-icon {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay-icon svg {
          width: 48px;
          height: 48px;
          color: var(--success);
        }

        .overlay-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .chat-panel {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--primary);
          font-size: 0.9rem;
        }

        .chat-icon {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 1024px) {
          .game-main {
            grid-template-columns: 240px 1fr 280px;
            gap: 0.75rem;
          }

          .players-panel {
            padding: 1rem;
          }

          .player-avatar {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
          }
        }

        @media (max-width: 768px) {
          .game-room-content {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .game-header {
            padding: 0.75rem 1rem;
            flex-direction: column;
            gap: 0.75rem;
          }

          .game-main {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
            gap: 0.5rem;
          }

          .players-panel {
            flex-direction: row;
            padding: 0.75rem;
            gap: 0.75rem;
          }

          .player-card {
            flex: 1;
            padding: 0.75rem;
          }

          .player-avatar {
            width: 40px;
            height: 40px;
            font-size: 1.125rem;
          }

          .vs-divider {
            display: none;
          }

          .game-board-section {
            padding: 0.5rem;
          }

          .chat-panel {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
