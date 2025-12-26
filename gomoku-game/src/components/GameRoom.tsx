'use client';

import React, { useState } from 'react';

interface GameRoomProps {
  roomId: string;
  playerRole: 'black' | 'white' | null;
  opponentJoined: boolean;
  onStartNewGame: () => void;
  onLeaveRoom: () => void;
  firstHand?: 'black' | 'white';
}

export default function GameRoom({ 
  roomId, 
  playerRole, 
  opponentJoined, 
  onStartNewGame,
  onLeaveRoom,
  firstHand = 'black'
}: GameRoomProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  };

  return (
    <div className="game-room">
      <div className="room-header">
        <div className="room-info">
          <h3>房间信息</h3>
          <div className="room-id-container">
            <p>房间号: <span className="room-id">{roomId}</span></p>
            <button 
              onClick={copyRoomId}
              className="copy-btn"
              title="复制房间号"
            >
              {copySuccess ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
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