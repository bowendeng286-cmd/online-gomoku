'use client';

import React, { useState, useEffect } from 'react';
import { SimpleGameClient } from '@/lib/simpleGameClient';
import { GameState } from '@/lib/gameLogic';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Board from '@/components/Board';
import Lobby from '@/components/Lobby';
import GameRoom from '@/components/GameRoom';
import Auth from '@/components/Auth';
import UserProfile from '@/components/UserProfile';
import GameStats from '@/components/GameStats';

type GameView = 'auth' | 'lobby' | 'room' | 'connecting' | 'matching' | 'stats';

function GameApp() {
  const { user, isAuthenticated, loading } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [gameClient] = useState(() => new SimpleGameClient());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'black' | 'white' | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string>('');
  const [firstHand, setFirstHand] = useState<'black' | 'white'>('black');
  const [newGameVotes, setNewGameVotes] = useState<{ black: boolean; white: boolean }>({ black: false, white: false });
  const [newGameMessage, setNewGameMessage] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [matchMessage, setMatchMessage] = useState<string>('');
  const [opponentInfo, setOpponentInfo] = useState<any>(null);

  useEffect(() => {
    // Check authentication first
    if (loading) return;
    
    if (!isAuthenticated) {
      setView('auth');
      return;
    }

    // Initialize game client callbacks with user authentication
    gameClient.setCallbacks({
      onConnect: () => {
        setConnectionStatus('connected');
        setView('lobby');
        setError('');
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
        setView('connecting');
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
      },
      onRoomInfo: (data) => {
        console.log('Room info received:', data);
        setRoomId(data.roomId);
        // Only set playerRole if it's provided (not null/undefined)
        if (data.playerRole !== undefined && data.playerRole !== null) {
          setPlayerRole(data.playerRole);
        }
        setOpponentJoined(data.opponentJoined);
        setGameState(data.gameState);
        setFirstHand(data.firstHand || 'black');
        if (data.opponentInfo) {
          setOpponentInfo(data.opponentInfo);
        }
        // Always update view when room info changes
        if (view !== 'room') {
          setView('room');
        }
      },
      onGameState: (newGameState: GameState) => {
        console.log('Game state updated:', newGameState);
        setGameState(newGameState);
      },
      onMatchFound: (data) => {
        setRoomId(data.roomId);
        setPlayerRole(data.playerRole);
        setOpponentJoined(data.opponentJoined);
        setGameState(data.gameState);
        if (data.opponentInfo) {
          setOpponentInfo(data.opponentInfo);
        }
        setView('room');
      },
      onQuickMatchStatus: (status: string) => {
        if (status === 'waiting') {
          setMatchStatus('waiting');
          setMatchMessage('正在寻找对手，请稍候...');
          setError('');
        } else if (status === 'matched') {
          setMatchStatus('matched');
          setMatchMessage('已找到对手！正在进入游戏...');
        }
      },
      onOpponentStatus: (opponentJoined: boolean) => {
        setOpponentJoined(opponentJoined);
      },
      onNewGameVote: (data: any) => {
        if (data.votes) {
          setNewGameVotes(data.votes);
        }
        if (data.message) {
          setNewGameMessage(data.message);
        }
      },
      onNewGameStarted: (data: any) => {
        setNewGameVotes({ black: false, white: false });
        setNewGameMessage(data.message);
        // Update first hand for the new game
        setFirstHand(data.firstHand);
        // Update player role (they will swap colors)
        if (playerRole) {
          setPlayerRole(playerRole === 'black' ? 'white' : 'black');
        }
      }
    });

    // Connect to server
    setView('connecting');
    setConnectionStatus('connecting');
    gameClient.connect();

    return () => {
      gameClient.disconnect();
    };
  }, [gameClient, loading, isAuthenticated]);

  const handleCreateRoom = (options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) => {
    gameClient.createRoom(options);
  };

  const handleJoinRoom = (roomId: string) => {
    gameClient.joinRoom(roomId);
  };

  const handleQuickMatch = () => {
    setView('matching');
    setMatchMessage('正在寻找对手，请稍候...');
    setMatchStatus('waiting');
    gameClient.quickMatch();
  };

  const handleAuthSuccess = () => {
    setView('lobby');
  };

  const showStats = () => {
    setView('stats');
  };

  const handleCellClick = (row: number, col: number) => {
    console.log('Cell clicked:', { row, col, gameState, playerRole, opponentJoined });
    
    // 检查游戏状态和基本条件
    if (!gameState) {
      console.log('Game state not available');
      return;
    }
    
    if (gameState.status !== 'playing') {
      console.log('Game not in playing status:', gameState.status);
      return;
    }
    
    if (!playerRole) {
      console.log('Player role not set');
      return;
    }
    
    if (gameState.board[row][col] !== null) {
      console.log('Cell already occupied');
      return;
    }
    
    // 检查是否轮到当前玩家
    if (playerRole !== gameState.currentTurn) {
      console.log('Not your turn. Player:', playerRole, 'Current turn:', gameState.currentTurn);
      return; // 现在严格检查轮次
    }
    
    console.log('Making move:', { row, col, playerRole, currentTurn: gameState.currentTurn });
    gameClient.makeMove(row, col);
  };

  const handleStartNewGame = () => {
    gameClient.voteForNewGame();
  };

  const handleLeaveRoom = async () => {
    await gameClient.leaveRoom();
    setView('lobby');
    setRoomId('');
    setPlayerRole(null);
    setOpponentJoined(false);
    setGameState(null);
  };

  const handleRetryConnection = () => {
    setView('connecting');
    setConnectionStatus('connecting');
    gameClient.connect();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">加载中...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  if (view === 'connecting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {connectionStatus === 'connecting' ? '连接服务器中...' : '连接已断开'}
          </h2>
          {connectionStatus === 'disconnected' && (
            <button 
              onClick={() => {
                setView('connecting');
                setConnectionStatus('connecting');
                gameClient.connect();
              }}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              重新连接
            </button>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'matching') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-2xl font-bold mb-4">快速匹配中</h2>
          <p className="text-lg text-gray-600 mb-6">
            {matchStatus === 'waiting' ? matchMessage : '正在连接游戏房间...'}
          </p>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              🎯 正在为您寻找实力相当的对手
            </p>
            <p className="text-sm text-blue-600 mt-2">
              预计等待时间：30秒内
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => {
                gameClient.disconnect();
                setMatchStatus('idle');
                setMatchMessage('');
                setView('lobby');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              取消匹配
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'stats') {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <button
              onClick={() => setView('lobby')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ← 返回大厅
            </button>
          </div>
          <GameStats />
        </div>
        {error && (
          <div className="fixed bottom-4 left-4 right-4 p-3 bg-red-100 text-red-700 rounded max-w-md mx-auto">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex justify-end">
            <button
              onClick={showStats}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              查看战绩
            </button>
          </div>
          <UserProfile />
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onQuickMatch={handleQuickMatch}
          />
        </div>
        {error && (
          <div className="fixed bottom-4 left-4 right-4 p-3 bg-red-100 text-red-700 rounded max-w-md mx-auto">
            {error}
          </div>
        )}
        
        <div className="fixed top-4 left-4 p-2 bg-blue-100 text-blue-700 rounded text-sm max-w-xs">
          <strong>HTTP模式</strong> - 使用HTTP API进行联机对战
        </div>
      </div>
    );
  }

  if (view === 'room' && gameState) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
            <div className="flex-1">
              <Board
                board={gameState.board}
                onCellClick={handleCellClick}
                currentTurn={gameState.currentTurn}
                gameStatus={gameState.status}
                winner={gameState.winner}
                lastMove={gameState.lastMove}
              />
            </div>
            <div className="lg:w-80">
              <GameRoom
                roomId={roomId}
                playerRole={playerRole}
                opponentJoined={opponentJoined}
                onStartNewGame={handleStartNewGame}
                onLeaveRoom={handleLeaveRoom}
                firstHand={firstHand}
                gameState={gameState}
                newGameVotes={newGameVotes}
                newGameMessage={newGameMessage}
                opponentInfo={opponentInfo}
                playerInfo={user}
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="fixed bottom-4 left-4 right-4 p-3 bg-red-100 text-red-700 rounded max-w-md mx-auto">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function Home() {
  return (
    <AuthProvider>
      <GameApp />
    </AuthProvider>
  );
}
