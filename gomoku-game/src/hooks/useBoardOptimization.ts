import { useMemo, useCallback, useRef, useEffect } from 'react';

interface BoardCell {
  row: number;
  col: number;
  piece: 'black' | 'white' | null;
  isLastMove: boolean;
  isHoverable: boolean;
  key: string;
}

interface BoardOptimizationOptions {
  board: (null | 'black' | 'white')[][];
  gameStatus: 'waiting' | 'playing' | 'ended';
  lastMove: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
}

export function useBoardOptimization({
  board,
  gameStatus,
  lastMove,
  onCellClick
}: BoardOptimizationOptions) {
  // 使用 useRef 缓存上一次的棋盘状态，避免不必要的重新计算
  const prevBoardRef = useRef<(null | 'black' | 'white')[][]>([]);
  const prevLastMoveRef = useRef<{ row: number; col: number } | null>(null);
  
  // 记录最近点击的单元格，用于防止重复点击
  const lastClickedRef = useRef<string>('');

  // 预计算所有单元格的状态，使用 useMemo 优化性能
  const cells = useMemo(() => {
    const result: BoardCell[] = [];
    
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        result.push({
          row,
          col,
          piece: board[row][col],
          isLastMove: lastMove ? lastMove.row === row && lastMove.col === col : false,
          isHoverable: board[row][col] === null && gameStatus === 'playing',
          key: `${row}-${col}` // 简化 key 生成
        });
      }
    }
    
    return result;
  }, [board, gameStatus, lastMove]);

  // 优化的点击处理函数
  const handleCellClick = useCallback((row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    const now = Date.now();
    
    // 防止重复点击（300ms 内）
    if (lastClickedRef.current === cellKey && (now - 300) < 0) {
      return;
    }
    
    // 检查是否可以点击
    if (gameStatus !== 'playing' || board[row][col] !== null) {
      return;
    }
    
    lastClickedRef.current = `${row}-${col}`;
    onCellClick(row, col);
  }, [board, gameStatus, onCellClick]);

  // 获取单元格的 CSS 类名
  const getCellClassName = useCallback((cell: BoardCell) => {
    const classes = [];
    
    if (cell.isHoverable) {
      classes.push('cell-hoverable');
    }
    
    if (cell.isLastMove) {
      classes.push('cell-last-move');
    }
    
    // 添加动画类
    if (cell.piece && prevBoardRef.current && prevBoardRef.current[cell.row][cell.col] !== cell.piece) {
      classes.push('cell-new-piece');
    }
    
    return classes.join(' ');
  }, [prevBoardRef]);

  // 检查棋盘是否有变化
  const hasBoardChanged = useMemo(() => {
    if (!prevBoardRef.current) return true;
    
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (prevBoardRef.current[row][col] !== board[row][col]) {
          return true;
        }
      }
    }
    
    return false;
  }, [board]);

  // 更新缓存
  useEffect(() => {
    prevBoardRef.current = board;
    prevLastMoveRef.current = lastMove;
  }, [board, lastMove]);

  return {
    cells,
    handleCellClick,
    getCellClassName,
    hasBoardChanged
  };
}