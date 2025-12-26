'use client';

import React, { useState, useEffect } from 'react';
import { SimpleGameClient } from '@/lib/simpleGameClient';
import { GameState } from '@/lib/gameLogic';
import Board from '@/components/Board';
import Lobby from '@/components/Lobby';
import GameRoom from '@/components/GameRoom';

type GameView = 'lobby' | 'room' | 'connecting';

export default function Home() {
  const [view, setView] = useState<GameView>('lobby');
  const [gameClient] = useState(() => new SimpleGameClient());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'black' | 'white' | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string>('');
  const [errorKey, setErrorKey] = useState<number>(0);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
        setErrorKey(prev => prev + 1); // Force re-render to reset timer
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error, errorKey]);
  const [firstHand, setFirstHand] = useState<'black' | 'white'>('black');

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
        const prevOpponentJoined = opponentJoined;
        setRoomId(data.roomId);
        setPlayerRole(data.playerRole);
        setOpponentJoined(data.opponentJoined);
        setGameState(data.gameState);
        setFirstHand(data.firstHand || 'black');
        setView('room');
        
        // Show notifications for opponent status changes
        if (data.opponentJoined && !prevOpponentJoined) {
          setError('对手已加入房间！');
          setErrorKey(prev => prev + 1);
        } else if (!data.opponentJoined && prevOpponentJoined) {
          setError('对手已离开房间');
          setErrorKey(prev => prev + 1);
        } else if (!data.opponentJoined) {
          setError('等待对手加入房间...');
          setErrorKey(prev => prev + 1);
        }
      },
      onGameState: (newGameState: GameState) => {
        const prevStatus = gameState?.status;
        setGameState(newGameState);
        
        // Show notifications for game status changes
        if (newGameState.status === 'playing' && prevStatus !== 'playing') {
          setError('游戏开始！');
          setErrorKey(prev => prev + 1);
        } else if (newGameState.status === 'ended' && newGameState.winner) {
          const winnerText = newGameState.winner === playerRole ? '你赢了！' : '对手赢了！';
          setError(winnerText);
          setErrorKey(prev => prev + 1);
        }
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
          setError('正在寻找对手...');
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
  }, [gameClient]);

  const handleCreateRoom = (options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) => {
    gameClient.createRoom(options);
  };

  const handleJoinRoom = (roomId: string) => {
    gameClient.joinRoom(roomId);
  };

  const handleQuickMatch = () => {
    gameClient.quickMatch();
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameState && playerRole === gameState.currentTurn) {
      gameClient.makeMove(row, col);
    }
  };

  const handleStartNewGame = () => {
    gameClient.restartGame();
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
            <div 
              key={errorKey}
              className="mt-4 p-3 bg-red-100 text-red-700 rounded animate-fade-in-out"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickMatch={handleQuickMatch}
        />
        {error && (
          <div 
            key={errorKey}
            className="fixed bottom-4 left-4 right-4 p-3 bg-red-100 text-red-700 rounded max-w-md mx-auto animate-fade-in-out"
          >
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
              />
            </div>
          </div>
        </div>
        {error && (
          <div 
            key={errorKey}
            className="fixed bottom-4 left-4 right-4 p-3 bg-red-100 text-red-700 rounded max-w-md mx-auto animate-fade-in-out"
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
