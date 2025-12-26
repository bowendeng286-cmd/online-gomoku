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

  const handleCreateRoom = () => {
    gameClient.createRoom();
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

  const handleLeaveRoom = () => {
    gameClient.leaveRoom();
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

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickMatch={handleQuickMatch}
        />
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
