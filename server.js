const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Game rooms storage
const rooms = new Map();

// Piece types
const PIECES = {
  KING: "K",
  ROOK: "R",
  BISHOP: "B",
  GOLD: "G",
  SILVER: "S",
  KNIGHT: "N",
  LANCE: "L",
  PAWN: "P",
  // Promoted pieces
  PROMOTED_ROOK: "+R",
  PROMOTED_BISHOP: "+B",
  PROMOTED_SILVER: "+S",
  PROMOTED_KNIGHT: "+N",
  PROMOTED_LANCE: "+L",
  PROMOTED_PAWN: "+P",
};

// Initialize a new Shogi board
function createInitialBoard() {
  const board = Array(9)
    .fill(null)
    .map(() => Array(9).fill(null));

  // Player 1 (bottom, Sente - first player)
  board[8][4] = { type: PIECES.KING, player: 1 };
  board[8][0] = { type: PIECES.LANCE, player: 1 };
  board[8][1] = { type: PIECES.KNIGHT, player: 1 };
  board[8][2] = { type: PIECES.SILVER, player: 1 };
  board[8][3] = { type: PIECES.GOLD, player: 1 };
  board[8][5] = { type: PIECES.GOLD, player: 1 };
  board[8][6] = { type: PIECES.SILVER, player: 1 };
  board[8][7] = { type: PIECES.KNIGHT, player: 1 };
  board[8][8] = { type: PIECES.LANCE, player: 1 };
  board[7][1] = { type: PIECES.BISHOP, player: 1 };
  board[7][7] = { type: PIECES.ROOK, player: 1 };
  for (let i = 0; i < 9; i++) {
    board[6][i] = { type: PIECES.PAWN, player: 1 };
  }

  // Player 2 (top, Gote - second player)
  board[0][4] = { type: PIECES.KING, player: 2 };
  board[0][0] = { type: PIECES.LANCE, player: 2 };
  board[0][1] = { type: PIECES.KNIGHT, player: 2 };
  board[0][2] = { type: PIECES.SILVER, player: 2 };
  board[0][3] = { type: PIECES.GOLD, player: 2 };
  board[0][5] = { type: PIECES.GOLD, player: 2 };
  board[0][6] = { type: PIECES.SILVER, player: 2 };
  board[0][7] = { type: PIECES.KNIGHT, player: 2 };
  board[0][8] = { type: PIECES.LANCE, player: 2 };
  board[1][7] = { type: PIECES.BISHOP, player: 2 };
  board[1][1] = { type: PIECES.ROOK, player: 2 };
  for (let i = 0; i < 9; i++) {
    board[2][i] = { type: PIECES.PAWN, player: 2 };
  }

  return board;
}

// Check if a position is within board bounds
function isValidPosition(row, col) {
  return row >= 0 && row < 9 && col >= 0 && col < 9;
}

// Get possible moves for a piece
function getPossibleMoves(board, row, col, piece) {
  const moves = [];
  const player = piece.player;
  const direction = player === 1 ? -1 : 1; // Player 1 moves up (negative), Player 2 moves down (positive)

  switch (piece.type) {
    case PIECES.KING:
      // King moves one square in any direction
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (isValidPosition(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target || target.player !== player) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
      }
      break;

    case PIECES.ROOK:
      // Rook moves any number of squares horizontally or vertically
      const rookDirections = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dr, dc] of rookDirections) {
        for (let i = 1; i < 9; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.player !== player) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      break;

    case PIECES.BISHOP:
      // Bishop moves any number of squares diagonally
      const bishopDirections = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      for (const [dr, dc] of bishopDirections) {
        for (let i = 1; i < 9; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.player !== player) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      break;

    case PIECES.GOLD:
      // Gold moves one square in 6 directions (not diagonally backward)
      const goldMoves = [
        [direction, 0],
        [direction, 1],
        [direction, -1],
        [0, 1],
        [0, -1],
        [-direction, 0],
      ];
      for (const [dr, dc] of goldMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case PIECES.SILVER:
      // Silver moves one square diagonally or forward
      const silverMoves = [
        [direction, 0],
        [direction, 1],
        [direction, -1],
        [-direction, 1],
        [-direction, -1],
      ];
      for (const [dr, dc] of silverMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case PIECES.KNIGHT:
      // Knight moves two squares forward and one square to either side
      const knightMoves = [
        [2 * direction, 1],
        [2 * direction, -1],
      ];
      for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case PIECES.LANCE:
      // Lance moves any number of squares forward
      for (let i = 1; i < 9; i++) {
        const newRow = row + direction * i;
        const newCol = col;
        if (!isValidPosition(newRow, newCol)) break;
        const target = board[newRow][newCol];
        if (!target) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
      break;

    case PIECES.PAWN:
      // Pawn moves one square forward
      const newRow = row + direction;
      const newCol = col;
      if (isValidPosition(newRow, newCol)) {
        const target = board[newRow][newCol];
        if (!target || target.player !== player) {
          moves.push({ row: newRow, col: newCol });
        }
      }
      break;

    case PIECES.PROMOTED_ROOK:
      // Promoted Rook moves like Rook + King
      const proRookDirections = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dr, dc] of proRookDirections) {
        for (let i = 1; i < 9; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.player !== player) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      // Add diagonal one-square moves
      const diagMoves = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      for (const [dr, dc] of diagMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case PIECES.PROMOTED_BISHOP:
      // Promoted Bishop moves like Bishop + King
      const proBishopDirections = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      for (const [dr, dc] of proBishopDirections) {
        for (let i = 1; i < 9; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.player !== player) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      // Add orthogonal one-square moves
      const orthMoves = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dr, dc] of orthMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case PIECES.PROMOTED_SILVER:
    case PIECES.PROMOTED_KNIGHT:
    case PIECES.PROMOTED_LANCE:
    case PIECES.PROMOTED_PAWN:
      // All promoted pieces (except Rook and Bishop) move like Gold
      const proGoldMoves = [
        [direction, 0],
        [direction, 1],
        [direction, -1],
        [0, 1],
        [0, -1],
        [-direction, 0],
      ];
      for (const [dr, dc] of proGoldMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;
  }

  return moves;
}

// Check if a piece can be promoted
function canPromote(piece, fromRow, toRow) {
  if (piece.type.startsWith("+")) return false; // Already promoted
  if (piece.type === PIECES.KING || piece.type === PIECES.GOLD) return false; // Cannot promote

  const player = piece.player;
  const promotionZone = player === 1 ? [0, 1, 2] : [6, 7, 8];

  // Can promote if moving from or to promotion zone
  return promotionZone.includes(fromRow) || promotionZone.includes(toRow);
}

// Check if promotion is mandatory
function mustPromote(piece, toRow) {
  const player = piece.player;

  // Knight must promote if it reaches the last two rows
  if (piece.type === PIECES.KNIGHT) {
    if (player === 1 && toRow <= 1) return true;
    if (player === 2 && toRow >= 7) return true;
  }

  // Lance and Pawn must promote if they reach the last row
  if (piece.type === PIECES.LANCE || piece.type === PIECES.PAWN) {
    if (player === 1 && toRow === 0) return true;
    if (player === 2 && toRow === 8) return true;
  }

  return false;
}

// Promote a piece
function promotePiece(piece) {
  const promotionMap = {
    [PIECES.ROOK]: PIECES.PROMOTED_ROOK,
    [PIECES.BISHOP]: PIECES.PROMOTED_BISHOP,
    [PIECES.SILVER]: PIECES.PROMOTED_SILVER,
    [PIECES.KNIGHT]: PIECES.PROMOTED_KNIGHT,
    [PIECES.LANCE]: PIECES.PROMOTED_LANCE,
    [PIECES.PAWN]: PIECES.PROMOTED_PAWN,
  };

  return { ...piece, type: promotionMap[piece.type] || piece.type };
}

// Unpromote a piece (for captured pieces)
function unpromotePiece(piece) {
  const unpromotionMap = {
    [PIECES.PROMOTED_ROOK]: PIECES.ROOK,
    [PIECES.PROMOTED_BISHOP]: PIECES.BISHOP,
    [PIECES.PROMOTED_SILVER]: PIECES.SILVER,
    [PIECES.PROMOTED_KNIGHT]: PIECES.KNIGHT,
    [PIECES.PROMOTED_LANCE]: PIECES.LANCE,
    [PIECES.PROMOTED_PAWN]: PIECES.PAWN,
  };

  return { ...piece, type: unpromotionMap[piece.type] || piece.type };
}

// Check if a drop move is valid
function isValidDrop(board, row, col, piece, captured) {
  // Cannot drop on occupied square
  if (board[row][col]) return false;

  const player = piece.player;

  // Pawn restrictions
  if (piece.type === PIECES.PAWN) {
    // Cannot drop pawn on last row
    if ((player === 1 && row === 0) || (player === 2 && row === 8)) {
      return false;
    }

    // Cannot have two unpromoted pawns in same column (二歩 - nifu)
    for (let r = 0; r < 9; r++) {
      const p = board[r][col];
      if (p && p.player === player && p.type === PIECES.PAWN) {
        return false;
      }
    }

    // Cannot drop pawn for immediate checkmate (打ち歩詰め - uchifuzume)
    // This is a simplified check - full implementation would require checkmate detection
  }

  // Lance cannot drop on last row
  if (piece.type === PIECES.LANCE) {
    if ((player === 1 && row === 0) || (player === 2 && row === 8)) {
      return false;
    }
  }

  // Knight cannot drop on last two rows
  if (piece.type === PIECES.KNIGHT) {
    if ((player === 1 && row <= 1) || (player === 2 && row >= 7)) {
      return false;
    }
  }

  return true;
}

// Find king position
function findKing(board, player) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece && piece.player === player && piece.type === PIECES.KING) {
        return { row, col };
      }
    }
  }
  return null;
}

// Check if a player is in check
function isInCheck(board, player) {
  const kingPos = findKing(board, player);
  if (!kingPos) return false;

  const opponent = player === 1 ? 2 : 1;

  // Check if any opponent piece can attack the king
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece && piece.player === opponent) {
        const moves = getPossibleMoves(board, row, col, piece);
        if (moves.some((m) => m.row === kingPos.row && m.col === kingPos.col)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Check if a move would leave the player in check
function wouldBeInCheck(board, fromRow, fromCol, toRow, toCol, player) {
  // Create a copy of the board
  const testBoard = board.map((row) => [...row]);

  // Make the move
  testBoard[toRow][toCol] = testBoard[fromRow][fromCol];
  testBoard[fromRow][fromCol] = null;

  return isInCheck(testBoard, player);
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create a new game room
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    rooms.set(roomCode, {
      players: [socket.id],
      board: createInitialBoard(),
      captured: { 1: [], 2: [] },
      currentTurn: 1,
      gameStarted: false,
      moveHistory: [],
      undoRequest: null,
    });

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, playerNumber: 1 });
    console.log(`Room created: ${roomCode}`);
  });

  // Join an existing room
  socket.on("joinRoom", (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("error", "Room is full");
      return;
    }

    room.players.push(socket.id);
    room.gameStarted = true;
    socket.join(roomCode);

    socket.emit("roomJoined", { roomCode, playerNumber: 2 });

    // Notify both players that the game has started
    io.to(roomCode).emit("gameStart", {
      board: room.board,
      captured: room.captured,
      currentTurn: room.currentTurn,
    });

    console.log(`Player joined room: ${roomCode}`);
  });

  // Handle piece move
  socket.on("move", ({ roomCode, fromRow, fromCol, toRow, toCol, promote }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const playerNumber = room.players.indexOf(socket.id) + 1;
    if (playerNumber !== room.currentTurn) {
      socket.emit("error", "Not your turn");
      return;
    }

    const piece = room.board[fromRow][fromCol];
    if (!piece || piece.player !== playerNumber) {
      socket.emit("error", "Invalid move");
      return;
    }

    // Check if move is valid
    const possibleMoves = getPossibleMoves(room.board, fromRow, fromCol, piece);
    const isValidMove = possibleMoves.some(
      (m) => m.row === toRow && m.col === toCol
    );

    if (!isValidMove) {
      socket.emit("error", "Invalid move");
      return;
    }

    // Check if move would leave player in check
    if (
      wouldBeInCheck(room.board, fromRow, fromCol, toRow, toCol, playerNumber)
    ) {
      socket.emit("error", "Move would leave you in check");
      return;
    }

    // Save move for undo
    const moveData = {
      fromRow,
      fromCol,
      toRow,
      toCol,
      piece: { ...piece },
      captured: room.board[toRow][toCol]
        ? { ...room.board[toRow][toCol] }
        : null,
      promoted: false,
    };

    // Capture piece if present
    if (room.board[toRow][toCol]) {
      const capturedPiece = unpromotePiece(room.board[toRow][toCol]);
      capturedPiece.player = playerNumber; // Change ownership
      room.captured[playerNumber].push(capturedPiece);
    }

    // Move piece
    room.board[toRow][toCol] = piece;
    room.board[fromRow][fromCol] = null;

    // Handle promotion
    if (promote && canPromote(piece, fromRow, toRow)) {
      room.board[toRow][toCol] = promotePiece(piece);
      moveData.promoted = true;
    } else if (mustPromote(piece, toRow)) {
      room.board[toRow][toCol] = promotePiece(piece);
      moveData.promoted = true;
    }

    room.moveHistory.push(moveData);
    room.currentTurn = room.currentTurn === 1 ? 2 : 1;
    room.undoRequest = null;

    // Check for check/checkmate
    const opponent = playerNumber === 1 ? 2 : 1;
    const inCheck = isInCheck(room.board, opponent);

    io.to(roomCode).emit("gameState", {
      board: room.board,
      captured: room.captured,
      currentTurn: room.currentTurn,
      inCheck,
      lastMove: { fromRow, fromCol, toRow, toCol },
    });
  });

  // Handle drop move (placing captured piece)
  socket.on("drop", ({ roomCode, row, col, pieceType }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const playerNumber = room.players.indexOf(socket.id) + 1;
    if (playerNumber !== room.currentTurn) {
      socket.emit("error", "Not your turn");
      return;
    }

    // Find the piece in captured pieces
    const capturedIndex = room.captured[playerNumber].findIndex(
      (p) => p.type === pieceType
    );
    if (capturedIndex === -1) {
      socket.emit("error", "Piece not in hand");
      return;
    }

    const piece = room.captured[playerNumber][capturedIndex];

    // Validate drop
    if (
      !isValidDrop(room.board, row, col, piece, room.captured[playerNumber])
    ) {
      socket.emit("error", "Invalid drop");
      return;
    }

    // Save move for undo
    const moveData = {
      isDrop: true,
      row,
      col,
      piece: { ...piece },
      capturedIndex,
    };

    // Place piece
    room.board[row][col] = piece;
    room.captured[playerNumber].splice(capturedIndex, 1);

    room.moveHistory.push(moveData);
    room.currentTurn = room.currentTurn === 1 ? 2 : 1;
    room.undoRequest = null;

    const opponent = playerNumber === 1 ? 2 : 1;
    const inCheck = isInCheck(room.board, opponent);

    io.to(roomCode).emit("gameState", {
      board: room.board,
      captured: room.captured,
      currentTurn: room.currentTurn,
      inCheck,
    });
  });

  // Handle undo request
  socket.on("requestUndo", (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const playerNumber = room.players.indexOf(socket.id) + 1;

    if (room.moveHistory.length === 0) {
      socket.emit("error", "No moves to undo");
      return;
    }

    room.undoRequest = playerNumber;
    const opponent = room.players[playerNumber === 1 ? 1 : 0];
    io.to(opponent).emit("undoRequest", { from: playerNumber });
  });

  // Handle undo response
  socket.on("undoResponse", ({ roomCode, approved }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (!room.undoRequest) return;

    if (approved && room.moveHistory.length > 0) {
      const lastMove = room.moveHistory.pop();

      if (lastMove.isDrop) {
        // Undo drop
        room.board[lastMove.row][lastMove.col] = null;
        room.captured[lastMove.piece.player].splice(
          lastMove.capturedIndex,
          0,
          lastMove.piece
        );
      } else {
        // Undo regular move
        room.board[lastMove.fromRow][lastMove.fromCol] = lastMove.piece;
        room.board[lastMove.toRow][lastMove.toCol] = lastMove.captured;

        // Remove captured piece if it was captured
        if (lastMove.captured) {
          const capturedPieces = room.captured[lastMove.piece.player];
          const index = capturedPieces.findIndex(
            (p) =>
              p.type === lastMove.captured.type &&
              p.player === lastMove.piece.player
          );
          if (index !== -1) {
            capturedPieces.splice(index, 1);
          }
        }
      }

      room.currentTurn = room.currentTurn === 1 ? 2 : 1;
    }

    room.undoRequest = null;

    io.to(roomCode).emit("undoResult", {
      approved,
      board: room.board,
      captured: room.captured,
      currentTurn: room.currentTurn,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Find and clean up rooms
    for (const [roomCode, room] of rooms.entries()) {
      if (room.players.includes(socket.id)) {
        io.to(roomCode).emit("playerDisconnected");
        rooms.delete(roomCode);
      }
    }
  });
});

http.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
