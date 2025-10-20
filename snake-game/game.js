// 游戏配置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

// 游戏状态
let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;
let gameSpeed = 100;

// 初始化
highScoreElement.textContent = highScore;

// 游戏主循环
function gameUpdate() {
    if (isPaused) return;
    
    // 移动蛇
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        // 增加游戏速度
        if (score % 50 === 0 && gameSpeed > 50) {
            gameSpeed -= 5;
            clearInterval(gameLoop);
            gameLoop = setInterval(gameUpdate, gameSpeed);
        }
    } else {
        snake.pop();
    }
    
    draw();
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            const gradient = ctx.createLinearGradient(
                segment.x * gridSize,
                segment.y * gridSize,
                segment.x * gridSize + gridSize,
                segment.y * gridSize + gridSize
            );
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(1, '#22c55e');
            ctx.fillStyle = gradient;
        } else {
            // 蛇身
            ctx.fillStyle = '#10b981';
        }
        
        ctx.fillRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
        
        // 添加圆角效果
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
    });
    
    // 绘制食物
    const foodGradient = ctx.createRadialGradient(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        2,
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2
    );
    foodGradient.addColorStop(0, '#fbbf24');
    foodGradient.addColorStop(1, '#f59e0b');
    ctx.fillStyle = foodGradient;
    
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 生成食物
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    food = newFood;
}

// 检查碰撞
function checkCollision(head) {
    // 撞墙
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // 撞到自己
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

// 游戏结束
function gameOver() {
    clearInterval(gameLoop);
    isGameRunning = false;
    isPaused = false;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    restartBtn.disabled = false;
}

// 开始游戏
function startGame() {
    if (isGameRunning) return;
    
    snake = [{ x: 10, y: 10 }];
    dx = 1;
    dy = 0;
    score = 0;
    gameSpeed = 100;
    isPaused = false;
    
    scoreElement.textContent = score;
    generateFood();
    
    isGameRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    restartBtn.disabled = false;
    
    gameLoop = setInterval(gameUpdate, gameSpeed);
    draw();
}

// 暂停/继续游戏
function togglePause() {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂停中', canvas.width / 2, canvas.height / 2);
    }
}

// 重新开始
function restartGame() {
    clearInterval(gameLoop);
    isGameRunning = false;
    isPaused = false;
    pauseBtn.textContent = '暂停';
    startGame();
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (!isGameRunning || isPaused) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (dy === 0) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy === 0) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx === 0) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx === 0) { dx = 1; dy = 0; }
            break;
    }
    
    e.preventDefault();
});

// 按钮事件
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);

// 初始绘制
draw();