'use client';

import React, { useState, useCallback } from 'react';

interface Piece {
  row: number;
  col: number;
  color: 'black' | 'white';
}

interface BoardProps {
  board: (null | 'black' | 'white')[][];
  onCellClick: (row: number, col: number) => void;
  currentTurn: 'black' | 'white';
  gameStatus: 'waiting' | 'playing' | 'ended';
  winner: 'black' | 'white' | null;
  lastMove: { row: number; col: number } | null;
}

export default function Board({
  board,
  onCellClick,
  currentTurn,
  gameStatus,
  winner,
  lastMove
}: BoardProps) {
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus !== 'playing' || board[row][col] !== null) return;
    onCellClick(row, col);
  }, [board, gameStatus, onCellClick]);

  // 渲染所有棋子
  const renderPieces = () => {
    const pieces = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const pieceColor = board[row][col];
        if (pieceColor) {
          const isLastMove = lastMove && lastMove.row === row && lastMove.col === col;

          pieces.push(
            <div
              key={`piece-${row}-${col}`}
              className={`piece-crosshair piece-${pieceColor} ${isLastMove ? 'piece-last-move' : ''}`}
              style={{
                '--row-index': row,
                '--col-index': col,
              } as React.CSSProperties}
            >
              <div className="piece-inner"></div>
            </div>
          );
        }
      }
    }
    return pieces;
  };

  // 渲染所有点击区域（交叉点）
  const renderClickZones = () => {
    const zones = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const isEmpty = board[row][col] === null;

        zones.push(
          <div
            key={`zone-${row}-${col}`}
            className={`crosshair-zone ${isEmpty && gameStatus === 'playing' ? 'crosshair-zone-hoverable' : ''}`}
            style={{
              '--row-index': row,
              '--col-index': col,
            } as React.CSSProperties}
            onClick={() => handleCellClick(row, col)}
          />
        );
      }
    }
    return zones;
  };

  return (
    <div className="board-container">
      <div className="game-status">
        {gameStatus === 'waiting' && (
          <div className="status-waiting">等待玩家加入...</div>
        )}
        {gameStatus === 'playing' && (
          <div className="status-playing">
            <span className={`turn-indicator turn-${currentTurn}`}></span>
            <span>当前回合: {currentTurn === 'black' ? '黑子' : '白子'}</span>
          </div>
        )}
        {gameStatus === 'ended' && winner && (
          <div className="status-ended">
            <span className={`winner-indicator winner-${winner}`}></span>
            <span>{winner === 'black' ? '黑子' : '白子'}获胜!</span>
          </div>
        )}
      </div>

      <div className="board-crosshair">
        {/* 点击区域 */}
        {renderClickZones()}
        {/* 棋子 */}
        {renderPieces()}
      </div>
    </div>
  );
}