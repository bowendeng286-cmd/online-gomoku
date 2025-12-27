'use client';

import React, { useState, useEffect } from 'react';
import { SimpleGameClient } from '@/lib/simpleGameClient';
import { GameState } from '@/lib/gameLogic';
import Board from '@/components/Board';
import Lobby from '@/components/Lobby';
import GameRoom from '@/components/GameRoom';
import AuthForm from '@/components/AuthForm';
import { AuthProvider, useAuth } from '@/lib/authContext';

type GameView = 'lobby' | 'room' | 'connecting' | 'matching' | 'auth';

function GameApp() {
  const { user, token, logout } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [gameClient] = useState(() => new SimpleGameClient());

  // 如果用户未登录，显示登录表单
  if (!user) {
    return <AuthForm onAuthSuccess={(userData, authToken) => {
      // 登录成功后，页面会自动重新渲染
    }} />;
  }
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
  const [players, setPlayers] = useState<{ black: any; white: any }>({ black: null, white: null });

  useEffect(() => {
    // Initialize game client callbacks
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
        setRoomId(data.roomId);
        setPlayerRole(data.playerRole);
        setOpponentJoined(data.opponentJoined);
        setGameState(data.gameState);
        setFirstHand(data.firstHand || 'black');
        setView('room');
      },
      onGameState: (newGameState: GameState) => {
        setGameState(newGameState);
      },
      onMatchFound: (data) => {
        setRoomId(data.roomId);
        setPlayerRole(data.playerRole);
        setOpponentJoined(data.opponentJoined);
        setGameState(data.gameState);
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
      },
      onPlayersUpdate: (data: any) => {
        if (data.players) {
          setPlayers(data.players);
        }
      }
    });

    // Connect to server
    if (token) {
      gameClient.setToken(token);
      setView('connecting');
      setConnectionStatus('connecting');
      gameClient.connect();
    } else {
      setView('auth');
    }

    return () => {
      gameClient.disconnect();
    };
  }, [gameClient, token]);

  const handleCreateRoom = (options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) => {
    gameClient.createRoom(options);
  };

  const handleJoinRoom = (roomId: string) => {
    gameClient.joinRoom(roomId);
  };

  const handleQuickMatch = () => {
    setView('matching');
    gameClient.quickMatch();
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameState && playerRole === gameState.currentTurn) {
      gameClient.makeMove(row, col);
    }
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
              onClick={handleRetryConnection}
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

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-zinc-50">
        {/* User info header */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">五子棋对战</h1>
                {user && (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-gray-500 ml-2">等级分: {user.rating}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      战绩: {user.wins}胜 {user.losses}负 {user.draws}平
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                登出
              </button>
            </div>
          </div>
        </div>

        {/* Main lobby content */}
        <div className="py-8">
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
        {/* User info header */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">游戏房间 {roomId}</h1>
              <button 
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                登出
              </button>
            </div>
          </div>
        </div>

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
                players={players}
                currentUser={user}
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
