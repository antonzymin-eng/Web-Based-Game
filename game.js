// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const FRICTION = 0.8;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Game State
const gameState = {
    keys: {},
    enemies: [],
    platforms: [],
    particles: [],
    enemiesDefeated: 0,
    gameTime: 0,
    message: '',
    messageTimer: 0
};

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpPower = 12;
        this.isGrounded = false;
        this.direction = 1; // 1 = right, -1 = left

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
        this.attackRange = 50;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }

    update() {
        // Handle movement
        if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
            this.velocityX = -this.speed;
            this.direction = -1;
        } else if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
            this.velocityX = this.speed;
            this.direction = 1;
        } else {
            this.velocityX *= FRICTION;
        }

        // Handle jumping
        if ((gameState.keys[' '] || gameState.keys['ArrowUp'] || gameState.keys['w'] || gameState.keys['W']) && this.isGrounded) {
            this.velocityY = -this.jumpPower;
            this.isGrounded = false;
        }

        // Handle attack
        if (gameState.keys['f'] || gameState.keys['F']) {
            this.tryAttack();
        }

        // Apply gravity
        this.velocityY += GRAVITY;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Collision with ground
        if (this.y + this.height >= CANVAS_HEIGHT) {
            this.y = CANVAS_HEIGHT - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        }

        // Collision with platforms
        this.isGrounded = false;
        for (let platform of gameState.platforms) {
            if (this.checkPlatformCollision(platform)) {
                this.isGrounded = true;
            }
        }

        // Keep player in bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        // Update timers
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer === 0) {
                this.invulnerable = false;
            }
        }
    }

    checkPlatformCollision(platform) {
        if (this.velocityY >= 0 &&
            this.x + this.width > platform.x &&
            this.x < platform.x + platform.width &&
            this.y + this.height <= platform.y + 10 &&
            this.y + this.height + this.velocityY >= platform.y) {

            this.y = platform.y - this.height;
            this.velocityY = 0;
            return true;
        }
        return false;
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
        const attackX = this.direction === 1 ? this.x + this.width : this.x - this.attackRange;
        const distance = Math.abs((this.x + this.width / 2) - (enemy.x + enemy.width / 2));
        return distance < this.attackRange + enemy.width / 2 &&
               Math.abs((this.y + this.height / 2) - (enemy.y + enemy.height / 2)) < 50;
    }

    dealDamage(enemy) {
        const damage = Math.max(1, this.attack - enemy.defense / 2);
        enemy.takeDamage(damage);

        // Create hit particles
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

        // Increase stats
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
        this.x = 100;
        this.y = 100;
        this.velocityX = 0;
        this.velocityY = 0;
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 100;
        this.maxHealth = 100;
        this.health = 100;
        this.attack = 10;
        this.defense = 5;
        gameState.enemiesDefeated = 0;
        gameState.enemies = [];
        updateUI();
    }

    draw() {
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x - 2, this.y + this.height + 2, this.width + 4, 5);

        // Flash when invulnerable
        if (this.invulnerable && Math.floor(gameState.gameTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Head
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 + this.direction * 3, this.y + 9, 2, 0, Math.PI * 2);
        ctx.fill();

        // Attack indicator
        if (this.isAttacking) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            const attackX = this.direction === 1 ? this.x + this.width : this.x - this.attackRange;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.lineTo(attackX + (this.direction === 1 ? this.attackRange : 0), this.y + this.height / 2);
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
        this.height = 35;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 2;
        this.direction = -1;
        this.type = type;

        // Stats based on type
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
            this.color = '#ff3333';
        }

        this.aggroRange = 200;
        this.attackRange = 40;
        this.attackCooldown = 0;
        this.isGrounded = false;
        this.isDead = false;
    }

    update(player) {
        if (this.isDead) return;

        // AI: Move towards player if in range
        const distanceToPlayer = Math.abs((this.x + this.width / 2) - (player.x + player.width / 2));
        const verticalDistance = Math.abs((this.y + this.height / 2) - (player.y + player.height / 2));

        if (distanceToPlayer < this.aggroRange && verticalDistance < 100) {
            // Move towards player
            if (this.x < player.x) {
                this.velocityX = this.speed;
                this.direction = 1;
            } else {
                this.velocityX = -this.speed;
                this.direction = -1;
            }

            // Attack if in range
            if (distanceToPlayer < this.attackRange && verticalDistance < 50) {
                this.tryAttack(player);
                this.velocityX = 0;
            }
        } else {
            // Idle behavior
            this.velocityX *= FRICTION;
        }

        // Apply gravity
        this.velocityY += GRAVITY;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Collision with ground
        if (this.y + this.height >= CANVAS_HEIGHT) {
            this.y = CANVAS_HEIGHT - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        }

        // Collision with platforms
        for (let platform of gameState.platforms) {
            if (this.checkPlatformCollision(platform)) {
                this.isGrounded = true;
            }
        }

        // Keep in bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        // Update cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    checkPlatformCollision(platform) {
        if (this.velocityY >= 0 &&
            this.x + this.width > platform.x &&
            this.x < platform.x + platform.width &&
            this.y + this.height <= platform.y + 10 &&
            this.y + this.height + this.velocityY >= platform.y) {

            this.y = platform.y - this.height;
            this.velocityY = 0;
            return true;
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

        // Remove from enemies array
        const index = gameState.enemies.indexOf(this);
        if (index > -1) {
            gameState.enemies.splice(index, 1);
        }
    }

    draw() {
        if (this.isDead) return;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x - 2, this.y + this.height + 2, this.width + 4, 5);

        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 + this.direction * 5, this.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = this.width;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);

        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(this.x, this.y - 10, barWidth * healthPercent, barHeight);
    }
}

// Platform Class
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        // Platform shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);

        // Platform
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Platform highlight
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(this.x, this.y, this.width, 5);
    }
}

// Particle Class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() - 0.5) * 5;
        this.velocityY = (Math.random() - 0.5) * 5 - 2;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityY += 0.2;
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
    document.getElementById('player-level').textContent = player.level;
    document.getElementById('player-xp').textContent = player.xp;
    document.getElementById('player-xp-needed').textContent = player.xpNeeded;
    document.getElementById('player-attack').textContent = player.attack;
    document.getElementById('player-defense').textContent = player.defense;
    document.getElementById('enemies-defeated').textContent = gameState.enemiesDefeated;

    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
}

function spawnEnemy() {
    const side = Math.random() > 0.5 ? 1 : 0;
    const x = side === 1 ? CANVAS_WIDTH - 50 : 50;
    const y = 100;

    // Spawn stronger enemies as player levels up
    const type = player.level > 3 && Math.random() > 0.6 ? 'strong' : 'basic';

    gameState.enemies.push(new Enemy(x, y, type));
}

// Initialize platforms
function initPlatforms() {
    gameState.platforms = [
        new Platform(150, 450, 150, 20),
        new Platform(450, 400, 150, 20),
        new Platform(200, 300, 120, 20),
        new Platform(500, 250, 120, 20),
        new Platform(300, 500, 200, 20),
        new Platform(50, 350, 100, 20),
        new Platform(650, 350, 100, 20)
    ];
}

// Initialize game
const player = new Player(100, 100);
initPlatforms();

// Keyboard input
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// Game Loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update game time
    gameState.gameTime++;

    // Update and draw platforms
    for (let platform of gameState.platforms) {
        platform.draw();
    }

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

    // Spawn enemies periodically
    if (gameState.gameTime % 180 === 0 && gameState.enemies.length < 5) {
        spawnEnemy();
    }

    // Update message timer
    if (gameState.messageTimer > 0) {
        gameState.messageTimer--;
        if (gameState.messageTimer === 0) {
            document.getElementById('message-display').textContent = '';
        }
    }

    requestAnimationFrame(gameLoop);
}

// Start game
updateUI();
showMessage('Welcome! Defeat enemies to level up!');
setTimeout(() => spawnEnemy(), 2000);
gameLoop();
