// Tetris Game - Advanced Implementation with Polish
// ==================================================

// Audio System
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
let masterVolume = parseFloat(localStorage.getItem('masterVolume') || '0.5');
let backgroundMusic = null;
let musicOscillator = null;

// Particle System
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        this.particles = [];
    }

    add(x, y, vx, vy, color) {
        this.particles.push({
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            color: color,
            life: 1,
            decay: Math.random() * 0.01 + 0.01
        });
    }

    createExplosion(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 3 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = ['#00ff88', '#00ccff', '#ffff00', '#ff00ff'][Math.floor(Math.random() * 4)];
            this.add(x, y, vx, vy, color);
        }
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.life -= p.decay;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            return p.life > 0;
        });
    }

    draw() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
    }
}

// Helper function to add floating score text
function addFloatingScore(text, x, y) {
    const floatingScores = document.getElementById('floatingScores');
    const scoreEl = document.createElement('div');
    scoreEl.className = 'floating-score';
    scoreEl.textContent = text;
    scoreEl.style.left = x + 'px';
    scoreEl.style.top = y + 'px';
    floatingScores.appendChild(scoreEl);
    
    setTimeout(() => scoreEl.remove(), 1000);
}
function playSound(frequency, duration, type = 'sine', volume = 1) {
    if (!soundEnabled) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        const finalVolume = masterVolume * volume;
        gainNode.gain.setValueAtTime(0.1 * finalVolume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * finalVolume, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Audio context might not be ready yet
    }
}

// Different sound effects
function playMoveSound() { playSound(200, 0.05); }
function playRotateSound() { playSound(300, 0.08); }
function playClearSound() { playSound(800, 0.15); }
function playTetrisSound() { playSound(1047, 0.1); playSound(1319, 0.1); playSound(1568, 0.2); }
function playLockSound() { playSound(400, 0.1); }
function playDropSound() { playSound(600, 0.08); }
function playGameOverSound() { playSound(200, 0.1); playSound(150, 0.2); }

// Background music
function initBackgroundMusic() {
    if (!musicEnabled || !audioContext) return;
    
    try {
        const now = audioContext.currentTime;
        const tempo = 0.5;
        
        // Simple melody pattern
        const pattern = [262, 330, 392, 494, 523]; // C D E G B notes
        
        function playNote(freq, startTime, duration) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.05 * masterVolume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01 * masterVolume, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        }
        
        // Schedule background music
        let time = audioContext.currentTime;
        for (let i = 0; i < pattern.length * 4; i++) {
            playNote(pattern[i % pattern.length], time, tempo);
            time += tempo;
        }
    } catch (e) {
        // Music init error
    }
}

// Tetromino Definitions
const TETROMINOES = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: '#00ffff',
        name: 'I'
    },
    O: {
        shape: [[1, 1], [1, 1]],
        color: '#ffff00',
        name: 'O'
    },
    T: {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#ff00ff',
        name: 'T'
    },
    S: {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: '#00ff00',
        name: 'S'
    },
    Z: {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: '#ff0000',
        name: 'Z'
    },
    J: {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: '#0000ff',
        name: 'J'
    },
    L: {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: '#ff6600',
        name: 'L'
    }
};

// Game Configuration
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const BLOCK_SIZE = 30;
const CANVAS_WIDTH = GRID_WIDTH * BLOCK_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * BLOCK_SIZE;

// DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate) Configuration
const DAS_DELAY = 100; // ms before auto-repeat starts
const ARR = 40; // ms between repeats

// Game State
const gameState = {
    grid: [],
    currentPiece: null,
    nextPiece: null,
    heldPiece: null,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    paused: false,
    highScore: parseInt(localStorage.getItem('tetrisHighScore') || '0'),
    hasHeldThisTurn: false,
    lastDropTime: Date.now(),
    
    // Advanced features
    combo: 0,
    lastLineClears: 0,
    backToBackTetris: false,
    lockDelay: 500, // ms before piece locks
    lockDelayTimer: 0,
    isLocking: false,
    
    // DAS/ARR
    dasCounter: 0,
    arrCounter: 0,
    lastMoveTime: 0,
    
    // Animations and particles
    particles: [],
    floatingScores: [],
    screenShakeAmount: 0
};

// Particle System
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.particles = [];
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    add(x, y, vx, vy, color, life = 600) {
        this.particles.push({ x, y, vx, vy, color, life, maxLife: life, alpha: 1 });
    }

    createExplosion(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            this.add(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#00ff88', 500);
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= deltaTime;
            p.alpha = p.life / p.maxLife;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 3, 3);
            this.ctx.restore();
        }
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Floating Score System
function addFloatingScore(text, x, y) {
    const scoreEl = document.createElement('div');
    scoreEl.className = 'floating-score';
    
    // Determine color based on score value
    let scoreClass = 'float-score-100';
    if (text.includes('800')) scoreClass = 'float-score-800';
    else if (text.includes('500')) scoreClass = 'float-score-500';
    else if (text.includes('300')) scoreClass = 'float-score-300';
    else if (text.includes('1600')) scoreClass = 'float-score-1600';
    
    scoreEl.classList.add(scoreClass);
    scoreEl.textContent = text;
    scoreEl.style.left = x + 'px';
    scoreEl.style.top = y + 'px';
    
    document.getElementById('floatingScores').appendChild(scoreEl);
    
    setTimeout(() => scoreEl.remove(), 1000);
}

// Game Engine
class TetrisGame {
    constructor() {
        this.initializeGrid();
        this.spawnPiece();
    }

    initializeGrid() {
        gameState.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
    }

    spawnPiece() {
        if (!gameState.nextPiece) {
            gameState.nextPiece = this.randomPiece();
        }
        
        gameState.currentPiece = gameState.nextPiece;
        gameState.nextPiece = this.randomPiece();
        gameState.hasHeldThisTurn = false;
        
        gameState.currentPiece.x = Math.floor((GRID_WIDTH - gameState.currentPiece.shape[0].length) / 2);
        gameState.currentPiece.y = 0;
        
        // Check for game over
        if (!this.canPlace(gameState.currentPiece)) {
            gameState.gameOver = true;
            endGame();
        }

        playLockSound();
    }

    randomPiece() {
        const keys = Object.keys(TETROMINOES);
        const key = keys[Math.floor(Math.random() * keys.length)];
        const tetromino = TETROMINOES[key];
        
        return {
            shape: tetromino.shape.map(row => [...row]),
            color: tetromino.color,
            name: tetromino.name,
            x: 0,
            y: 0,
            rotation: 0
        };
    }

    canPlace(piece, offsetX = 0, offsetY = 0) {
        const x = piece.x + offsetX;
        const y = piece.y + offsetY;

        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;

                    if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT) {
                        return false;
                    }

                    if (newY >= 0 && gameState.grid[newY][newX]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    gravityDrop() {
        if (this.canPlace(gameState.currentPiece, 0, 1)) {
            gameState.currentPiece.y++;
        } else {
            this.lockPiece();
        }
    }

    lockPiece() {
        const piece = gameState.currentPiece;

        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const y = piece.y + row;
                    const x = piece.x + col;

                    if (y >= 0) {
                        gameState.grid[y][x] = piece.color;
                    }
                }
            }
        }

        const linesCleared = this.clearLines();
        this.spawnPiece();

        if (linesCleared > 0) {
            playClearSound();
        }

        return linesCleared;
    }

    clearLines() {
        const linesToClear = [];

        for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
            if (gameState.grid[row].every(cell => cell !== 0)) {
                linesToClear.push(row);
            }
        }

        if (linesToClear.length > 0) {
            // Base scoring
            const baseScores = [0, 100, 300, 500, 800];
            let baseScore = baseScores[linesToClear.length] * gameState.level;
            
            // Combo bonus
            gameState.combo++;
            const comboBonus = Math.max(0, (gameState.combo - 1) * 50);
            
            // Back-to-back Tetris bonus
            let tetrisBonus = 0;
            if (linesToClear.length === 4) {
                playTetrisSound();
                if (gameState.backToBackTetris) {
                    tetrisBonus = 200 * gameState.level;
                }
                gameState.backToBackTetris = true;
            } else {
                gameState.backToBackTetris = false;
            }
            
            const totalScore = baseScore + comboBonus + tetrisBonus;
            gameState.score += totalScore;
            gameState.lines += linesToClear.length;
            gameState.lastLineClears = linesToClear.length;

            // Add floating score text
            addFloatingScore(`+${totalScore}`, 150, 150);
            
            if (gameState.combo > 1) {
                addFloatingScore(`COMBO x${gameState.combo}`, 150, 180);
            }

            // Update level
            const newLevel = Math.floor(gameState.lines / 10) + 1;
            if (newLevel > gameState.level) {
                gameState.level = newLevel;
                playSound(1000, 0.2);
            }

            // Screen shake effect
            particles.createExplosion(150, 300, 20);
            gameState.screenShakeAmount = 3;

            // Remove cleared lines
            linesToClear.sort((a, b) => b - a);
            linesToClear.forEach(row => {
                gameState.grid.splice(row, 1);
                gameState.grid.unshift(Array(GRID_WIDTH).fill(0));
            });
        } else {
            gameState.combo = 0;
        }

        return linesToClear.length;
    }

    rotatePiece() {
        const originalShape = gameState.currentPiece.shape;
        gameState.currentPiece.shape = this.rotateShape(gameState.currentPiece.shape);

        // Wall kick system
        if (!this.canPlace(gameState.currentPiece)) {
            for (let offset = 1; offset < 3; offset++) {
                if (this.canPlace(gameState.currentPiece, offset, 0)) {
                    gameState.currentPiece.x += offset;
                    playRotateSound();
                    return;
                }
                if (this.canPlace(gameState.currentPiece, -offset, 0)) {
                    gameState.currentPiece.x -= offset;
                    playRotateSound();
                    return;
                }
            }
            // Revert rotation if wall kick fails
            gameState.currentPiece.shape = originalShape;
        } else {
            playRotateSound();
        }
    }

    rotateShape(shape) {
        const n = shape.length;
        const rotated = Array(shape[0].length).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                rotated[j][n - 1 - i] = shape[i][j];
            }
        }

        return rotated;
    }

    holdPiece() {
        if (gameState.hasHeldThisTurn) {
            return;
        }

        playMoveSound();

        if (!gameState.heldPiece) {
            gameState.heldPiece = gameState.currentPiece;
            this.spawnPiece();
        } else {
            const temp = gameState.currentPiece;
            gameState.currentPiece = gameState.heldPiece;
            gameState.heldPiece = temp;

            gameState.currentPiece.x = Math.floor((GRID_WIDTH - gameState.currentPiece.shape[0].length) / 2);
            gameState.currentPiece.y = 0;
        }

        gameState.hasHeldThisTurn = true;
    }

    getGhostPiece() {
        const ghost = JSON.parse(JSON.stringify(gameState.currentPiece));
        
        while (this.canPlace(ghost, 0, 1)) {
            ghost.y++;
        }

        return ghost;
    }

    getDropDistance() {
        let distance = 0;
        while (this.canPlace(gameState.currentPiece, 0, distance + 1)) {
            distance++;
        }
        return distance;
    }

    hardDrop() {
        const distance = this.getDropDistance();
        gameState.currentPiece.y += distance;
        
        // Create trail particles
        for (let i = 0; i < distance; i ++) {
            particles.add(
                gameState.currentPiece.x * BLOCK_SIZE + BLOCK_SIZE / 2,
                gameState.currentPiece.y * BLOCK_SIZE + BLOCK_SIZE / 2,
                Math.random() * 4 - 2,
                Math.random() * 2,
                gameState.currentPiece.color
            );
        }
        
        playDropSound();
        gameState.score += distance * 2;
        this.lockPiece();
    }

    softDrop() {
        if (this.canPlace(gameState.currentPiece, 0, 1)) {
            gameState.currentPiece.y++;
            gameState.score += 1;
            playMoveSound();
        }
    }

    update(deltaTime) {
        if (gameState.gameOver || gameState.paused) {
            return;
        }

        const now = Date.now();
        
        // Speed calculation based on level
        const dropInterval = Math.max(100, 1000 - (gameState.level - 1) * 50);

        if (now - gameState.lastDropTime > dropInterval) {
            if (this.canPlace(gameState.currentPiece, 0, 1)) {
                gameState.currentPiece.y++;
                gameState.isLocking = false;
                gameState.lockDelayTimer = 0;
            } else {
                // Piece can't move down
                if (!gameState.isLocking) {
                    gameState.isLocking = true;
                    gameState.lockDelayTimer = now;
                } else if (now - gameState.lockDelayTimer > gameState.lockDelay) {
                    this.lockPiece();
                }
            }
            gameState.lastDropTime = now;
        }
    }
}

// Rendering
class TetrisRenderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.animationTime = 0;
    }

    drawGrid() {
        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.02)';
        
        for (let r = 0; r <= GRID_HEIGHT; r++) {
            this.ctx.fillRect(0, r * BLOCK_SIZE, CANVAS_WIDTH, 1);
        }
        
        for (let c = 0; c <= GRID_WIDTH; c++) {
            this.ctx.fillRect(c * BLOCK_SIZE, 0, 1, CANVAS_HEIGHT);
        }
    }

    drawBlock(x, y, color, ctx = this.ctx, size = BLOCK_SIZE, isActive = false) {
        if (color === 0) return;

        const cellX = x * size;
        const cellY = y * size;

        // Main block with gradient
        const gradient = ctx.createLinearGradient(cellX, cellY, cellX + size, cellY + size);
        gradient.addColorStop(0, this.lightenColor(color, 30));
        gradient.addColorStop(1, this.darkenColor(color, 30));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(cellX, cellY, size, size);

        // Inner highlight
        if (isActive) {
            ctx.fillStyle = this.lightenColor(color, 50);
            ctx.globalAlpha = 0.4;
            ctx.fillRect(cellX + 2, cellY + 2, size - 4, size - 4);
            ctx.globalAlpha = 1;
        }

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cellX, cellY, size, size);

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cellX, cellY, size, size);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.drawGrid();

        // Apply screen shake
        if (gameState.screenShakeAmount > 0) {
            const shake = gameState.screenShakeAmount;
            this.ctx.translate(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
            gameState.screenShakeAmount *= 0.9;
        }

        // Draw placed blocks
        for (let row = 0; row < gameState.grid.length; row++) {
            for (let col = 0; col < gameState.grid[row].length; col++) {
                if (gameState.grid[row][col]) {
                    this.drawBlock(col, row, gameState.grid[row][col]);
                }
            }
        }

        // Draw ghost piece
        const ghostPiece = game.getGhostPiece();
        for (let row = 0; row < ghostPiece.shape.length; row++) {
            for (let col = 0; col < ghostPiece.shape[row].length; col++) {
                if (ghostPiece.shape[row][col]) {
                    const x = ghostPiece.x + col;
                    const y = ghostPiece.y + row;

                    if (y >= 0) {
                        this.ctx.fillStyle = ghostPiece.color;
                        this.ctx.globalAlpha = 0.15;
                        this.drawBlock(x, y, ghostPiece.color);
                        this.ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // Draw current piece with enhanced glow
        if (gameState.currentPiece) {
            for (let row = 0; row < gameState.currentPiece.shape.length; row++) {
                for (let col = 0; col < gameState.currentPiece.shape[row].length; col++) {
                    if (gameState.currentPiece.shape[row][col]) {
                        const x = gameState.currentPiece.x + col;
                        const y = gameState.currentPiece.y + row;

                        if (y >= 0) {
                            this.drawBlock(x, y, gameState.currentPiece.color, this.ctx, BLOCK_SIZE, true);
                        }
                    }
                }
            }
        }

        this.ctx.resetTransform();
    }

    drawPreview(piece, ctx, canvasSize) {
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        
        if (!piece) {
            ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
            ctx.fillRect(0, 0, canvasSize, canvasSize);
            return;
        }

        const previewSize = canvasSize / 4;
        const offsetX = (canvasSize - piece.shape[0].length * previewSize) / 2;
        const offsetY = (canvasSize - piece.shape.length * previewSize) / 2;

        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    ctx.fillStyle = piece.color;
                    const x = offsetX + col * previewSize;
                    const y = offsetY + row * previewSize;
                    ctx.fillRect(x, y, previewSize, previewSize);

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, previewSize, previewSize);

                    // Small glow
                    ctx.shadowColor = piece.color;
                    ctx.shadowBlur = 8;
                    ctx.strokeStyle = piece.color;
                    ctx.globalAlpha = 0.4;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x, y, previewSize, previewSize);
                    ctx.globalAlpha = 1;
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    drawNextPiece() {
        this.drawPreview(gameState.nextPiece, this.nextCtx, this.nextCanvas.width);
    }

    drawHeldPiece() {
        this.drawPreview(gameState.heldPiece, this.holdCtx, this.holdCanvas.width);
    }

    updateScore() {
        const scoreEl = document.getElementById('scoreDisplay');
        const levelEl = document.getElementById('levelDisplay');
        const linesEl = document.getElementById('linesDisplay');
        
        scoreEl.textContent = gameState.score;
        levelEl.textContent = gameState.level;
        linesEl.textContent = gameState.lines;
        
        // Pulse animation on score update
        scoreEl.classList.add('pulse-score');
        setTimeout(() => scoreEl.classList.remove('pulse-score'), 300);
    }

    updateCombo() {
        const comboDisplay = document.getElementById('comboDisplay');
        if (gameState.combo > 1) {
            comboDisplay.style.display = 'block';
            document.getElementById('comboCount').textContent = gameState.combo;
        } else {
            comboDisplay.style.display = 'none';
        }
    }

    render() {
        this.drawBoard();
        this.drawNextPiece();
        this.drawHeldPiece();
        this.updateScore();
        this.updateCombo();
        this.animationTime++;
    }
}

// Input Handler
class InputHandler {
    constructor() {
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.softDropCounter = 0;
        this.setupEventListeners();
        this.detectMobileDevice();
    }

    detectMobileDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const touchControls = document.getElementById('touchControls');
        if (isMobile && touchControls) {
            touchControls.classList.add('visible');
            this.setupTouchButtons();
        }
    }

    setupTouchButtons() {
        document.getElementById('touchLeft').addEventListener('click', () => this.handleMove(-1));
        document.getElementById('touchRight').addEventListener('click', () => this.handleMove(1));
        document.getElementById('touchRotate').addEventListener('click', () => this.handleRotate());
        document.getElementById('touchDrop').addEventListener('click', () => this.handleHardDrop());
        document.getElementById('touchHold').addEventListener('click', () => this.handleHold());
    }

    handleMove(direction) {
        if (!gameState.paused && !gameState.gameOver && game.canPlace(gameState.currentPiece, direction, 0)) {
            gameState.currentPiece.x += direction;
            playMoveSound();
        }
    }

    handleRotate() {
        if (!gameState.paused && !gameState.gameOver) {
            game.rotatePiece();
        }
    }

    handleHardDrop() {
        if (!gameState.paused && !gameState.gameOver) {
            game.hardDrop();
        }
    }

    handleHold() {
        if (!gameState.paused && !gameState.gameOver) {
            game.holdPiece();
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    }

    handleKeyDown(e) {
        const wasKeyPressed = this.keys[e.key] === true;
        this.keys[e.key] = true;

        // Allow ArrowDown to repeat for continuous soft drop
        if (e.key === 'ArrowDown') {
            if (!gameState.paused && !gameState.gameOver) {
                game.softDrop();
            }
            e.preventDefault();
            return;
        }

        // For other keys, ignore if already pressed
        if (wasKeyPressed) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (!gameState.paused && !gameState.gameOver) {
                    this.handleMove(-1);
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
                if (!gameState.paused && !gameState.gameOver) {
                    this.handleMove(1);
                }
                e.preventDefault();
                break;
            case 'ArrowUp':
                if (!gameState.paused && !gameState.gameOver) {
                    this.handleRotate();
                }
                e.preventDefault();
                break;
            case ' ':
                if (!gameState.paused && !gameState.gameOver) {
                    this.handleHardDrop();
                }
                e.preventDefault();
                break;
            case 'Shift':
                if (!gameState.paused && !gameState.gameOver) {
                    this.handleHold();
                }
                e.preventDefault();
                break;
            case 'Escape':
                togglePause();
                e.preventDefault();
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - this.touchStartX;
        const diffY = touchEndY - this.touchStartY;
        const threshold = 50;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > threshold) {
                this.handleMove(1);
            } else if (diffX < -threshold) {
                this.handleMove(-1);
            }
        } else {
            if (diffY > threshold) {
                game.softDrop();
            } else if (diffY < -threshold) {
                this.handleRotate();
            }
        }
    }
}

// UI Manager
class UIManager {
    constructor() {
        this.setupMenuButtons();
        this.updateHighScore();
    }

    setupMenuButtons() {
        // Start Game
        document.getElementById('startBtn').addEventListener('click', () => startGame());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => showSettings());
        document.getElementById('backBtn').addEventListener('click', () => showMenu());
        
        // Sound Toggle
        document.getElementById('soundToggle').checked = soundEnabled;
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
            localStorage.setItem('soundEnabled', soundEnabled);
        });
        
        // Music Toggle
        document.getElementById('musicToggle').checked = musicEnabled;
        document.getElementById('musicToggle').addEventListener('change', (e) => {
            musicEnabled = e.target.checked;
            localStorage.setItem('musicEnabled', musicEnabled);
            if (musicEnabled) {
                initBackgroundMusic();
            }
        });
        
        // Volume Control
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            masterVolume = e.target.value / 100;
            localStorage.setItem('masterVolume', masterVolume);
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });
        document.getElementById('volumeSlider').value = Math.round(masterVolume * 100);
        document.getElementById('volumeValue').textContent = Math.round(masterVolume * 100) + '%';
        
        // Pause Menu
        document.getElementById('resumeGameBtn').addEventListener('click', () => togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => startGame());
        document.getElementById('mainMenuBtn').addEventListener('click', () => goToMenu());
        
        // Game Over
        document.getElementById('playAgainBtn').addEventListener('click', () => startGame());
        document.getElementById('mainMenuBtn2').addEventListener('click', () => goToMenu());
    }

    updateHighScore() {
        document.getElementById('menuHighScore').textContent = gameState.highScore;
    }

    updateGameOverScreen() {
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('finalLevel').textContent = gameState.level;
        document.getElementById('finalLines').textContent = gameState.lines;

        const newHighScoreMsg = document.getElementById('newHighScoreMsg');
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('tetrisHighScore', gameState.highScore);
            newHighScoreMsg.style.display = 'block';
            playSound(1319, 0.1);
            playSound(1568, 0.1);
        } else {
            newHighScoreMsg.style.display = 'none';
        }

        this.updateHighScore();
    }
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showSettings() {
    showScreen('settingsScreen');
}

function showMenu() {
    showScreen('menuScreen');
}

function startGame() {
    // Reset game state
    gameState.grid = [];
    gameState.currentPiece = null;
    gameState.nextPiece = null;
    gameState.heldPiece = null;
    gameState.score = 0;
    gameState.lines = 0;
    gameState.level = 1;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.hasHeldThisTurn = false;
    gameState.lastDropTime = Date.now();

    game = new TetrisGame();
    
    showScreen('gameScreen');
    document.getElementById('gameScreen').classList.add('active');
    
    // Hide resume button
    document.getElementById('resumeBtn').style.display = 'none';
    localStorage.removeItem('gameInProgress');
    
    // Start game loop
    gameLoop();
}

function resumeGame() {
    showScreen('gameScreen');
    document.getElementById('gameScreen').classList.add('active');
    gameLoop();
}

function goToMenu() {
    gameState.paused = true;
    document.getElementById('pauseMenu').style.display = 'none';
    showMenu();
}

function togglePause() {
    if (gameState.gameOver) return;
    
    gameState.paused = !gameState.paused;
    document.getElementById('pauseOverlay').style.display = gameState.paused ? 'flex' : 'none';
    document.getElementById('pauseMenu').style.display = gameState.paused ? 'flex' : 'none';

    if (!gameState.paused) {
        gameLoop();
    }
}

function endGame() {
    gameState.paused = true;
    ui.updateGameOverScreen();
    showScreen('gameOverScreen');
}

// Game Loop
let game = null;
let renderer = null;
let input = null;
let ui = null;
let particles = null;
let lastFrameTime = Date.now();
let gameLoopId = null;

function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;

    if (game && !gameState.paused && !gameState.gameOver) {
        game.update(deltaTime);
    }

    if (particles) {
        particles.update(deltaTime);
    }

    if (renderer) {
        renderer.render();
    }

    if (particles) {
        particles.draw();
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        if (screen.classList.contains('active')) {
            screen.classList.add('fade-out');
            setTimeout(() => {
                screen.classList.remove('active', 'fade-out');
            }, 500);
        }
    });
    setTimeout(() => {
        document.getElementById(screenId).classList.add('active');
    }, 100);
}

function showSettings() {
    showScreen('settingsScreen');
}

function showMenu() {
    showScreen('menuScreen');
}

function startGame() {
    // Cancel any existing game loop
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }

    // Reset game state
    gameState.grid = [];
    gameState.currentPiece = null;
    gameState.nextPiece = null;
    gameState.heldPiece = null;
    gameState.score = 0;
    gameState.lines = 0;
    gameState.level = 1;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.hasHeldThisTurn = false;
    gameState.combo = 0;
    gameState.backToBackTetris = false;
    gameState.lastDropTime = Date.now();
    gameState.particles = [];

    game = new TetrisGame();
    
    showScreen('gameScreen');
    
    // Reset timers
    lastFrameTime = Date.now();
    gameState.lastDropTime = Date.now();
    
    gameLoop();
}

function goToMenu() {
    gameState.paused = true;
    document.getElementById('pauseMenu').style.display = 'none';
    showMenu();
}

function togglePause() {
    if (gameState.gameOver) return;
    
    gameState.paused = !gameState.paused;
    document.getElementById('pauseOverlay').style.display = gameState.paused ? 'flex' : 'none';
    document.getElementById('pauseMenu').style.display = gameState.paused ? 'flex' : 'none';

    if (!gameState.paused) {
        lastFrameTime = Date.now();
        gameLoop();
    }
}

function endGame() {
    gameState.paused = true;
    ui.updateGameOverScreen();
    document.getElementById('gameCanvas').classList.add('game-over-slow-fade');
    setTimeout(() => {
        showScreen('gameOverScreen');
        document.getElementById('gameCanvas').classList.remove('game-over-slow-fade');
    }, 500);
}

// Press Any Key Screen
function initPressAnyKeyScreen() {
    document.addEventListener('keydown', () => {
        document.getElementById('pressAnyKeyScreen').classList.remove('active');
        showMenu();
    }, { once: true });
    
    document.addEventListener('click', () => {
        document.getElementById('pressAnyKeyScreen').classList.remove('active');
        showMenu();
    }, { once: true });
}

// Initialize
function initGame() {
    renderer = new TetrisRenderer();
    input = new InputHandler();
    ui = new UIManager();
    particles = new ParticleSystem('particleCanvas');
    
    initBackgroundMusic();
    initPressAnyKeyScreen();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
