'use client';

import React, { useState } from 'react';

interface GameRoomProps {
  roomId: string;
  playerRole: 'black' | 'white' | null;
  opponentJoined: boolean;
  gameStatus: 'waiting' | 'playing' | 'ended';
  winner: 'black' | 'white' | null;
  onStartNewGame: () => void;
  onRequestSwap: () => void;
  onRespondSwap: (accept: boolean) => void;
  onLeaveRoom: () => void;
  firstHand?: 'black' | 'white';
  swapRequest?: any;
}

export default function GameRoom({ 
  roomId, 
  playerRole, 
  opponentJoined, 
  gameStatus,
  winner,
  onStartNewGame,
  onRequestSwap,
  onRespondSwap,
  onLeaveRoom,
  firstHand = 'black',
  swapRequest
}: GameRoomProps) {
  const [showSwapOptions, setShowSwapOptions] = useState(false);
  
  const isGameEnded = gameStatus === 'ended';
  const hasWon = winner === playerRole;
  const canRequestSwap = isGameEnded && !swapRequest;

  const handleStartNewGame = () => {
    if (isGameEnded && !showSwapOptions && opponentJoined) {
      setShowSwapOptions(true);
    } else {
      onStartNewGame();
    }
  };

  const handleSwapChoice = (swap: boolean) => {
    if (swap) {
      onRequestSwap();
    } else {
      onStartNewGame();
    }
    setShowSwapOptions(false);
  };

  const getSwapButtonText = () => {
    if (!isGameEnded) return '游戏进行中';
    if (!opponentJoined) return '等待对手加入';
    if (hasWon) return '开始新游戏';
    return '开始新游戏';
  };

  return (
    <div className="game-room">
      <div className="room-header">
        <div className="room-info">
          <h3>房间信息</h3>
          <p>房间号: <span className="room-id">{roomId}</span></p>
          <p>先手: <span className="first-hand">{firstHand === 'black' ? '黑棋' : '白棋'}</span></p>
          <p>状态: <span className={`game-status ${gameStatus}`}>
            {gameStatus === 'waiting' ? '等待中' : 
             gameStatus === 'playing' ? '游戏中' : '已结束'}
          </span></p>
          {isGameEnded && winner && (
            <p className="winner-info">
              获胜者: <span className={`winner ${winner}`}>
                {winner === 'black' ? '黑棋' : '白棋'}
              </span>
            </p>
          )}
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

      {/* 换手申请显示 */}
      {swapRequest && (
        <div className="swap-request">
          <div className="swap-message">
            {swapRequest.fromPlayer === playerRole ? 
              '你的换手申请已发送，等待对手响应...' : 
              '对手申请换手，是否接受？'}
          </div>
          {swapRequest.fromPlayer !== playerRole && (
            <div className="swap-buttons">
              <button 
                className="btn btn-success" 
                onClick={() => onRespondSwap(true)}
              >
                接受换手
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => onRespondSwap(false)}
              >
                拒绝换手
              </button>
            </div>
          )}
        </div>
      )}

      {/* 换手选项 */}
      {showSwapOptions && (
        <div className="swap-options">
          <div className="swap-message">是否申请换手？</div>
          <div className="swap-buttons">
            <button 
              className="btn btn-primary" 
              onClick={() => handleSwapChoice(true)}
            >
              申请换手
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleSwapChoice(false)}
            >
              保持原样
            </button>
          </div>
        </div>
      )}

      <div className="room-controls">
        {isGameEnded && !swapRequest && !showSwapOptions && (
          <button 
            className={`btn ${canRequestSwap ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={handleStartNewGame}
            disabled={!opponentJoined}
          >
            {getSwapButtonText()}
          </button>
        )}

        {/* 获胜后显示换手申请按钮 */}
        {isGameEnded && hasWon && canRequestSwap && (
          <button 
            className="btn btn-info" 
            onClick={onRequestSwap}
            disabled={!opponentJoined}
          >
            申请换手
          </button>
        )}
        
        <button 
          className="btn btn-secondary" 
          onClick={onLeaveRoom}
        >
          离开房间
        </button>
      </div>

      <style jsx>{`
        .game-status {
          font-weight: bold;
        }
        .game-status.waiting {
          color: #6c757d;
        }
        .game-status.playing {
          color: #007bff;
        }
        .game-status.ended {
          color: #dc3545;
        }
        .winner-info {
          margin-top: 8px;
        }
        .winner {
          font-weight: bold;
        }
        .winner.black {
          color: #333;
        }
        .winner.white {
          color: #666;
        }
        .swap-request, .swap-options {
          margin: 15px 0;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f8f9fa;
        }
        .swap-message {
          margin-bottom: 10px;
          font-size: 14px;
        }
        .swap-buttons {
          display: flex;
          gap: 10px;
        }
        .btn-success {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-danger {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-info {
          background-color: #17a2b8;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 8px;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}