'use client';

import React from 'react';

interface GameRoomProps {
  roomId: string;
  playerRole: 'black' | 'white' | null;
  opponentJoined: boolean;
  onStartNewGame: () => void;
  onLeaveRoom: () => void;
  firstHand?: 'black' | 'white';
  gameState?: {
    status: string;
    winner?: string | null;
  };
  newGameVotes?: { black: boolean; white: boolean };
  newGameMessage?: string;
}

export default function GameRoom({ 
  roomId, 
  playerRole, 
  opponentJoined, 
  onStartNewGame,
  onLeaveRoom,
  firstHand = 'black',
  gameState,
  newGameVotes = { black: false, white: false },
  newGameMessage = ''
}: GameRoomProps) {
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
      `}</style>
      <div className="room-header">
        <div className="room-info">
          <h3>房间信息</h3>
          <p>房间号: <span className="room-id">{roomId}</span></p>
          <p>先手: <span className="first-hand">{firstHand === 'black' ? '黑棋' : '白棋'}</span></p>
        </div>
        
        <div className="player-info">
          <div className={`player you ${playerRole || ''}`}>
            <span className="player-label">你</span>
            <span className={`player-role ${playerRole || ''}`}>
              {playerRole ? (playerRole === 'black' ? '黑子' : '白子') : '观察者'}
            </span>
          </div>
          
          <div className={`player opponent ${opponentJoined ? 'joined' : 'waiting'}`}>
            <span className="player-label">对手</span>
            <span className="player-status">
              {opponentJoined ? '已加入' : '等待中...'}
            </span>
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
    </div>
  );
}