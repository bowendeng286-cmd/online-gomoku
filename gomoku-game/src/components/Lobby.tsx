'use client';

import React, { useState } from 'react';

interface LobbyProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onQuickMatch: () => void;
}

export default function Lobby({ onCreateRoom, onJoinRoom, onQuickMatch }: LobbyProps) {
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim());
    }
  };

  const handleQuickMatch = () => {
    onQuickMatch();
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1 className="game-title">五子棋对战</h1>
        <p className="game-subtitle">在线联机对战</p>
      </div>

      <div className="lobby-actions">
        <div className="action-group">
          <button 
            className="btn btn-primary btn-large"
            onClick={onCreateRoom}
          >
            创建房间
          </button>
          <p className="action-desc">创建一个新房间，邀请好友加入</p>
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