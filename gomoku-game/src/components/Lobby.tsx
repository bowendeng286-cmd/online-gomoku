'use client';

import React, { useState } from 'react';

interface LobbyProps {
  onCreateRoom: (options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) => void;
  onJoinRoom: (roomId: string) => void;
  onQuickMatch: () => void;
}

export default function Lobby({ onCreateRoom, onJoinRoom, onQuickMatch }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customRoomId, setCustomRoomId] = useState('');
  const [firstPlayer, setFirstPlayer] = useState<'black' | 'white'>('black');

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim());
    }
  };

  const handleQuickMatch = () => {
    onQuickMatch();
  };

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
      </div>

      <div className="lobby-actions">
        <div className="action-group">
          <button 
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
          >
            创建房间
          </button>
          <p className="action-desc">创建新房间邀请好友</p>
          
          <button 
            className="btn btn-outline btn-small"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? '隐藏选项' : '高级选项'}
          </button>
          
          {showAdvancedOptions && (
            <div className="advanced-options">
              <div className="option-group">
                <label>自定义房间号：</label>
                <input
                  type="text"
                  placeholder="可选，留空自动生成"
                  value={customRoomId}
                  onChange={(e) => setCustomRoomId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="input-custom-room"
                  maxLength={10}
                />
                <small>1-10位字母数字组合</small>
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
                    黑棋先手
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
          <p className="action-desc">随机匹配立即开始</p>
        </div>

        <div className="action-group">
          <div className="join-room">
            <input
              type="text"
              placeholder="房间号"
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
              加入
            </button>
          </div>
          <p className="action-desc">输入房间号加入</p>
        </div>
      </div>
    </div>
  );
}