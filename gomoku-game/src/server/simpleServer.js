const { WebSocketServer } = require('ws');

// Simple room and player management
const rooms = new Map();
const players = new Map();
const waitingPlayers = [];

// Helper functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function createEmptyBoard() {
  return Array(15).fill(null).map(() => Array(15).fill(null));
}

function checkWinner(board, row, col, player) {
  const directions = [
    [[0, 1], [0, -1]],   // horizontal
    [[1, 0], [-1, 0]],   // vertical
    [[1, 1], [-1, -1]],  // diagonal
    [[1, -1], [-1, 1]]   // anti-diagonal
  ];

  for (const direction of directions) {
    let count = 1;
    
    for (const [dr, dc] of direction) {
      let r = row + dr;
      let c = col + dc;
      
      while (
        r >= 0 && r < 15 &&
        c >= 0 && c < 15 &&
        board[r][c] === player
      ) {
        count++;
        r += dr;
        c += dc;
      }
    }

    if (count >= 5) {
      return player;
    }
  }

  return null;
}

function makeMove(board, row, col, player) {
  if (board[row][col] !== null) return board;

  const newBoard = board.map((r, rowIndex) =>
    r.map((c, colIndex) => {
      if (rowIndex === row && colIndex === col) {
        return player;
      }
      return c;
    })
  );

  const winner = checkWinner(newBoard, row, col, player);

  return {
    board: newBoard,
    winner,
    status: winner ? 'ended' : 'playing',
    currentTurn: player === 'black' ? 'white' : 'black'
  };
}

// Create WebSocket server with CORS support
const wss = new WebSocketServer({ 
  port: 8080,
  verifyClient: (info) => {
    // Allow all connections for now
    return true;
  }
});
console.log('Game server running on ws://localhost:8080');

wss.on('connection', (ws) => {
  const playerId = generateId();
  players.set(ws, { playerId, roomId: null });

  console.log(`Player ${playerId} connected`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const player = players.get(ws);
      
      if (!player) return;

      switch (message.type) {
        case 'create_room':
          handleCreateRoom(ws, player);
          break;
        case 'join_room':
          handleJoinRoom(ws, player, message.payload.roomId);
          break;
        case 'leave_room':
          handleLeaveRoom(ws, player);
          break;
        case 'move':
          handleMove(ws, player, message.payload);
          break;
        case 'restart_game':
          handleRestartGame(ws, player);
          break;
        case 'quick_match':
          handleQuickMatch(ws, player);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws, player);
  });
});

function handleCreateRoom(ws, player) {
  const roomId = generateId();
  const room = {
    id: roomId,
    players: {
      black: player.playerId,
      white: null
    },
    gameState: {
      board: createEmptyBoard(),
      currentTurn: 'black',
      status: 'waiting',
      winner: null,
      lastMove: null
    },
    createdAt: new Date()
  };

  rooms.set(roomId, room);
  player.roomId = roomId;

  sendMessage(ws, {
    type: 'room_info',
    payload: {
      roomId,
      playerRole: 'black',
      opponentJoined: false,
      gameState: room.gameState
    },
    timestamp: new Date()
  });

  console.log(`Player ${player.playerId} created room ${roomId}`);
}

function handleJoinRoom(ws, player, roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    sendError(ws, 'Room not found');
    return;
  }

  if (room.players.black === null) {
    room.players.black = player.playerId;
    player.roomId = roomId;
    const role = 'black';
    sendRoomInfo(ws, room, role);
  } else if (room.players.white === null) {
    room.players.white = player.playerId;
    player.roomId = roomId;
    const role = 'white';
    room.gameState.status = 'playing';
    
    broadcastToRoom(roomId, {
      type: 'room_info',
      payload: {
        roomId,
        playerRole: role,
        opponentJoined: true,
        gameState: room.gameState
      },
      timestamp: new Date()
    });

    console.log(`Player ${player.playerId} joined room ${roomId} as ${role}`);
  } else {
    sendError(ws, 'Room is full');
  }
}

function handleQuickMatch(ws, player) {
  if (waitingPlayers.length > 0) {
    const opponentWs = waitingPlayers.shift();
    const opponent = players.get(opponentWs);
    
    if (opponent && !opponent.roomId) {
      const roomId = generateId();
      const room = {
        id: roomId,
        players: {
          black: opponent.playerId,
          white: player.playerId
        },
        gameState: {
          board: createEmptyBoard(),
          currentTurn: 'black',
          status: 'playing',
          winner: null,
          lastMove: null
        },
        createdAt: new Date()
      };

      rooms.set(roomId, room);
      player.roomId = roomId;
      opponent.roomId = roomId;

      sendMessage(ws, {
        type: 'match_found',
        payload: {
          roomId,
          playerRole: 'white',
          opponentJoined: true,
          gameState: room.gameState
        },
        timestamp: new Date()
      });

      sendMessage(opponentWs, {
        type: 'match_found',
        payload: {
          roomId,
          playerRole: 'black',
          opponentJoined: true,
          gameState: room.gameState
        },
        timestamp: new Date()
      });

      console.log(`Matched players ${player.playerId} and ${opponent.playerId} in room ${roomId}`);
    }
  } else {
    waitingPlayers.push(ws);
    sendMessage(ws, {
      type: 'quick_match',
      payload: { status: 'waiting' },
      timestamp: new Date()
    });
  }
}

function handleMove(ws, player, payload) {
  if (!player.roomId) return;

  const room = rooms.get(player.roomId);
  if (!room) return;

  const playerRole = getPlayerRole(room, player.playerId);
  if (!playerRole || room.gameState.currentTurn !== playerRole) {
    sendError(ws, 'Not your turn');
    return;
  }

  const result = makeMove(room.gameState.board, payload.row, payload.col, playerRole);
  
  room.gameState = {
    ...room.gameState,
    ...result,
    lastMove: { row: payload.row, col: payload.col }
  };

  broadcastToRoom(player.roomId, {
    type: 'game_state',
    payload: room.gameState,
    timestamp: new Date()
  });
}

function handleRestartGame(ws, player) {
  if (!player.roomId) return;

  const room = rooms.get(player.roomId);
  if (!room) return;

  room.gameState = {
    board: createEmptyBoard(),
    currentTurn: 'black',
    status: 'playing',
    winner: null,
    lastMove: null
  };

  broadcastToRoom(player.roomId, {
    type: 'game_state',
    payload: room.gameState,
    timestamp: new Date()
  });
}

function handleLeaveRoom(ws, player) {
  if (!player.roomId) return;

  const room = rooms.get(player.roomId);
  if (!room) return;

  if (room.players.black === player.playerId) {
    room.players.black = null;
  } else if (room.players.white === player.playerId) {
    room.players.white = null;
  }

  room.gameState = {
    board: createEmptyBoard(),
    currentTurn: 'black',
    status: 'waiting',
    winner: null,
    lastMove: null
  };

  player.roomId = null;

  broadcastToRoom(room.id, {
    type: 'room_info',
    payload: {
      roomId: room.id,
      opponentJoined: false,
      gameState: room.gameState
    },
    timestamp: new Date()
  }, ws);

  if (room.players.black === null && room.players.white === null) {
    rooms.delete(room.id);
  }
}

function handleDisconnect(ws, player) {
  console.log(`Player ${player.playerId} disconnected`);

  const waitingIndex = waitingPlayers.indexOf(ws);
  if (waitingIndex !== -1) {
    waitingPlayers.splice(waitingIndex, 1);
  }

  if (player && player.roomId) {
    handleLeaveRoom(ws, player);
  }

  players.delete(ws);
}

function getPlayerRole(room, playerId) {
  if (room.players.black === playerId) return 'black';
  if (room.players.white === playerId) return 'white';
  return null;
}

function sendRoomInfo(ws, room, playerRole) {
  const opponentJoined = room.players.black !== null && room.players.white !== null;
  
  sendMessage(ws, {
    type: 'room_info',
    payload: {
      roomId: room.id,
      playerRole,
      opponentJoined,
      gameState: room.gameState
    },
    timestamp: new Date()
  });
}

function broadcastToRoom(roomId, message, excludeWs) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const [ws, player] of players.entries()) {
    if (player.roomId === roomId && ws !== excludeWs && ws.readyState === 1) {
      sendMessage(ws, message);
    }
  }
}

function sendMessage(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws, error) {
  sendMessage(ws, {
    type: 'error',
    payload: { error },
    timestamp: new Date()
  });
}

module.exports = { GameServer: null };