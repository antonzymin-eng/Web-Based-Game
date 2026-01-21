// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 40;
const GRID_WIDTH = CANVAS_WIDTH / TILE_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / TILE_SIZE;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error('Canvas element not found!');
    throw new Error('Canvas element not found');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
    console.error('Could not get 2D context!');
    throw new Error('Could not get 2D context');
}

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Game State
const gameState = {
    keys: {},
    enemies: [],
    walls: [],
    doors: [],
    chests: [],
    particles: [],
    enemiesDefeated: 0,
    chestsOpened: 0,
    gameTime: 0,
    message: '',
    messageTimer: 0,
    currentRoom: 0,
    rooms: []
};

// Viewport Constants
const VIEWPORT_MIN_ZOOM = 0.5;
const VIEWPORT_MAX_ZOOM = 3.0;
const VIEWPORT_DEFAULT_ZOOM = 1.0;
const PINCH_ZOOM_SENSITIVITY = 0.01;
const WHEEL_ZOOM_STEP = 0.1;
const DOUBLE_TAP_DELAY = 300; // ms
const CAMERA_SMOOTHING = 0.15; // Lerp factor for smooth camera (0 = no smoothing, 1 = instant)

// Viewport State for zoom and pan
const viewport = {
    scale: VIEWPORT_DEFAULT_ZOOM,
    minScale: VIEWPORT_MIN_ZOOM,
    maxScale: VIEWPORT_MAX_ZOOM,
    offsetX: 0,        // Pan offset X
    offsetY: 0,        // Pan offset Y
    isDragging: false, // Is user dragging the viewport
    isZooming: false,  // Is user performing pinch zoom
    lastTouchDistance: 0, // Last distance between two touch points
    dragStartX: 0,     // Drag start position X
    dragStartY: 0,     // Drag start position Y
    lastTapTime: 0,    // For double-tap detection
    waitingForDoubleTap: false, // Prevents drag during double-tap window
    followPlayer: true, // Should camera follow player
    lastScale: 1       // Track last scale for zoom indicator optimization
};

// Room Templates
const roomTemplates = [
    {
        walls: [
            // Border walls (with gaps for doors)
            ...Array.from({ length: GRID_WIDTH }, (_, i) => i !== 10 ? { x: i, y: 0 } : null).filter(Boolean),
            ...Array.from({ length: GRID_WIDTH }, (_, i) => i !== 10 ? { x: i, y: GRID_HEIGHT - 1 } : null).filter(Boolean),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => ({ x: 0, y: i })),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => ({ x: GRID_WIDTH - 1, y: i })),
            // Interior walls
            { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
            { x: 14, y: 10 }, { x: 14, y: 11 }, { x: 14, y: 12 }
        ],
        doors: [{ x: 10, y: GRID_HEIGHT - 2, toRoom: 1 }],
        chests: [{ x: 3, y: 3, opened: false }],
        enemies: [
            { x: 12 * TILE_SIZE, y: 8 * TILE_SIZE, type: 'basic' },
            { x: 6 * TILE_SIZE, y: 10 * TILE_SIZE, type: 'basic' }
        ]
    },
    {
        walls: [
            ...Array.from({ length: GRID_WIDTH }, (_, i) => i !== 10 ? { x: i, y: 0 } : null).filter(Boolean),
            ...Array.from({ length: GRID_WIDTH }, (_, i) => ({ x: i, y: GRID_HEIGHT - 1 })),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => ({ x: 0, y: i })),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => i !== 8 ? { x: GRID_WIDTH - 1, y: i } : null).filter(Boolean),
            { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 }
        ],
        doors: [
            { x: 10, y: 1, toRoom: 0 },
            { x: GRID_WIDTH - 2, y: 8, toRoom: 2 }
        ],
        chests: [{ x: 15, y: 3, opened: false }],
        enemies: [
            { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE, type: 'strong' },
            { x: 13 * TILE_SIZE, y: 10 * TILE_SIZE, type: 'basic' },
            { x: 8 * TILE_SIZE, y: 3 * TILE_SIZE, type: 'basic' }
        ]
    },
    {
        walls: [
            ...Array.from({ length: GRID_WIDTH }, (_, i) => ({ x: i, y: 0 })),
            ...Array.from({ length: GRID_WIDTH }, (_, i) => ({ x: i, y: GRID_HEIGHT - 1 })),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => i !== 8 ? { x: 0, y: i } : null).filter(Boolean),
            ...Array.from({ length: GRID_HEIGHT }, (_, i) => ({ x: GRID_WIDTH - 1, y: i })),
            { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 },
            { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 14, y: 9 }
        ],
        doors: [{ x: 1, y: 8, toRoom: 1 }],
        chests: [
            { x: 10, y: 7, opened: false },
            { x: 17, y: 3, opened: false }
        ],
        enemies: [
            { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE, type: 'strong' },
            { x: 8 * TILE_SIZE, y: 4 * TILE_SIZE, type: 'strong' }
        ]
    }
];

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 3;
        this.direction = 0; // 0=down, 1=right, 2=up, 3=left

        // RPG Stats
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 100;
        this.maxHealth = 100;
        this.health = 100;
        this.attack = 10;
        this.defense = 5;

        // Combat
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackRange = 45;
        this.invulnerable = false;
        this.invulnerableTimer = 0;

        // Movement
        this.moving = false;
        this.targetX = x;
        this.targetY = y;
    }

    update() {
        // Handle movement from keyboard
        let dx = 0;
        let dy = 0;

        if (gameState.keys['ArrowUp'] || gameState.keys['w'] || gameState.keys['W']) {
            dy = -this.speed;
            this.direction = 2;
            this.moving = true;
        }
        if (gameState.keys['ArrowDown'] || gameState.keys['s'] || gameState.keys['S']) {
            dy = this.speed;
            this.direction = 0;
            this.moving = true;
        }
        if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
            dx = -this.speed;
            this.direction = 3;
            this.moving = true;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
            dx = this.speed;
            this.direction = 1;
            this.moving = true;
        }

        if (dx === 0 && dy === 0) {
            this.moving = false;
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Calculate new position
        const newX = this.x + dx;
        const newY = this.y + dy;

        // Check collision with walls
        if (!this.checkWallCollision(newX, this.y)) {
            this.x = newX;
        }
        if (!this.checkWallCollision(this.x, newY)) {
            this.y = newY;
        }

        // Keep player in bounds
        this.x = Math.max(TILE_SIZE, Math.min(this.x, CANVAS_WIDTH - TILE_SIZE - this.width));
        this.y = Math.max(TILE_SIZE, Math.min(this.y, CANVAS_HEIGHT - TILE_SIZE - this.height));

        // Check door collision
        this.checkDoorCollision();

        // Check chest collision
        this.checkChestCollision();

        // Handle attack
        if (gameState.keys[' '] || gameState.keys['Enter']) {
            this.tryAttack();
        }

        // Update timers
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer === 0) {
                this.invulnerable = false;
            }
        }
    }

    checkWallCollision(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        const gridX2 = Math.floor((x + this.width) / TILE_SIZE);
        const gridY2 = Math.floor((y + this.height) / TILE_SIZE);

        for (let wall of gameState.walls) {
            if ((wall.x === gridX && wall.y === gridY) ||
                (wall.x === gridX2 && wall.y === gridY) ||
                (wall.x === gridX && wall.y === gridY2) ||
                (wall.x === gridX2 && wall.y === gridY2)) {
                return true;
            }
        }
        return false;
    }

    checkDoorCollision() {
        const gridX = Math.floor((this.x + this.width / 2) / TILE_SIZE);
        const gridY = Math.floor((this.y + this.height / 2) / TILE_SIZE);

        for (let door of gameState.doors) {
            if (door.x === gridX && door.y === gridY) {
                loadRoom(door.toRoom);
                return;
            }
        }
    }

    checkChestCollision() {
        const gridX = Math.floor((this.x + this.width / 2) / TILE_SIZE);
        const gridY = Math.floor((this.y + this.height / 2) / TILE_SIZE);

        for (let chest of gameState.chests) {
            if (!chest.opened && chest.x === gridX && chest.y === gridY) {
                this.openChest(chest);
            }
        }
    }

    openChest(chest) {
        chest.opened = true;
        gameState.chestsOpened++;

        // Random reward
        const reward = Math.random();
        if (reward < 0.3) {
            // Health
            const healAmount = 30;
            this.health = Math.min(this.maxHealth, this.health + healAmount);
            showMessage(`Found health potion! +${healAmount} HP`);
        } else if (reward < 0.6) {
            // XP
            const xpAmount = 50;
            this.gainXP(xpAmount);
        } else {
            // Gold (just XP for now)
            const goldAmount = Math.floor(Math.random() * 50) + 25;
            this.gainXP(goldAmount);
            showMessage(`Found ${goldAmount} gold!`);
        }

        createParticles(chest.x * TILE_SIZE + TILE_SIZE / 2, chest.y * TILE_SIZE + TILE_SIZE / 2, '#ffd700', 15);
        updateUI();
    }

    tryAttack() {
        if (this.attackCooldown === 0 && !this.isAttacking) {
            this.isAttacking = true;
            this.attackCooldown = 30;

            // Check if hitting any enemies
            for (let enemy of gameState.enemies) {
                if (this.checkAttackHit(enemy)) {
                    this.dealDamage(enemy);
                }
            }

            setTimeout(() => {
                this.isAttacking = false;
            }, 200);
        }
    }

    checkAttackHit(enemy) {
        const distance = Math.sqrt(
            Math.pow((this.x + this.width / 2) - (enemy.x + enemy.width / 2), 2) +
            Math.pow((this.y + this.height / 2) - (enemy.y + enemy.height / 2), 2)
        );
        return distance < this.attackRange + enemy.width / 2;
    }

    dealDamage(enemy) {
        const damage = Math.max(1, this.attack - enemy.defense / 2);
        enemy.takeDamage(damage);
        createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0000', 5);
    }

    takeDamage(damage) {
        if (!this.invulnerable) {
            const actualDamage = Math.max(1, damage - this.defense / 2);
            this.health -= actualDamage;
            this.invulnerable = true;
            this.invulnerableTimer = 60;

            if (this.health <= 0) {
                this.health = 0;
                this.die();
            }

            updateUI();
            showMessage(`Took ${actualDamage.toFixed(0)} damage!`);
        }
    }

    gainXP(amount) {
        this.xp += amount;
        showMessage(`+${amount} XP!`);

        while (this.xp >= this.xpNeeded) {
            this.levelUp();
        }

        updateUI();
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpNeeded;
        this.xpNeeded = Math.floor(this.xpNeeded * 1.5);

        this.maxHealth += 20;
        this.health = this.maxHealth;
        this.attack += 5;
        this.defense += 2;

        showMessage(`LEVEL UP! Now level ${this.level}!`);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ffd700', 20);
        updateUI();
    }

    die() {
        showMessage('Game Over! Restarting...');
        setTimeout(() => {
            this.reset();
        }, 2000);
    }

    reset() {
        this.x = 3 * TILE_SIZE;
        this.y = 3 * TILE_SIZE;
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 100;
        this.maxHealth = 100;
        this.health = 100;
        this.attack = 10;
        this.defense = 5;
        gameState.enemiesDefeated = 0;
        gameState.chestsOpened = 0;
        loadRoom(0);
        updateUI();
    }

    draw() {
        // Flash when invulnerable
        if (this.invulnerable && Math.floor(gameState.gameTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Face direction indicator
        ctx.fillStyle = '#FFD700';
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const indicatorSize = 6;

        switch(this.direction) {
            case 0: // down
                ctx.fillRect(centerX - 3, this.y + this.height - 8, 6, 4);
                break;
            case 1: // right
                ctx.fillRect(this.x + this.width - 8, centerY - 3, 4, 6);
                break;
            case 2: // up
                ctx.fillRect(centerX - 3, this.y + 4, 6, 4);
                break;
            case 3: // left
                ctx.fillRect(this.x + 4, centerY - 3, 4, 6);
                break;
        }

        // Attack indicator
        if (this.isAttacking) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.attackRange, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }
}

// Enemy Class
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 1.5;
        this.type = type;

        if (type === 'basic') {
            this.maxHealth = 30;
            this.health = 30;
            this.attack = 8;
            this.defense = 2;
            this.xpReward = 25;
            this.color = '#ff6b6b';
        } else if (type === 'strong') {
            this.maxHealth = 60;
            this.health = 60;
            this.attack = 15;
            this.defense = 5;
            this.xpReward = 50;
            this.color = '#8b0000';
        }

        this.aggroRange = 200;
        this.attackRange = 35;
        this.attackCooldown = 0;
        this.isDead = false;
        this.moveTimer = 0;
    }

    update(player) {
        if (this.isDead) return;

        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.aggroRange) {
            // Move towards player
            if (distance > this.attackRange) {
                const angle = Math.atan2(dy, dx);
                const newX = this.x + Math.cos(angle) * this.speed;
                const newY = this.y + Math.sin(angle) * this.speed;

                if (!this.checkWallCollision(newX, this.y)) {
                    this.x = newX;
                }
                if (!this.checkWallCollision(this.x, newY)) {
                    this.y = newY;
                }
            } else {
                // Attack
                this.tryAttack(player);
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    checkWallCollision(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        const gridX2 = Math.floor((x + this.width) / TILE_SIZE);
        const gridY2 = Math.floor((y + this.height) / TILE_SIZE);

        for (let wall of gameState.walls) {
            if ((wall.x === gridX && wall.y === gridY) ||
                (wall.x === gridX2 && wall.y === gridY) ||
                (wall.x === gridX && wall.y === gridY2) ||
                (wall.x === gridX2 && wall.y === gridY2)) {
                return true;
            }
        }
        return false;
    }

    tryAttack(player) {
        if (this.attackCooldown === 0) {
            this.attackCooldown = 60;
            player.takeDamage(this.attack);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.isDead = true;
        gameState.enemiesDefeated++;
        player.gainXP(this.xpReward);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, this.color, 15);
        updateUI();

        const index = gameState.enemies.indexOf(this);
        if (index > -1) {
            gameState.enemies.splice(index, 1);
        }
    }

    draw() {
        if (this.isDead) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 8, this.y + 10, 5, 5);
        ctx.fillRect(this.x + 17, this.y + 10, 5, 5);

        // Health bar
        const barWidth = this.width;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);

        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(this.x, this.y - 8, barWidth * healthPercent, barHeight);
    }
}

// Particle Class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() - 0.5) * 5;
        this.velocityY = (Math.random() - 0.5) * 5;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.life--;
    }

    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

// Helper Functions
function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push(new Particle(x, y, color));
    }
}

function showMessage(text) {
    gameState.message = text;
    gameState.messageTimer = 120;
    document.getElementById('message-display').textContent = text;
}

function updateUI() {
    // Update quick HUD
    document.getElementById('quick-level').textContent = player.level;
    document.getElementById('quick-health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    const quickHealthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('quick-health-bar').style.width = quickHealthPercent + '%';

    // Update character menu
    document.getElementById('player-level').textContent = player.level;
    document.getElementById('player-xp').textContent = player.xp;
    document.getElementById('player-xp-needed').textContent = player.xpNeeded;
    document.getElementById('player-attack').textContent = player.attack;
    document.getElementById('player-defense').textContent = player.defense;
    document.getElementById('enemies-defeated').textContent = gameState.enemiesDefeated;
    document.getElementById('current-room').textContent = gameState.currentRoom + 1;

    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    const xpPercent = (player.xp / player.xpNeeded) * 100;
    document.getElementById('xp-bar').style.width = xpPercent + '%';
}

function updateZoomIndicator() {
    // Only update if scale actually changed
    if (Math.abs(viewport.scale - viewport.lastScale) < 0.001) {
        return;
    }

    viewport.lastScale = viewport.scale;
    const zoomPercent = Math.round(viewport.scale * 100);
    const zoomLevelElement = document.getElementById('zoom-level');
    const zoomIndicatorElement = document.getElementById('zoom-indicator');

    if (zoomLevelElement) {
        zoomLevelElement.textContent = zoomPercent;
    }

    // Fade out indicator if at default zoom
    // Change color based on camera mode
    if (zoomIndicatorElement) {
        if (Math.abs(viewport.scale - VIEWPORT_DEFAULT_ZOOM) < 0.01) {
            zoomIndicatorElement.style.opacity = '0.3';
        } else {
            zoomIndicatorElement.style.opacity = '1';
        }

        // Change border color to indicate manual camera mode
        if (viewport.followPlayer) {
            zoomIndicatorElement.style.borderColor = '#4CAF50'; // Green = following
            zoomIndicatorElement.style.color = '#4CAF50';
        } else {
            zoomIndicatorElement.style.borderColor = '#FFA500'; // Orange = manual
            zoomIndicatorElement.style.color = '#FFA500';
        }
    }
}

function loadRoom(roomIndex) {
    gameState.currentRoom = roomIndex;
    const room = roomTemplates[roomIndex];

    // Clear current entities
    gameState.walls = [];
    gameState.doors = [];
    gameState.chests = [];
    gameState.enemies = [];

    // Load walls
    room.walls.forEach(w => {
        gameState.walls.push({ x: w.x, y: w.y });
    });

    // Load doors
    room.doors.forEach(d => {
        gameState.doors.push({ x: d.x, y: d.y, toRoom: d.toRoom });
    });

    // Load chests
    room.chests.forEach(c => {
        gameState.chests.push({ x: c.x, y: c.y, opened: c.opened });
    });

    // Load enemies
    room.enemies.forEach(e => {
        gameState.enemies.push(new Enemy(e.x, e.y, e.type));
    });

    // Position player at door entrance
    if (roomIndex === 0) {
        player.x = 3 * TILE_SIZE;
        player.y = 3 * TILE_SIZE;
    } else if (roomIndex === 1) {
        player.x = 10 * TILE_SIZE;
        player.y = 2 * TILE_SIZE;
    } else if (roomIndex === 2) {
        player.x = 2 * TILE_SIZE;
        player.y = 8 * TILE_SIZE;
    }

    showMessage(`Entered room ${roomIndex + 1}`);
}

function drawWalls() {
    for (let wall of gameState.walls) {
        ctx.fillStyle = '#34495e';
        ctx.fillRect(wall.x * TILE_SIZE, wall.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Add some texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(wall.x * TILE_SIZE + 2, wall.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
}

function drawDoors() {
    for (let door of gameState.doors) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(door.x * TILE_SIZE, door.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(door.x * TILE_SIZE + 10, door.y * TILE_SIZE + 10, TILE_SIZE - 20, TILE_SIZE - 20);
    }
}

function drawChests() {
    for (let chest of gameState.chests) {
        if (chest.opened) {
            ctx.fillStyle = '#666';
        } else {
            ctx.fillStyle = '#8B4513';
        }
        ctx.fillRect(chest.x * TILE_SIZE + 5, chest.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);

        if (!chest.opened) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(chest.x * TILE_SIZE + 15, chest.y * TILE_SIZE + 15, 10, 5);
        }
    }
}

// Initialize game
const player = new Player(3 * TILE_SIZE, 3 * TILE_SIZE);
loadRoom(0);

// Keyboard input
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// Virtual Joystick Controls
function setupVirtualJoystick() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    const attackBtn = document.getElementById('btn-attack');

    if (!joystickBase || !joystickStick || !attackBtn) {
        console.error('Joystick or attack button elements not found!');
        return;
    }

    let joystickActive = false;
    let joystickCenterX = 0;
    let joystickCenterY = 0;
    const maxDistance = 35; // Maximum distance stick can move from center

    function getJoystickCenter() {
        const rect = joystickBase.getBoundingClientRect();
        joystickCenterX = rect.left + rect.width / 2;
        joystickCenterY = rect.top + rect.height / 2;
    }

    function handleJoystickStart(e) {
        e.preventDefault();
        joystickActive = true;
        getJoystickCenter();
        handleJoystickMove(e);
    }

    function handleJoystickMove(e) {
        if (!joystickActive) return;

        e.preventDefault();

        // Get touch/mouse position
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate offset from center
        let deltaX = clientX - joystickCenterX;
        let deltaY = clientY - joystickCenterY;

        // Calculate distance and angle
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Limit stick movement
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDistance;
            deltaY = Math.sin(angle) * maxDistance;
        }

        // Move the stick visually
        joystickStick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        // Convert to directional input
        const threshold = 15; // Minimum distance to register direction

        // Reset all directions
        gameState.keys['ArrowUp'] = false;
        gameState.keys['ArrowDown'] = false;
        gameState.keys['ArrowLeft'] = false;
        gameState.keys['ArrowRight'] = false;
        gameState.keys['w'] = false;
        gameState.keys['s'] = false;
        gameState.keys['a'] = false;
        gameState.keys['d'] = false;

        if (distance > threshold) {
            // Set directions based on angle
            const angle = Math.atan2(deltaY, deltaX);
            const degrees = angle * (180 / Math.PI);

            // Vertical
            if (deltaY < -threshold) {
                gameState.keys['ArrowUp'] = true;
                gameState.keys['w'] = true;
            } else if (deltaY > threshold) {
                gameState.keys['ArrowDown'] = true;
                gameState.keys['s'] = true;
            }

            // Horizontal
            if (deltaX < -threshold) {
                gameState.keys['ArrowLeft'] = true;
                gameState.keys['a'] = true;
            } else if (deltaX > threshold) {
                gameState.keys['ArrowRight'] = true;
                gameState.keys['d'] = true;
            }
        }
    }

    function handleJoystickEnd(e) {
        e.preventDefault();
        joystickActive = false;

        // Reset stick position
        joystickStick.style.transform = 'translate(-50%, -50%)';

        // Clear all directional keys
        gameState.keys['ArrowUp'] = false;
        gameState.keys['ArrowDown'] = false;
        gameState.keys['ArrowLeft'] = false;
        gameState.keys['ArrowRight'] = false;
        gameState.keys['w'] = false;
        gameState.keys['s'] = false;
        gameState.keys['a'] = false;
        gameState.keys['d'] = false;
    }

    // Joystick touch events
    joystickBase.addEventListener('touchstart', handleJoystickStart);
    joystickBase.addEventListener('touchmove', handleJoystickMove);
    joystickBase.addEventListener('touchend', handleJoystickEnd);

    // Joystick mouse events (for desktop testing)
    joystickBase.addEventListener('mousedown', handleJoystickStart);
    window.addEventListener('mousemove', handleJoystickMove);
    window.addEventListener('mouseup', handleJoystickEnd);

    // Attack button
    attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.keys[' '] = true;
    });

    attackBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.keys[' '] = false;
    });

    attackBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        gameState.keys[' '] = true;
    });

    attackBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        gameState.keys[' '] = false;
    });
}

// Character Menu Toggle
function setupCharacterMenu() {
    const charMenu = document.getElementById('char-menu');
    const charMenuBtn = document.getElementById('char-menu-btn');
    const charMenuClose = document.getElementById('char-menu-close');

    if (!charMenu || !charMenuBtn || !charMenuClose) {
        console.error('Character menu elements not found!');
        return;
    }

    function openMenu() {
        charMenu.classList.remove('hidden');
        updateUI(); // Refresh stats when opening
    }

    function closeMenu() {
        charMenu.classList.add('hidden');
    }

    charMenuBtn.addEventListener('click', openMenu);
    charMenuBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        openMenu();
    });

    charMenuClose.addEventListener('click', closeMenu);
    charMenuClose.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeMenu();
    });

    // Close when clicking outside
    charMenu.addEventListener('click', (e) => {
        if (e.target === charMenu) {
            closeMenu();
        }
    });
}

// Camera Follow System
function updateCameraFollow() {
    // Only update camera position when following player
    if (!viewport.followPlayer) {
        // In manual mode, just clamp the current offset
        clampPanOffset();
        return;
    }

    // Calculate player center position in world coordinates
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Calculate offset to center player on screen
    // Screen position = offsetX + worldX * scale
    // We want: CANVAS_WIDTH/2 = offsetX + playerCenterX * scale
    // Therefore: offsetX = CANVAS_WIDTH/2 - playerCenterX * scale
    const targetOffsetX = CANVAS_WIDTH / 2 - playerCenterX * viewport.scale;
    const targetOffsetY = CANVAS_HEIGHT / 2 - playerCenterY * viewport.scale;

    // Apply smooth camera movement with lerp
    viewport.offsetX += (targetOffsetX - viewport.offsetX) * CAMERA_SMOOTHING;
    viewport.offsetY += (targetOffsetY - viewport.offsetY) * CAMERA_SMOOTHING;

    // Clamp to keep world visible
    clampPanOffset();
}

function clampPanOffset() {
    // Calculate the scaled dimensions of the game world
    const scaledWidth = CANVAS_WIDTH * viewport.scale;
    const scaledHeight = CANVAS_HEIGHT * viewport.scale;

    if (viewport.scale > 1) {
        // Zoomed in: The game world is larger than the viewport
        // Allow panning, but keep edges within view
        const minOffsetX = -(scaledWidth - CANVAS_WIDTH);
        const minOffsetY = -(scaledHeight - CANVAS_HEIGHT);

        viewport.offsetX = Math.max(minOffsetX, Math.min(0, viewport.offsetX));
        viewport.offsetY = Math.max(minOffsetY, Math.min(0, viewport.offsetY));
    } else if (viewport.scale < 1) {
        // Zoomed out: The game world is smaller than the viewport
        // When following player, center on player; otherwise center world
        if (!viewport.followPlayer) {
            viewport.offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
            viewport.offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
        }
        // If following player, the offset is already set by updateCameraFollow
    } else {
        // At 1x zoom: Center on player if following, otherwise no offset
        if (!viewport.followPlayer) {
            viewport.offsetX = 0;
            viewport.offsetY = 0;
        }
    }
}

// Viewport Zoom and Pan Controls
function setupViewportControls() {
    const canvasWrapper = document.querySelector('.canvas-wrapper');

    if (!canvasWrapper) {
        console.error('Canvas wrapper not found!');
        return;
    }

    // Helper: Get distance between two touch points
    function getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Helper: Get center point between two touches
    function getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    // Helper: Check if point is within element bounds
    function isPointInElement(touch, element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return touch.clientX >= rect.left && touch.clientX <= rect.right &&
               touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    }

    // Helper: Check if touch is on canvas area (excluding UI controls)
    function isTouchOnCanvas(touch) {
        const canvasRect = canvas.getBoundingClientRect();
        const onCanvas = touch.clientX >= canvasRect.left && touch.clientX <= canvasRect.right &&
                        touch.clientY >= canvasRect.top && touch.clientY <= canvasRect.bottom;

        if (!onCanvas) return false;

        // Exclude touches on joystick and buttons
        const joystickBase = document.getElementById('joystick-base');
        const attackBtn = document.getElementById('btn-attack');
        const charMenuBtn = document.getElementById('char-menu-btn');

        return !isPointInElement(touch, joystickBase) &&
               !isPointInElement(touch, attackBtn) &&
               !isPointInElement(touch, charMenuBtn);
    }

    // Touch Start Handler
    function handleTouchStart(e) {
        // Only handle touches on canvas
        const touchesOnCanvas = Array.from(e.touches).filter(isTouchOnCanvas);
        if (touchesOnCanvas.length === 0) return;

        e.preventDefault();

        if (touchesOnCanvas.length === 2) {
            // Two fingers - prepare for zoom
            viewport.isZooming = true;
            viewport.isDragging = false;
            viewport.lastTouchDistance = getTouchDistance(touchesOnCanvas[0], touchesOnCanvas[1]);
        } else if (touchesOnCanvas.length === 1) {
            // Check for double-tap to reset zoom
            const now = Date.now();
            const isDoubleTap = now - viewport.lastTapTime < DOUBLE_TAP_DELAY;

            if (isDoubleTap && viewport.waitingForDoubleTap) {
                // Double tap detected - reset zoom and re-enable player follow
                viewport.scale = VIEWPORT_DEFAULT_ZOOM;
                viewport.followPlayer = true;
                viewport.lastTapTime = 0;
                viewport.isDragging = false;
                viewport.waitingForDoubleTap = false;
                showMessage('Zoom reset!');
                return;
            }

            // First tap - start waiting for potential double tap
            viewport.lastTapTime = now;
            viewport.waitingForDoubleTap = true;

            // One finger - prepare for pan
            // Save current offset as drag start point
            viewport.isDragging = true;
            viewport.isZooming = false;
            viewport.dragStartX = touchesOnCanvas[0].clientX - viewport.offsetX;
            viewport.dragStartY = touchesOnCanvas[0].clientY - viewport.offsetY;

            // Clear waiting flag after delay
            setTimeout(() => {
                viewport.waitingForDoubleTap = false;
            }, DOUBLE_TAP_DELAY);
        }
    }

    // Touch Move Handler
    function handleTouchMove(e) {
        const touchesOnCanvas = Array.from(e.touches).filter(isTouchOnCanvas);
        if (touchesOnCanvas.length === 0 && !viewport.isDragging && !viewport.isZooming) return;

        e.preventDefault();

        if (viewport.isZooming && touchesOnCanvas.length === 2) {
            // Pinch to zoom
            const currentDistance = getTouchDistance(touchesOnCanvas[0], touchesOnCanvas[1]);
            const distanceDelta = currentDistance - viewport.lastTouchDistance;

            // Calculate zoom factor based on pinch distance change
            const zoomDelta = distanceDelta * PINCH_ZOOM_SENSITIVITY;
            const oldScale = viewport.scale;
            viewport.scale = Math.max(viewport.minScale, Math.min(viewport.maxScale, viewport.scale + zoomDelta));

            // Disable player follow when manually zooming
            viewport.followPlayer = false;

            // Get center point of pinch for zoom origin
            const center = getTouchCenter(touchesOnCanvas[0], touchesOnCanvas[1]);
            const rect = canvas.getBoundingClientRect();
            const canvasX = center.x - rect.left;
            const canvasY = center.y - rect.top;

            // Adjust offset to zoom towards pinch center
            const scaleFactor = viewport.scale / oldScale;
            viewport.offsetX = canvasX - (canvasX - viewport.offsetX) * scaleFactor;
            viewport.offsetY = canvasY - (canvasY - viewport.offsetY) * scaleFactor;

            viewport.lastTouchDistance = currentDistance;
            clampPanOffset();
        } else if (viewport.isDragging && touchesOnCanvas.length === 1) {
            // Pan the viewport manually (disables player follow)
            viewport.followPlayer = false;

            // Update offset directly based on drag
            viewport.offsetX = touchesOnCanvas[0].clientX - viewport.dragStartX;
            viewport.offsetY = touchesOnCanvas[0].clientY - viewport.dragStartY;
            clampPanOffset();
        }
    }

    // Touch End Handler
    function handleTouchEnd(e) {
        e.preventDefault();
        const touchesOnCanvas = Array.from(e.touches).filter(isTouchOnCanvas);

        if (touchesOnCanvas.length < 2) {
            viewport.isZooming = false;
        }
        if (touchesOnCanvas.length === 0) {
            viewport.isDragging = false;
        } else if (touchesOnCanvas.length === 1 && !viewport.isZooming) {
            // Continue dragging with remaining finger
            viewport.isDragging = true;
            viewport.dragStartX = touchesOnCanvas[0].clientX - viewport.offsetX;
            viewport.dragStartY = touchesOnCanvas[0].clientY - viewport.offsetY;
        }
    }

    // Mouse Wheel Zoom (for desktop)
    function handleWheel(e) {
        if (!isTouchOnCanvas({ clientX: e.clientX, clientY: e.clientY })) return;

        e.preventDefault();

        const zoomDelta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
        const oldScale = viewport.scale;
        viewport.scale = Math.max(viewport.minScale, Math.min(viewport.maxScale, viewport.scale + zoomDelta));

        // Disable player follow when manually zooming
        viewport.followPlayer = false;

        // Zoom towards mouse position
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const scaleFactor = viewport.scale / oldScale;
        viewport.offsetX = canvasX - (canvasX - viewport.offsetX) * scaleFactor;
        viewport.offsetY = canvasY - (canvasY - viewport.offsetY) * scaleFactor;

        clampPanOffset();
    }

    // Attach event listeners to canvas wrapper
    canvasWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvasWrapper.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    canvasWrapper.addEventListener('wheel', handleWheel, { passive: false });
}

// Initialize game
function initGame() {
    setupVirtualJoystick();
    setupCharacterMenu();
    setupViewportControls();
    updateUI();
    showMessage('Welcome to the dungeon! Explore and defeat enemies!');
    gameLoop();
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Game Loop
function gameLoop() {
    gameState.gameTime++;

    // Update camera to follow player
    updateCameraFollow();

    // Save context state and apply viewport transformation
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    // Draw floor tiles
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#3a3a3a';
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if ((x + y) % 2 === 0) {
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw dungeon elements
    drawWalls();
    drawDoors();
    drawChests();

    // Update and draw player
    player.update();
    player.draw();

    // Update and draw enemies
    for (let enemy of gameState.enemies) {
        enemy.update(player);
        enemy.draw();
    }

    // Update and draw particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        particle.update();
        particle.draw();

        if (particle.isDead()) {
            gameState.particles.splice(i, 1);
        }
    }

    // Restore context state
    ctx.restore();

    // Update message timer
    if (gameState.messageTimer > 0) {
        gameState.messageTimer--;
        if (gameState.messageTimer === 0) {
            document.getElementById('message-display').textContent = '';
        }
    }

    // Update zoom indicator
    updateZoomIndicator();

    requestAnimationFrame(gameLoop);
}
