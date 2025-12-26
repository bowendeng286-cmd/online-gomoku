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

  const getCellContent = (row: number, col: number) => {
    const piece = board[row][col];
    if (!piece) return null;
    
    return (
      <div className={`piece piece-${piece}`}>
        <div className="piece-inner"></div>
      </div>
    );
  };

  const getCellClass = (row: number, col: number) => {
    const classes = ['cell'];
    if (board[row][col] === null && gameStatus === 'playing') {
      classes.push('cell-hoverable');
    }
    if (lastMove && lastMove.row === row && lastMove.col === col) {
      classes.push('cell-last-move');
    }
    return classes.join(' ');
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
      
      <div className="board">
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {getCellContent(rowIndex, colIndex)}
            </div>
          ))
        ))}
      </div>
    </div>
  );
}