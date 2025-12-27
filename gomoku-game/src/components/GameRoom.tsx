'use client';

import React from 'react';

interface PlayerInfo {
  id: string;
  username: string;
  rating: number;
}

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
  players?: {
    black: PlayerInfo | null;
    white: PlayerInfo | null;
  };
  currentUser?: PlayerInfo | null;
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
  newGameMessage = '',
  players,
  currentUser
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

        .player-info {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .player {
          flex: 1;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
        }

        .player.you {
          background-color: #e3f2fd;
          border-color: #2196f3;
        }

        .player.opponent.joined {
          background-color: #f3e5f5;
          border-color: #9c27b0;
        }

        .player.opponent.waiting {
          background-color: #f5f5f5;
          border-color: #9e9e9e;
        }

        .player-name {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .player-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .player-role {
          font-size: 0.9rem;
          color: #666;
        }

        .player-rating {
          font-size: 0.85rem;
          color: #555;
          font-weight: 500;
        }

        .player-label {
          font-size: 0.85rem;
          color: #888;
          margin-bottom: 0.25rem;
        }

        .opponent-details {
          margin-top: 0.25rem;
        }
      `}</style>
      <div className="room-header">
        <div className="room-info">
          <h3>房间信息</h3>
          <p>房间号: <span className="room-id">{roomId}</span></p>
          <p>先手: <span className="first-hand">{firstHand === 'black' ? '黑棋' : '白棋'}</span></p>
        </div>
        
        <div className="player-info">
          {/* Current player info */}
          {playerRole && currentUser && (
            <div className={`player you ${playerRole || ''}`}>
              <div className="player-name">{currentUser.username}</div>
              <div className="player-details">
                <span className={`player-role ${playerRole || ''}`}>
                  {playerRole === 'black' ? '黑子' : '白子'}
                </span>
                <span className="player-rating">等级分: {currentUser.rating}</span>
              </div>
            </div>
          )}
          
          {/* Opponent info */}
          <div className={`player opponent ${opponentJoined ? 'joined' : 'waiting'}`}>
            <span className="player-label">对手</span>
            {opponentJoined && players && (
              <div className="opponent-details">
                {playerRole === 'black' && players.white ? (
                  <>
                    <div className="player-name">{players.white.username}</div>
                    <div className="player-rating">等级分: {players.white.rating}</div>
                  </>
                ) : playerRole === 'white' && players.black ? (
                  <>
                    <div className="player-name">{players.black.username}</div>
                    <div className="player-rating">等级分: {players.black.rating}</div>
                  </>
                ) : (
                  <span className="player-status">已加入</span>
                )}
              </div>
            )}
            {!opponentJoined && (
              <span className="player-status">等待中...</span>
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
    </div>
  );
}