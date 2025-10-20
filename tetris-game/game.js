// 游戏配置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const BLOCK_SIZE = 30;
const COLS = 10;
const ROWS = 20;
const COLORS = [
    null,
    '#FF6B6B', // I
    '#4ECDC4', // O
    '#45B7D1', // T
    '#FFA07A', // S
    '#98D8C8', // Z
    '#F7DC6F', // J
    '#BB8FCE'  // L
];

// 方块形状定义
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]], // Z
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]]  // L
];

// 游戏状态
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;
let dropSpeed = 1000;
let lastDropTime = 0;

// UI元素
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

// 初始化游戏板
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// 创建新方块
function createPiece() {
    const type = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[type],
        color: type + 1,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0
    };
}

// 绘制方块
function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = COLORS[color];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 8);
}

// 绘制游戏板
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // 绘制已固定的方块
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
    
    // 绘制当前方块
    if (currentPiece) {
        currentPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    drawBlock(ctx, currentPiece.x + dx, currentPiece.y + dy, currentPiece.color);
                }
            });
        });
    }
}

// 绘制下一个方块
function drawNextPiece() {
    nextCtx.fillStyle = '#fff';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) * BLOCK_SIZE / 2;
        const offsetY = (4 - nextPiece.shape.length) * BLOCK_SIZE / 2;
        
        nextPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    nextCtx.fillStyle = COLORS[nextPiece.color];
                    nextCtx.fillRect(
                        offsetX + dx * BLOCK_SIZE,
                        offsetY + dy * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                    nextCtx.strokeStyle = '#000';
                    nextCtx.lineWidth = 2;
                    nextCtx.strokeRect(
                        offsetX + dx * BLOCK_SIZE,
                        offsetY + dy * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            });
        });
    }
}

// 检查碰撞
function checkCollision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 旋转方块
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    
    const rotatedPiece = { ...piece, shape: rotated };
    
    if (!checkCollision(rotatedPiece)) {
        return rotatedPiece;
    }
    
    // 尝试墙踢
    for (let offset of [-1, 1, -2, 2]) {
        rotatedPiece.x = piece.x + offset;
        if (!checkCollision(rotatedPiece)) {
            return rotatedPiece;
        }
    }
    
    return piece;
}

// 固定方块
function lockPiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const y = currentPiece.y + dy;
                const x = currentPiece.x + dx;
                if (y >= 0) {
                    board[y][x] = currentPiece.color;
                }
            }
        });
    });
    
    // 检查消行
    clearLines();
    
    // 生成新方块
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    // 检查游戏结束
    if (checkCollision(currentPiece)) {
        gameOver();
    }
    
    drawNextPiece();
}

// 消除完整的行
function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // 重新检查当前行
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        linesElement.textContent = lines;
        
        // 计分：1行=100, 2行=300, 3行=500, 4行=800
        const points = [0, 100, 300, 500, 800][linesCleared];
        score += points * level;
        scoreElement.textContent = score;
        
        // 升级
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
        }
    }
}

// 移动方块
function movePiece(dx, dy) {
    if (!checkCollision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// 硬降
function hardDrop() {
    while (movePiece(0, 1)) {}
    lockPiece();
}

// 游戏主循环
function gameUpdate(timestamp) {
    if (!isGameRunning || isPaused) return;
    
    if (timestamp - lastDropTime > dropSpeed) {
        if (!movePiece(0, 1)) {
            lockPiece();
        }
        lastDropTime = timestamp;
    }
    
    drawBoard();
    gameLoop = requestAnimationFrame(gameUpdate);
}

// 游戏结束
function gameOver() {
    cancelAnimationFrame(gameLoop);
    isGameRunning = false;
    isPaused = false;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText(`消除行数: ${lines}`, canvas.width / 2, canvas.height / 2 + 60);
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    restartBtn.disabled = false;
}

// 开始游戏
function startGame() {
    if (isGameRunning) return;
    
    initBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 1000;
    isPaused = false;
    
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    isGameRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '暂停';
    restartBtn.disabled = false;
    
    drawNextPiece();
    lastDropTime = performance.now();
    gameLoop = requestAnimationFrame(gameUpdate);
}

// 暂停/继续
function togglePause() {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    
    if (isPaused) {
        cancelAnimationFrame(gameLoop);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂停中', canvas.width / 2, canvas.height / 2);
    } else {
        lastDropTime = performance.now();
        gameLoop = requestAnimationFrame(gameUpdate);
    }
}

// 重新开始
function restartGame() {
    cancelAnimationFrame(gameLoop);
    isGameRunning = false;
    isPaused = false;
    pauseBtn.textContent = '暂停';
    startGame();
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (!isGameRunning || isPaused) {
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1;
                scoreElement.textContent = score;
            }
            break;
        case 'ArrowUp':
        case ' ':
            currentPiece = rotate(currentPiece);
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    
    drawBoard();
    e.preventDefault();
});

// 按钮事件
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);

// 初始化显示
initBoard();
drawBoard();
drawNextPiece();