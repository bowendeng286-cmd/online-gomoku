'use client';

import React, { useMemo } from 'react';
import BoardCell from './BoardCell';
import { useBoardOptimization } from '@/hooks/useBoardOptimization';

interface BoardProps {
  board: (null | 'black' | 'white')[][];
  onCellClick: (row: number, col: number) => void;
  currentTurn: 'black' | 'white';
  gameStatus: 'waiting' | 'playing' | 'ended';
  winner: 'black' | 'white' | null;
  lastMove: { row: number; col: number } | null;
}

// 使用 memo 优化性能，避免不必要的重新渲染
export default function Board({ 
  board, 
  onCellClick, 
  currentTurn, 
  gameStatus, 
  winner,
  lastMove 
}: BoardProps) {
  // 使用优化 hook 处理棋盘逻辑
  const { cells, handleCellClick, getCellClassName, hasBoardChanged } = useBoardOptimization({
    board,
    gameStatus,
    lastMove,
    onCellClick
  });

  // 使用 useMemo 优化游戏状态显示
  const gameStatusDisplay = useMemo(() => {
    switch (gameStatus) {
      case 'waiting':
        return (
          <div className="status-waiting">
            <div className="status-waiting-icon">⏳</div>
            <div className="status-waiting-text">等待玩家加入...</div>
          </div>
        );
      case 'playing':
        return (
          <div className="status-playing">
            <div className={`turn-indicator turn-${currentTurn}`}>
              <div className="turn-piece"></div>
            </div>
            <div className="status-text">
              <span className="status-label">当前回合:</span>
              <span className={`turn-text turn-${currentTurn}`}>
                {currentTurn === 'black' ? '黑子' : '白子'}
              </span>
            </div>
          </div>
        );
      case 'ended':
        return winner ? (
          <div className="status-ended">
            <div className={`winner-indicator winner-${winner}`}>
              <div className="winner-piece"></div>
            </div>
            <div className="status-text">
              <span className={`winner-text winner-${winner}`}>
                {winner === 'black' ? '黑子' : '白子'}获胜!
              </span>
            </div>
          </div>
        ) : null;
      default:
        return null;
    }
  }, [gameStatus, currentTurn, winner]);

  return (
    <div className="board-container">
      <div className="game-status">
        {gameStatusDisplay}
      </div>
      
      <div className="board" data-board-changed={hasBoardChanged}>
        {cells.map((cell) => (
          <BoardCell
            key={cell.key}
            row={cell.row}
            col={cell.col}
            piece={cell.piece}
            isLastMove={cell.isLastMove}
            isHoverable={cell.isHoverable}
            onClick={handleCellClick}
            className={getCellClassName(cell)}
          />
        ))}
      </div>
    </div>
  );
}