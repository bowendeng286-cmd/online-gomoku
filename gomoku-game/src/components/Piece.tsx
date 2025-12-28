import React, { memo } from 'react';

interface PieceProps {
  color: 'black' | 'white';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  isLastMove?: boolean;
}

// 使用 memo 优化性能，只有 props 变化时才重新渲染
export default memo(function Piece({ 
  color, 
  size = 'medium', 
  animated = false,
  isLastMove = false 
}: PieceProps) {
  const sizeClasses = {
    small: 'piece-small',
    medium: 'piece-medium',
    large: 'piece-large'
  };

  const pieceClasses = [
    'piece',
    sizeClasses[size],
    color === 'black' ? 'piece-black' : 'piece-white',
    animated ? 'piece-animated' : '',
    isLastMove ? 'piece-last-move' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={pieceClasses}>
      <div className="piece-inner">
        <div className="piece-highlight"></div>
        <div className="piece-shadow"></div>
      </div>
    </div>
  );
});