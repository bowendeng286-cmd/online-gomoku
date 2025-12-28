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
  opponentInfo?: any;
  playerInfo?: any;
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
  opponentInfo,
  playerInfo
}: GameRoomProps) {
  return (
    <div className="game-room">
      <div className="room-header">
        <div className="room-info">
          <h3>房间 {roomId}</h3>
          <div className="room-details">
            <span className="first-hand">{firstHand === 'black' ? '黑棋' : '白棋'}先手</span>
          </div>
        </div>
        
        <div className="player-info">
          <div className={`player you ${playerRole || ''}`}>
            <div className="player-main">
              <span className="player-label">你</span>
              <span className={`player-role ${playerRole || ''}`}>
                {playerRole ? (playerRole === 'black' ? '黑子' : '白子') : '观察'}
              </span>
            </div>
            {playerInfo && (
              <div className="player-details">
                <div className="player-name">{playerInfo.username}</div>
                <div className="player-elo">{playerInfo.eloRating}</div>
              </div>
            )}
          </div>
          
          <div className={`player opponent ${opponentJoined ? 'joined' : 'waiting'}`}>
            <div className="player-main">
              <span className="player-label">对手</span>
              <span className="player-status">
                {opponentJoined ? '在线' : '等待'}
              </span>
            </div>
            {opponentInfo ? (
              <div className="player-details">
                <div className="player-name">{opponentInfo.username}</div>
                <div className="player-elo">{opponentInfo.eloRating}</div>
              </div>
            ) : (
              opponentJoined && (
                <div className="player-details">
                  <div className="player-name">对手</div>
                  <div className="player-elo">加载中</div>
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
            <div className="game-result">
              {gameState.winner && (
                <p className="winner-announcement">
                  {gameState.winner === 'black' ? '黑方' : '白方'}获胜！
                </p>
              )}
            </div>
            
            {newGameMessage && (
              <div className="vote-message">
                {newGameMessage}
              </div>
            )}
            
            <div className="vote-status">
              <div className={`vote-item ${newGameVotes.black ? 'voted' : ''}`}>
                黑方: {newGameVotes.black ? '✅ 同意' : '⏳ 等待'}
              </div>
              <div className={`vote-item ${newGameVotes.white ? 'voted' : ''}`}>
                白方: {newGameVotes.white ? '✅ 同意' : '⏳ 等待'}
              </div>
            </div>
            
            {/* Only show button for the current player if they haven't voted yet */}
            {playerRole && !newGameVotes[playerRole] && (
              <button 
                className="btn btn-primary" 
                onClick={onStartNewGame}
              >
                同意新游戏（换边）
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
            新游戏（进行中）
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