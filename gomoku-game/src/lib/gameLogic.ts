export type GameCell = null | 'black' | 'white';
export type Player = 'black' | 'white';
export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface GameState {
  board: GameCell[][];
  currentTurn: Player;
  status: GameStatus;
  winner: Player | null;
  lastMove: { row: number; col: number } | null;
  firstHand?: Player; // 记录当前的先手方
}

export interface SwapRequest {
  fromPlayer: Player;
  requestType: 'swap' | 'keep';
  status: 'pending' | 'accepted' | 'rejected';
  requestedFirstHand?: Player;
}

export interface GameAction {
  type: 'move' | 'restart' | 'reset';
  payload?: {
    row?: number;
    col?: number;
  };
}

export interface Room {
  id: string;
  players: {
    black: string | null;
    white: string | null;
  };
  gameState: GameState;
  createdAt: Date;
}

export interface GameMessage {
  type: 'create_room' | 'join_room' | 'leave_room' | 'move' | 'restart_game' | 'game_state' | 'room_info' | 'error' | 'quick_match' | 'match_found';
  payload: any;
  timestamp: Date;
}

export class GameLogic {
  private static readonly BOARD_SIZE = 15;
  private static readonly WIN_COUNT = 5;

  static createEmptyBoard(): GameCell[][] {
    return Array(this.BOARD_SIZE).fill(null).map(() => Array(this.BOARD_SIZE).fill(null));
  }

  static createInitialGameState(firstHand: Player = 'black'): GameState {
    return {
      board: this.createEmptyBoard(),
      currentTurn: firstHand,
      status: 'waiting',
      winner: null,
      lastMove: null,
      firstHand: firstHand
    };
  }

  static makeMove(state: GameState, row: number, col: number, player: Player): GameState {
    if (state.board[row][col] !== null || state.status !== 'playing') {
      return state;
    }

    const newBoard = state.board.map((r, rowIndex) =>
      r.map((c, colIndex) => {
        if (rowIndex === row && colIndex === col) {
          return player;
        }
        return c;
      })
    );

    const winner = this.checkWinner(newBoard, row, col, player);
    const newStatus = winner ? 'ended' : 'playing';

    return {
      ...state,
      board: newBoard,
      currentTurn: player === 'black' ? 'white' : 'black',
      status: newStatus,
      winner,
      lastMove: { row, col }
    };
  }

  private static checkWinner(board: GameCell[][], row: number, col: number, player: Player): Player | null {
    const directions = [
      [[0, 1], [0, -1]],   // 水平
      [[1, 0], [-1, 0]],   // 垂直
      [[1, 1], [-1, -1]],  // 对角线
      [[1, -1], [-1, 1]]   // 反对角线
    ];

    for (const direction of directions) {
      let count = 1;
      
      for (const [dr, dc] of direction) {
        let r = row + dr;
        let c = col + dc;
        
        while (
          r >= 0 && r < this.BOARD_SIZE &&
          c >= 0 && c < this.BOARD_SIZE &&
          board[r][c] === player
        ) {
          count++;
          r += dr;
          c += dc;
        }
      }

      if (count >= this.WIN_COUNT) {
        return player;
      }
    }

    return null;
  }

  static restartGame(state: GameState, swapFirstHand: boolean = false): GameState {
    const newFirstHand = swapFirstHand ? (state.firstHand === 'black' ? 'white' : 'black') : state.firstHand;
    return {
      ...this.createInitialGameState(newFirstHand),
      status: 'playing'
    };
  }

  static isValidMove(board: GameCell[][], row: number, col: number): boolean {
    return (
      row >= 0 && row < this.BOARD_SIZE &&
      col >= 0 && col < this.BOARD_SIZE &&
      board[row][col] === null
    );
  }

  static isBoardFull(board: GameCell[][]): boolean {
    return board.every(row => row.every(cell => cell !== null));
  }
}