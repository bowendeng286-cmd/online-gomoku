'use client';

import React, { useState, useEffect } from 'react';

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
  token?: string;
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
  firstHand = 'black',
  gameState,
  newGameVotes = { black: false, white: false },
  newGameMessage = '',
  opponentInfo,
  playerInfo,
  token
}: GameRoomProps) {
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  const handleLeaveRoom = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveRoom = () => {
    setShowLeaveConfirm(false);
    onLeaveRoom();
  };

  const cancelLeaveRoom = () => {
    setShowLeaveConfirm(false);
  };

  return (
    <>
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

        /* 新的移动端布局样式 */
        .game-room-mobile {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8f9fa;
          position: relative;
        }

        .player-section {
          padding: 1rem 1rem 2rem 1rem; /* 底部增加padding为关闭按钮留空间 */
          background: white;
          border-bottom: 1px solid #dee2e6;
          padding-top: 2rem; /* 顶部增加padding */
        }

        .opponent-section {
          padding: 1rem;
          background: white;
          border-top: 1px solid #dee2e6;
          margin-top: 3rem; /* 顶部增加margin为关闭按钮留空间 */
        }

        /* 房间号显示 */
        .room-id-mobile {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          z-index: 50;
        }

        .player-info-mobile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 1.2rem;
        }

        .player-avatar.black {
          background: #2c3e50;
        }

        .player-avatar.white {
          background: #ecf0f1;
          color: #2c3e50;
          border: 2px solid #bdc3c7;
        }

        .player-details-mobile {
          flex: 1;
        }

        .player-name-mobile {
          font-weight: 600;
          color: #2c3e50;
          font-size: 1rem;
        }

        .player-role-mobile {
          font-size: 0.9rem;
          color: #6c757d;
        }

        .player-elo-mobile {
          font-size: 0.8rem;
          color: #7f8c8d;
        }

        .player-status {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .status-online {
          background: #d4edda;
          color: #155724;
        }

        .status-waiting {
          background: #fff3cd;
          color: #856404;
        }

        .board-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .leave-btn-mobile {
          position: fixed;
          top: 1rem;
          left: 1rem;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: white;
          border: 2px solid #dc3545;
          color: #dc3545;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(220, 53, 69, 0.3);
          transition: all 0.2s;
          font-size: 1.2rem;
        }

        .leave-btn-mobile:hover {
          background: #dc3545;
          color: white;
          transform: scale(1.05);
        }

        .leave-btn-mobile::before {
          content: "🚪";
          font-size: 1.2rem;
        }

        .new-game-floating {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          z-index: 200;
          min-width: 280px;
          max-width: 90vw;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 199;
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          text-align: center;
        }

        .modal-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .modal-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .modal-btn-primary {
          background: #007bff;
          color: white;
        }

        .modal-btn-primary:hover {
          background: #0056b3;
        }

        .modal-btn-secondary {
          background: #6c757d;
          color: white;
        }

        .modal-btn-secondary:hover {
          background: #545b62;
        }

        .modal-btn-danger {
          background: #dc3545;
          color: white;
        }

        .modal-btn-danger:hover {
          background: #c82333;
        }

        /* 桌面端隐藏移动端布局 */
        @media (min-width: 768px) {
          .game-room-mobile {
            display: none;
          }
        }

        /* 移动端隐藏桌面端布局 */
        @media (max-width: 767px) {
          .game-room {
            display: none;
          }
        }
      `}</style>

      {/* 移动端布局 */}
      <div className="game-room-mobile">
        {/* 房间号显示 */}
        <div className="room-id-mobile">
          房间号: {roomId}
        </div>

        {/* 退出房间按钮 - 左上角图标 */}
        <button 
          className="leave-btn-mobile" 
          onClick={handleLeaveRoom}
          title="离开房间"
        ></button>

        {/* 对手信息栏 - 顶部 */}
        <div className="opponent-section">
          <div className="player-info-mobile">
            <div className={`player-avatar ${opponentJoined ? (opponentInfo?.username ? 'white' : 'white') : 'white'}`}>
              {opponentJoined ? (opponentInfo?.username?.charAt(0).toUpperCase() || 'O') : '?'}
            </div>
            <div className="player-details-mobile">
              <div className="player-name-mobile">
                {opponentInfo?.username || (opponentJoined ? '对手' : '等待中...')}
              </div>
              <div className="player-role-mobile">
                {playerRole === 'black' ? '白棋' : '黑棋'}
              </div>
              {opponentInfo && (
                <div className="player-elo-mobile">
                  Elo: {opponentInfo.eloRating}
                </div>
              )}
            </div>
            <div className={`player-status ${opponentJoined ? 'status-online' : 'status-waiting'}`}>
              {opponentJoined ? '在线' : '等待中'}
            </div>
          </div>
        </div>

        {/* 棋盘区域 */}
        <div className="board-section">
          {/* 这里由父组件渲染棋盘 */}
        </div>

        {/* 自己信息栏 - 底部 */}
        <div className="player-section">
          <div className="player-info-mobile">
            <div className={`player-avatar ${playerRole || 'black'}`}>
              {playerInfo?.username?.charAt(0).toUpperCase() || (playerRole === 'white' ? '白' : '黑')}
            </div>
            <div className="player-details-mobile">
              <div className="player-name-mobile">
                {playerInfo?.username || '你'}
              </div>
              <div className="player-role-mobile">
                {playerRole === 'black' ? '黑棋' : '白棋'}
              </div>
              {playerInfo && (
                <div className="player-elo-mobile">
                  Elo: {playerInfo.eloRating}
                </div>
              )}
            </div>
            <div className="player-status status-online">
              在线
            </div>
          </div>
        </div>

        {/* 退出房间确认弹窗 */}
        {showLeaveConfirm && (
          <>
            <div className="modal-overlay" onClick={cancelLeaveRoom} />
            <div className="new-game-floating">
              <div className="modal-title">确认离开房间？</div>
              <div className="modal-buttons">
                <button 
                  className="modal-btn modal-btn-danger" 
                  onClick={confirmLeaveRoom}
                >
                  离开房间
                </button>
                <button 
                  className="modal-btn modal-btn-secondary" 
                  onClick={cancelLeaveRoom}
                >
                  取消
                </button>
              </div>
            </div>
          </>
        )}

        {/* 游戏结束时的悬浮新游戏按钮 */}
        {gameState?.status === 'ended' && opponentJoined && playerRole && !newGameVotes[playerRole] && (
          <>
            <div className="modal-overlay" />
            <div className="new-game-floating">
              <div className="modal-title">
                {gameState.winner ? `${gameState.winner === 'black' ? '黑方' : '白方'}获胜！` : '游戏结束'}
              </div>
              
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
              
              <div className="modal-buttons">
                <button 
                  className="modal-btn modal-btn-primary" 
                  onClick={onStartNewGame}
                >
                  开始新游戏（换边）
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 桌面端布局（保持原有逻辑） */}
      <div className="game-room">
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
            <p>先手: <span className="first-hand">{firstHand === 'black' ? '黑棋' : '白棋'}</span></p>
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
      </div>
    </>
  );
}