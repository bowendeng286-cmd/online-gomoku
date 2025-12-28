import React, { memo, useCallback } from 'react';
import Piece from './Piece';

interface BoardCellProps {
  row: number;
  col: number;
  piece: 'black' | 'white' | null;
  isLastMove: boolean;
  isHoverable: boolean;
  onClick: (row: number, col: number) => void;
  className?: string;
}

// 使用 memo 优化性能，只有 props 变化时才重新渲染
export default memo(function BoardCell({ 
  row, 
  col, 
  piece, 
  isLastMove, 
  isHoverable,
  onClick,
  className = ''
}: BoardCellProps) {
  
  // 使用 useCallback 避免每次渲染都创建新函数
  const handleClick = useCallback(() => {
    onClick(row, col);
  }, [row, col, onClick]);

  return (
    <div 
      className={`board-cell ${className}`}
      onClick={handleClick}
      data-row={row}
      data-col={col}
    >
      {piece && (
        <Piece 
          color={piece} 
          isLastMove={isLastMove}
          animated={!isLastMove}
        />
      )}
    </div>
  );
});