'use client';

import React from 'react';

interface GameRoomProps {
  roomId: string;
  playerRole: 'black' | 'white' | null;
  opponentJoined: boolean;
  opponentOffline: boolean;
  onStartNewGame: () => void;
  onLeaveRoom: () => void;
  onCopyRoomId: () => void;
}

export default function GameRoom({ 
  roomId, 
  playerRole, 
  opponentJoined, 
  opponentOffline,
  onStartNewGame,
  onLeaveRoom,
  onCopyRoomId
}: GameRoomProps) {
  return (
    <div className="game-room">
      <div className="room-header">
        <div className="room-info">
          <h3>房间信息</h3>
          <div className="room-id-container">
            <p>房间号: <span className="room-id">{roomId}</span></p>
            <button 
              onClick={onCopyRoomId}
              className="copy-btn"
              title="复制房间号"
            >
              📋
            </button>
          </div>
        </div>
        
        <div className="player-info">
          <div className={`player you ${playerRole || ''}`}>
            <span className="player-label">你</span>
            <span className={`player-role ${playerRole || ''}`}>
              {playerRole ? (playerRole === 'black' ? '黑子' : '白子') : '观察者'}
            </span>
          </div>
          
          <div className={`player opponent ${opponentJoined ? 'joined' : 'waiting'} ${opponentOffline ? 'offline' : ''}`}>
            <span className="player-label">对手</span>
            <span className="player-status">
              {opponentOffline ? '对手已离线' : (opponentJoined ? '已加入' : '等待中...')}
            </span>
          </div>
        </div>
      </div>

      <div className="room-controls">
        {opponentJoined && (
          <button 
            className="btn btn-primary" 
            onClick={onStartNewGame}
          >
            开始新游戏
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