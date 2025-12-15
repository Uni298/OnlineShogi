const socket = io();

// Game state
let roomCode = null;
let playerNumber = null;
let gameBoard = null;
let capturedPieces = { 1: [], 2: [] };
let currentTurn = 1;
let selectedCell = null;
let selectedCapturedPiece = null;
let validMoves = [];
let pendingPromotion = null;
let lastMove = null;

// Piece display mapping
const PIECE_DISPLAY = {
  'K': '王',
  'R': '飛',
  'B': '角',
  'G': '金',
  'S': '銀',
  'N': '桂',
  'L': '香',
  'P': '歩',
  '+R': '龍',
  '+B': '馬',
  '+S': '成銀',
  '+N': '成桂',
  '+L': '成香',
  '+P': 'と'
};

// DOM Elements
const roomScreen = document.getElementById('roomScreen');
const gameScreen = document.getElementById('gameScreen');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomInfo = document.getElementById('roomInfo');
const displayRoomCode = document.getElementById('displayRoomCode');
const board = document.getElementById('board');
const captured1 = document.getElementById('captured1');
const captured2 = document.getElementById('captured2');
const turn1 = document.getElementById('turn1');
const turn2 = document.getElementById('turn2');
const gameStatus = document.getElementById('gameStatus');
const checkStatus = document.getElementById('checkStatus');
const undoBtn = document.getElementById('undoBtn');
const resignBtn = document.getElementById('resignBtn');
const promotionDialog = document.getElementById('promotionDialog');
const promoteYes = document.getElementById('promoteYes');
const promoteNo = document.getElementById('promoteNo');
const undoDialog = document.getElementById('undoDialog');
const undoApprove = document.getElementById('undoApprove');
const undoDeny = document.getElementById('undoDeny');
const toast = document.getElementById('toast');

// Event Listeners
createRoomBtn.addEventListener('click', () => {
  socket.emit('createRoom');
});

joinRoomBtn.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length === 6) {
    socket.emit('joinRoom', code);
  } else {
    showToast('6文字のルームコードを入力してください', 'error');
  }
});

roomCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinRoomBtn.click();
  }
});

undoBtn.addEventListener('click', () => {
  if (playerNumber === currentTurn) {
    showToast('自分のターンでは待ったできません', 'error');
    return;
  }
  socket.emit('requestUndo', roomCode);
  showToast('待ったを要求しました...', 'success');
});

resignBtn.addEventListener('click', () => {
  if (confirm('本当に投了しますか？')) {
    showToast('投了しました', 'error');
    // Could implement resign functionality
  }
});

promoteYes.addEventListener('click', () => {
  if (pendingPromotion) {
    socket.emit('move', {
      roomCode,
      ...pendingPromotion,
      promote: true
    });
    promotionDialog.classList.add('hidden');
    pendingPromotion = null;
  }
});

promoteNo.addEventListener('click', () => {
  if (pendingPromotion) {
    socket.emit('move', {
      roomCode,
      ...pendingPromotion,
      promote: false
    });
    promotionDialog.classList.add('hidden');
    pendingPromotion = null;
  }
});

undoApprove.addEventListener('click', () => {
  socket.emit('undoResponse', { roomCode, approved: true });
  undoDialog.classList.add('hidden');
});

undoDeny.addEventListener('click', () => {
  socket.emit('undoResponse', { roomCode, approved: false });
  undoDialog.classList.add('hidden');
});

// Socket event handlers
socket.on('roomCreated', (data) => {
  roomCode = data.roomCode;
  playerNumber = data.playerNumber;
  displayRoomCode.textContent = roomCode;
  roomInfo.classList.remove('hidden');
  showToast('ルームを作成しました！', 'success');
});

socket.on('roomJoined', (data) => {
  roomCode = data.roomCode;
  playerNumber = data.playerNumber;
  showToast('ルームに参加しました！', 'success');
});

socket.on('gameStart', (data) => {
  gameBoard = data.board;
  capturedPieces = data.captured;
  currentTurn = data.currentTurn;
  
  roomScreen.classList.remove('active');
  gameScreen.classList.add('active');
  
  renderBoard();
  renderCapturedPieces();
  updateTurnIndicator();
  updateGameStatus();
  
  showToast('ゲーム開始！', 'success');
});

// Create SVG piece shape (traditional pentagon)
function createPieceSVG(pieceChar, isPromoted) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 120');
  svg.setAttribute('preserveAspectRatio', 'none');
  
  // Pentagon path (traditional Shogi piece shape)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M 50 5 L 95 35 L 85 115 L 15 115 L 5 35 Z');
  path.setAttribute('fill', isPromoted ? 'url(#promotedGradient)' : 'url(#normalGradient)');
  path.setAttribute('stroke', '#8b4513');
  path.setAttribute('stroke-width', '3');
  
  // Define gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Normal piece gradient
  const normalGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  normalGrad.setAttribute('id', 'normalGradient');
  normalGrad.setAttribute('x1', '0%');
  normalGrad.setAttribute('y1', '0%');
  normalGrad.setAttribute('x2', '0%');
  normalGrad.setAttribute('y2', '100%');
  
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('style', 'stop-color:#fff5e6;stop-opacity:1');
  
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('style', 'stop-color:#f5deb3;stop-opacity:1');
  
  normalGrad.appendChild(stop1);
  normalGrad.appendChild(stop2);
  
  // Promoted piece gradient
  const proGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  proGrad.setAttribute('id', 'promotedGradient');
  proGrad.setAttribute('x1', '0%');
  proGrad.setAttribute('y1', '0%');
  proGrad.setAttribute('x2', '0%');
  proGrad.setAttribute('y2', '100%');
  
  const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop3.setAttribute('offset', '0%');
  stop3.setAttribute('style', 'stop-color:#ffe4c4;stop-opacity:1');
  
  const stop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop4.setAttribute('offset', '100%');
  stop4.setAttribute('style', 'stop-color:#ffd700;stop-opacity:1');
  
  proGrad.appendChild(stop3);
  proGrad.appendChild(stop4);
  
  defs.appendChild(normalGrad);
  defs.appendChild(proGrad);
  svg.appendChild(defs);
  svg.appendChild(path);
  
  return svg;
}

socket.on('gameState', (data) => {
  gameBoard = data.board;
  capturedPieces = data.captured;
  currentTurn = data.currentTurn;
  lastMove = data.lastMove;
  
  renderBoard();
  renderCapturedPieces();
  updateTurnIndicator();
  updateGameStatus();
  
  if (data.inCheck) {
    checkStatus.classList.remove('hidden');
  } else {
    checkStatus.classList.add('hidden');
  }
  
  clearSelection();
});

socket.on('undoRequest', (data) => {
  undoDialog.classList.remove('hidden');
});

socket.on('undoResult', (data) => {
  if (data.approved) {
    gameBoard = data.board;
    capturedPieces = data.captured;
    currentTurn = data.currentTurn;
    
    renderBoard();
    renderCapturedPieces();
    updateTurnIndicator();
    updateGameStatus();
    
    showToast('待ったが承認されました', 'success');
  } else {
    showToast('待ったが拒否されました', 'error');
  }
  clearSelection();
});

socket.on('error', (message) => {
  showToast(message, 'error');
});

socket.on('playerDisconnected', () => {
  showToast('相手が切断しました', 'error');
  setTimeout(() => {
    location.reload();
  }, 3000);
});

// Render functions
function renderBoard() {
  board.innerHTML = '';
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      // Highlight last move
      if (lastMove) {
        if (lastMove.fromRow === row && lastMove.fromCol === col) {
          cell.classList.add('last-move', 'last-move-from');
        }
        if (lastMove.toRow === row && lastMove.toCol === col) {
          cell.classList.add('last-move', 'last-move-to');
        }
      }
      
      const piece = gameBoard[row][col];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece player-${piece.player}`;
        pieceEl.draggable = piece.player === playerNumber && currentTurn === playerNumber;
        
        // Create SVG shape
        const isPromoted = piece.type.startsWith('+');
        const svg = createPieceSVG(PIECE_DISPLAY[piece.type], isPromoted);
        pieceEl.appendChild(svg);
        
        // Add character text
        const charEl = document.createElement('div');
        charEl.className = 'piece-character';
        charEl.textContent = PIECE_DISPLAY[piece.type];
        pieceEl.appendChild(charEl);
        
        if (pieceEl.draggable) {
          pieceEl.addEventListener('dragstart', handleDragStart);
          pieceEl.addEventListener('dragend', handleDragEnd);
        }
        
        cell.appendChild(pieceEl);
      }
      
      cell.addEventListener('click', handleCellClick);
      cell.addEventListener('dragover', handleDragOver);
      cell.addEventListener('drop', handleDrop);
      
      board.appendChild(cell);
    }
  }
}

function renderCapturedPieces() {
  captured1.innerHTML = '';
  captured2.innerHTML = '';
  
  // Render player 1's captured pieces
  capturedPieces[1].forEach((piece, index) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'captured-piece';
    pieceEl.textContent = PIECE_DISPLAY[piece.type];
    pieceEl.dataset.type = piece.type;
    pieceEl.dataset.index = index;
    
    if (playerNumber === 1 && currentTurn === 1) {
      pieceEl.addEventListener('click', () => handleCapturedPieceClick(piece.type, 1));
    }
    
    captured1.appendChild(pieceEl);
  });
  
  // Render player 2's captured pieces
  capturedPieces[2].forEach((piece, index) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'captured-piece';
    pieceEl.textContent = PIECE_DISPLAY[piece.type];
    pieceEl.dataset.type = piece.type;
    pieceEl.dataset.index = index;
    
    if (playerNumber === 2 && currentTurn === 2) {
      pieceEl.addEventListener('click', () => handleCapturedPieceClick(piece.type, 2));
    }
    
    captured2.appendChild(pieceEl);
  });
}

function updateTurnIndicator() {
  if (currentTurn === 1) {
    turn1.classList.add('active');
    turn2.classList.remove('active');
  } else {
    turn1.classList.remove('active');
    turn2.classList.add('active');
  }
}

function updateGameStatus() {
  if (currentTurn === playerNumber) {
    gameStatus.textContent = 'あなたのターン';
    gameStatus.style.color = '#4ecca3';
  } else {
    gameStatus.textContent = '相手のターン';
    gameStatus.style.color = '#a8b2d1';
  }
}

// Interaction handlers
function handleCellClick(e) {
  const cell = e.currentTarget;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  
  // If we have a captured piece selected, try to drop it
  if (selectedCapturedPiece) {
    socket.emit('drop', {
      roomCode,
      row,
      col,
      pieceType: selectedCapturedPiece
    });
    clearSelection();
    return;
  }
  
  // If clicking on a valid move, make the move
  if (validMoves.some(m => m.row === row && m.col === col)) {
    makeMove(selectedCell.row, selectedCell.col, row, col);
    return;
  }
  
  // If clicking on own piece, select it
  const piece = gameBoard[row][col];
  if (piece && piece.player === playerNumber && currentTurn === playerNumber) {
    selectCell(row, col);
  } else {
    clearSelection();
  }
}

function handleCapturedPieceClick(pieceType, player) {
  if (player !== playerNumber || currentTurn !== playerNumber) return;
  
  clearSelection();
  selectedCapturedPiece = pieceType;
  
  // Highlight selected captured piece
  const capturedContainer = player === 1 ? captured1 : captured2;
  const pieces = capturedContainer.querySelectorAll('.captured-piece');
  pieces.forEach(p => {
    if (p.dataset.type === pieceType && !p.classList.contains('selected')) {
      p.classList.add('selected');
      return;
    }
  });
  
  // Show valid drop locations (all empty cells for now - server will validate)
  highlightValidDrops();
}

function selectCell(row, col) {
  clearSelection();
  
  selectedCell = { row, col };
  
  // Highlight selected cell
  const cells = board.querySelectorAll('.cell');
  cells.forEach(cell => {
    if (parseInt(cell.dataset.row) === row && parseInt(cell.dataset.col) === col) {
      cell.classList.add('selected');
    }
  });
  
  // Calculate and highlight valid moves
  validMoves = calculateValidMoves(row, col);
  highlightValidMoves();
}

function clearSelection() {
  selectedCell = null;
  selectedCapturedPiece = null;
  validMoves = [];
  
  const cells = board.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('selected', 'valid-move');
  });
  
  const capturedPiecesEls = document.querySelectorAll('.captured-piece');
  capturedPiecesEls.forEach(p => p.classList.remove('selected'));
}

function calculateValidMoves(row, col) {
  const piece = gameBoard[row][col];
  if (!piece) return [];
  
  const moves = [];
  const player = piece.player;
  const direction = player === 1 ? -1 : 1;
  
  // Simplified move calculation (server will validate)
  // This is just for UI feedback
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const target = gameBoard[r][c];
      if (!target || target.player !== player) {
        moves.push({ row: r, col: c });
      }
    }
  }
  
  return moves;
}

function highlightValidMoves() {
  validMoves.forEach(move => {
    const cells = board.querySelectorAll('.cell');
    cells.forEach(cell => {
      if (parseInt(cell.dataset.row) === move.row && 
          parseInt(cell.dataset.col) === move.col) {
        cell.classList.add('valid-move');
      }
    });
  });
}

function highlightValidDrops() {
  const cells = board.querySelectorAll('.cell');
  cells.forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (!gameBoard[row][col]) {
      cell.classList.add('valid-move');
    }
  });
}

function makeMove(fromRow, fromCol, toRow, toCol) {
  const piece = gameBoard[fromRow][fromCol];
  
  // Check if promotion is possible
  const canPromote = checkCanPromote(piece, fromRow, toRow);
  const mustPromote = checkMustPromote(piece, toRow);
  
  if (mustPromote) {
    // Automatically promote
    socket.emit('move', {
      roomCode,
      fromRow,
      fromCol,
      toRow,
      toCol,
      promote: true
    });
    clearSelection();
  } else if (canPromote) {
    // Ask player
    pendingPromotion = { fromRow, fromCol, toRow, toCol };
    promotionDialog.classList.remove('hidden');
  } else {
    // Normal move
    socket.emit('move', {
      roomCode,
      fromRow,
      fromCol,
      toRow,
      toCol,
      promote: false
    });
    clearSelection();
  }
}

function checkCanPromote(piece, fromRow, toRow) {
  if (piece.type.startsWith('+')) return false;
  if (piece.type === 'K' || piece.type === 'G') return false;
  
  const player = piece.player;
  const promotionZone = player === 1 ? [0, 1, 2] : [6, 7, 8];
  
  return promotionZone.includes(fromRow) || promotionZone.includes(toRow);
}

function checkMustPromote(piece, toRow) {
  const player = piece.player;
  
  if (piece.type === 'N') {
    if (player === 1 && toRow <= 1) return true;
    if (player === 2 && toRow >= 7) return true;
  }
  
  if (piece.type === 'L' || piece.type === 'P') {
    if (player === 1 && toRow === 0) return true;
    if (player === 2 && toRow === 8) return true;
  }
  
  return false;
}

// Drag and drop handlers
let draggedPiece = null;

function handleDragStart(e) {
  const cell = e.target.closest('.cell');
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  
  draggedPiece = { row, col };
  e.target.classList.add('dragging');
  
  selectCell(row, col);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedPiece = null;
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  
  if (!draggedPiece) return;
  
  const cell = e.currentTarget;
  const toRow = parseInt(cell.dataset.row);
  const toCol = parseInt(cell.dataset.col);
  
  if (validMoves.some(m => m.row === toRow && m.col === toCol)) {
    makeMove(draggedPiece.row, draggedPiece.col, toRow, toCol);
  }
  
  draggedPiece = null;
}

// Utility functions
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}
