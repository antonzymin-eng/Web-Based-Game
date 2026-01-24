// ============================================================================
// DUNGEON CRAWLER RPG - Main Game File
// ============================================================================
// Phase 0: Time-Based System Implemented
// - All cooldowns converted from frames to milliseconds
// - Movement uses scaledDelta for consistent speed across frame rates
// - Support for slow-motion effects via timeScale
// ============================================================================

// ============================================================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ============================================================================

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 40;
const GRID_WIDTH = CANVAS_WIDTH / TILE_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / TILE_SIZE;

// Attribute System Constants
const ATTRIBUTE_CAP = 100;
const ATTRIBUTE_POINTS_PER_LEVEL = 3;
const FUTURE_ATTRIBUTES = ['intelligence', 'wisdom'];
const MAGIC_ATTR_WARNING_KEY = 'hasSeenMagicAttrWarning';

// Time System Constants (Phase 0)
const BASELINE_FRAME_TIME = 16.67; // 1 frame at 60 FPS in milliseconds (used for movement normalization)
const MAX_DELTA_TIME = 100;        // Maximum deltaTime cap (100ms = 10 FPS minimum, prevents physics explosion)

// Combat Constants
const ENEMY_ATTACK_COOLDOWN = 1000; // 1 second in milliseconds (was 60 frames @ 60 FPS)
const DODGE_PARTICLE_COLOR = '#88ff88'; // Soft green for dodge visual feedback

// Magic System Constants (Phase 1)
const MAGIC_CONSTANTS = {
    BASE_MANA: 150,
    BASE_MANA_REGEN: 3.0, // per second
    GLOBAL_COOLDOWN: 500, // milliseconds
    TARGETING_MODES: {
        INSTANT: 'instant',           // No targeting needed
        INSTANT_SELF: 'instant_self', // Self-cast (heal, buff)
        ENEMY_TARGET: 'enemy_target', // Uses tab-target system
        CIRCLE_AOE: 'circle_aoe',     // Movable circle
        CONE: 'cone',                 // Cone from player
        LINE: 'line',                 // Line from player
        LINE_GROUND: 'line_ground'    // Line independent of player
    },
    PARTICLE_POOL_SIZE: 300 // Max active particles
}

// Ability Definitions (Phase 2)
const ABILITIES = {
    magic_missile: {
        id: 'magic_missile',
        name: 'Magic Missile',
        icon: '✨',
        description: 'Fire a magical projectile at your target',
        manaCost: 10,
        cooldown: 1500,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET,
        range: 250,
        damage: 15,
        color: '#9c27b0',
        unlockLevel: 1
    },

    fireball: {
        id: 'fireball',
        name: 'Fireball',
        icon: '🔥',
        description: 'Hurl a fireball that explodes in an area',
        manaCost: 25,
        cooldown: 3000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.CIRCLE_AOE,
        range: 300,
        radius: 60,
        damage: 30,
        color: '#ff6600',
        unlockLevel: 2
    },

    frost_nova: {
        id: 'frost_nova',
        name: 'Frost Nova',
        icon: '❄️',
        description: 'Freeze enemies around you',
        manaCost: 30,
        cooldown: 4000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF,
        range: 0,
        radius: 100,
        damage: 20,
        slow: 0.5,           // 50% slow
        slowDuration: 2000,  // 2 seconds
        color: '#00bfff',
        unlockLevel: 3
    },

    lightning_bolt: {
        id: 'lightning_bolt',
        name: 'Lightning Bolt',
        icon: '⚡',
        description: 'Strike in a line from your position',
        manaCost: 20,
        cooldown: 2500,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.LINE,
        range: 250,
        width: 30,
        damage: 35,
        color: '#ffeb3b',
        unlockLevel: 4
    },

    arcane_blast: {
        id: 'arcane_blast',
        name: 'Arcane Blast',
        icon: '💫',
        description: 'Powerful single-target spell',
        manaCost: 35,
        cooldown: 4500,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET,
        range: 200,
        damage: 50,
        color: '#b388ff',
        unlockLevel: 5
    },

    flame_strike: {
        id: 'flame_strike',
        name: 'Flame Strike',
        icon: '💥',
        description: 'Call down flames in a line',
        manaCost: 40,
        cooldown: 5000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.LINE_GROUND,
        range: 400,
        width: 60,
        length: 200,
        damage: 45,
        color: '#ff3d00',
        unlockLevel: 6
    },

    flame_breath: {
        id: 'flame_breath',
        name: 'Flame Breath',
        icon: '🔥',
        description: 'Breathe fire in a cone',
        manaCost: 35,
        cooldown: 5000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.CONE,
        range: 180,
        angle: 60,  // 60-degree cone
        damage: 40,
        color: '#ff4500',
        unlockLevel: 7
    },

    healing_light: {
        id: 'healing_light',
        name: 'Healing Light',
        icon: '💚',
        description: 'Restore health instantly',
        manaCost: 35,
        cooldown: 8000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF,
        healing: 60,
        color: '#4caf50',
        unlockLevel: 3
    }
}

// ============================================================================
// SECTION 2: CANVAS & RENDERING SETUP
// ============================================================================

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
// ============================================================================
// SECTION 3: GAME STATE
// ============================================================================

const gameState = {
    keys: {},
    enemies: [],
    selectedEnemy: null, // Currently targeted enemy for tab targeting
    walls: [],
    doors: [],
    chests: [],
    particles: [],
    enemiesDefeated: 0,
    chestsOpened: 0,

    // Time tracking (Phase 0: Time-based system)
    gameTime: 0,           // Frame counter (increments by 1) - keep for visual effects
    elapsedTime: 0,        // Total elapsed milliseconds since game start
    lastFrameTime: performance.now(),
    deltaTime: 0,          // Milliseconds since last frame
    timeScale: 1.0,        // For slow-motion effects (1.0 = normal, 0.5 = half speed)

    message: '',
    messageTimer: 0,       // Will be converted to milliseconds
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
const DRAG_THRESHOLD = 10; // pixels - minimum movement to trigger drag and disable camera follow
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
    touchStartX: 0,    // Initial touch X for drag threshold
    touchStartY: 0,    // Initial touch Y for drag threshold
    dragThresholdMet: false, // Has movement exceeded drag threshold
    lastTapTime: 0,    // For double-tap detection
    waitingForDoubleTap: false, // Prevents drag during double-tap window
    followPlayer: true, // Should camera follow player
    lastScale: 1,      // Track last scale for zoom indicator optimization
    lastFollowPlayer: true // Track last followPlayer state for indicator updates
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

// ============================================================================
// SECTION 4: MAGIC SYSTEM (Phase 2)
// ============================================================================

/**
 * MagicManager - Handles spell casting, cooldowns, and targeting
 * Phase 2: Core spell system architecture
 */
const MagicManager = {
    // State management
    state: {
        globalCooldown: 0,          // Global cooldown remaining (ms)
        spellCooldowns: {},          // Individual spell cooldowns {spellId: remainingMs}
        targetingActive: false,      // Is player currently in targeting mode
        activeAbility: null,         // Currently targeting ability ID
        targetingMode: null,         // Current targeting mode
        targetX: 0,                  // Target position X (world space)
        targetY: 0,                  // Target position Y (world space)
        targetAngle: 0               // Target angle for cone/line spells
    },

    /**
     * Initialize the magic system
     */
    init() {
        // Validate ABILITIES object exists (Critical #4 fix)
        if (!ABILITIES || typeof ABILITIES !== 'object') {
            console.error('[MagicManager] ABILITIES object not found or invalid');
            return;
        }

        // Initialize cooldowns for all abilities
        Object.keys(ABILITIES).forEach(abilityId => {
            this.state.spellCooldowns[abilityId] = 0;
        });

        // Cache ability IDs for performance (High #7 fix)
        this.abilityIds = Object.keys(this.state.spellCooldowns);
    },

    /**
     * Update cooldowns each frame
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime) {
        // Update global cooldown
        if (this.state.globalCooldown > 0) {
            this.state.globalCooldown = Math.max(0, this.state.globalCooldown - deltaTime);
        }

        // Update individual spell cooldowns (High #7 fix: use cached IDs)
        if (this.abilityIds) {
            for (let i = 0; i < this.abilityIds.length; i++) {
                const abilityId = this.abilityIds[i];
                if (this.state.spellCooldowns[abilityId] > 0) {
                    this.state.spellCooldowns[abilityId] = Math.max(0, this.state.spellCooldowns[abilityId] - deltaTime);
                }
            }
        }
    },

    /**
     * Check if a spell can be cast
     * @param {string} abilityId - The ability to check
     * @param {object} playerObj - The player object (Critical #1 fix)
     * @returns {object} {canCast: boolean, reason: string}
     */
    canCast(abilityId, playerObj) {
        // Critical #1 fix: Validate player object
        if (!playerObj || !playerObj.unlockedSpells) {
            return { canCast: false, reason: 'Player not initialized' };
        }

        const ability = ABILITIES[abilityId];
        if (!ability) {
            return { canCast: false, reason: 'Unknown spell' };
        }

        // Check if spell is unlocked
        if (!playerObj.unlockedSpells.includes(abilityId)) {
            return { canCast: false, reason: 'Spell locked' };
        }

        // Check mana cost (Medium #8 fix: show actual values)
        if (playerObj.mana < ability.manaCost) {
            return {
                canCast: false,
                reason: `Need ${ability.manaCost} mana (have ${Math.floor(playerObj.mana)})`
            };
        }

        // Check global cooldown
        if (this.state.globalCooldown > 0) {
            const remaining = (this.state.globalCooldown / 1000).toFixed(1);
            return { canCast: false, reason: `Wait ${remaining}s` };
        }

        // Check spell cooldown
        if (this.state.spellCooldowns[abilityId] > 0) {
            const remaining = (this.state.spellCooldowns[abilityId] / 1000).toFixed(1);
            return { canCast: false, reason: `Cooldown ${remaining}s` };
        }

        return { canCast: true, reason: '' };
    },

    /**
     * Begin casting a spell
     * @param {string} abilityId - The ability to cast
     * @param {object} playerObj - The player object (Critical #1 fix)
     */
    beginCast(abilityId, playerObj) {
        // Critical #1 fix: Use passed player object
        if (!playerObj) {
            console.error('[MagicManager] beginCast: No player object provided');
            return;
        }

        const check = this.canCast(abilityId, playerObj);
        if (!check.canCast) {
            showMessage(check.reason);
            return;
        }

        const ability = ABILITIES[abilityId];

        // Handle instant cast spells
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.INSTANT ||
            ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF) {
            this.executeCast(abilityId, playerObj, null);
            return;
        }

        // Handle targeted spells (Phase 4 will implement targeting UI)
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET) {
            // For now, use selected enemy from tab targeting
            if (!gameState.selectedEnemy || gameState.selectedEnemy.isDead) {
                showMessage('No valid target');
                return;
            }

            const enemyCenterX = gameState.selectedEnemy.x + gameState.selectedEnemy.width / 2;
            const enemyCenterY = gameState.selectedEnemy.y + gameState.selectedEnemy.height / 2;
            const playerCenterX = playerObj.x + playerObj.width / 2;
            const playerCenterY = playerObj.y + playerObj.height / 2;

            const distance = Math.sqrt(
                Math.pow(enemyCenterX - playerCenterX, 2) +
                Math.pow(enemyCenterY - playerCenterY, 2)
            );

            if (distance > ability.range) {
                showMessage(`Out of range (${Math.floor(distance)}/${ability.range})`);
                return;
            }

            // Pass target to executeCast
            this.executeCast(abilityId, playerObj, gameState.selectedEnemy);
            return;
        }

        // Other targeting modes will be implemented in Phase 4
        showMessage('Targeting not yet available');
    },

    /**
     * Execute the spell cast
     * @param {string} abilityId - The ability to cast
     * @param {object} playerObj - The player object (Critical #1 fix)
     * @param {object} target - Optional target (for targeted spells)
     */
    executeCast(abilityId, playerObj, target = null) {
        const ability = ABILITIES[abilityId];

        // Critical #3 fix: Re-validate target BEFORE deducting resources
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET) {
            if (!target || target.isDead) {
                showMessage('Target became invalid');
                return; // Don't deduct mana or trigger cooldowns
            }

            // Re-check range (enemy could have moved)
            const enemyCenterX = target.x + target.width / 2;
            const enemyCenterY = target.y + target.height / 2;
            const playerCenterX = playerObj.x + playerObj.width / 2;
            const playerCenterY = playerObj.y + playerObj.height / 2;

            const distance = Math.sqrt(
                Math.pow(enemyCenterX - playerCenterX, 2) +
                Math.pow(enemyCenterY - playerCenterY, 2)
            );

            if (distance > ability.range) {
                showMessage('Target moved out of range');
                return; // Don't deduct mana or trigger cooldowns
            }
        }

        // Critical #2 fix: Only NOW deduct mana and apply cooldowns (after validation)
        playerObj.mana -= ability.manaCost;

        // Apply cooldowns (Medium #1 fix: clamp to max)
        this.state.globalCooldown = MAGIC_CONSTANTS.GLOBAL_COOLDOWN;
        this.state.spellCooldowns[abilityId] = Math.min(ability.cooldown, 600000); // Max 10 minutes

        // Execute spell effect based on type
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF) {
            this.executeInstantSelf(ability, playerObj);
        } else if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET) {
            this.executeEnemyTarget(ability, playerObj, target);
        }

        // Update UI (High #2 fix: consistent updateUI call)
        updateUI();
    },

    /**
     * Execute instant self-cast spell
     * @param {object} ability - The ability definition
     * @param {object} playerObj - The player object (Critical #1 fix)
     */
    executeInstantSelf(ability, playerObj) {
        const playerCenterX = playerObj.x + playerObj.width / 2;
        const playerCenterY = playerObj.y + playerObj.height / 2;

        // Healing spell
        if (ability.healing) {
            const healAmount = ability.healing;
            const actualHeal = Math.min(ability.healing, playerObj.maxHealth - playerObj.health);
            playerObj.health = Math.min(playerObj.maxHealth, playerObj.health + healAmount);
            createParticles(playerCenterX, playerCenterY, ability.color, 15);

            if (actualHeal > 0) {
                showMessage(`${ability.name}: +${actualHeal} HP`);
            } else {
                showMessage(`${ability.name}: Already full health`);
            }
            return;
        }

        // AOE spell (Frost Nova)
        if (ability.radius) {
            let hitCount = 0;

            gameState.enemies.forEach(enemy => {
                if (enemy.isDead) return;

                const enemyCenterX = enemy.x + enemy.width / 2;
                const enemyCenterY = enemy.y + enemy.height / 2;
                const dist = Math.sqrt(
                    Math.pow(enemyCenterX - playerCenterX, 2) +
                    Math.pow(enemyCenterY - playerCenterY, 2)
                );

                if (dist <= ability.radius) {
                    // Calculate damage with spell power bonus (Medium #1 fix: min 1 damage)
                    const baseDamage = ability.damage || 0;
                    const totalDamage = Math.max(1, baseDamage + playerObj.spellPower);
                    enemy.takeDamage(totalDamage);
                    createParticles(enemyCenterX, enemyCenterY, ability.color, 10);

                    // Apply slow effect if present
                    if (ability.slow && ability.slowDuration) {
                        enemy.slowMultiplier = ability.slow;
                        enemy.slowEndTime = performance.now() + ability.slowDuration;
                    }

                    hitCount++;
                }
            });

            createParticles(playerCenterX, playerCenterY, ability.color, 30);
            if (hitCount > 0) {
                showMessage(`${ability.name}: Hit ${hitCount} ${hitCount === 1 ? 'enemy' : 'enemies'}!`);
            } else {
                showMessage(`${ability.name}: No targets in range`);
            }
        }
    },

    /**
     * Execute enemy-targeted spell
     * @param {object} ability - The ability definition
     * @param {object} playerObj - The player object (Critical #1 fix)
     * @param {object} target - The target enemy
     */
    executeEnemyTarget(ability, playerObj, target) {
        // Critical #3: This should never happen now (validated in executeCast)
        // but keeping as safety check
        if (!target || target.isDead) {
            console.warn('[MagicManager] executeEnemyTarget: Invalid target (should have been caught earlier)');
            showMessage('Target invalid');
            return;
        }

        const enemyCenterX = target.x + target.width / 2;
        const enemyCenterY = target.y + target.height / 2;

        // Calculate damage with spell power bonus (Medium #1 fix: min 1 damage)
        const baseDamage = ability.damage || 0;
        const totalDamage = Math.max(1, baseDamage + playerObj.spellPower);

        target.takeDamage(totalDamage);
        createParticles(enemyCenterX, enemyCenterY, ability.color, 15);
        showMessage(`${ability.name}: ${totalDamage} damage!`);
    },

    /**
     * Cancel active targeting
     */
    cancelTargeting() {
        this.state.targetingActive = false;
        this.state.activeAbility = null;
        this.state.targetingMode = null;
        gameState.timeScale = 1.0;
    },

    /**
     * Get cooldown percentage for UI display
     * @param {string} abilityId - The ability to check
     * @returns {number} Percentage from 0-100
     */
    getCooldownPercent(abilityId) {
        const ability = ABILITIES[abilityId];
        if (!ability) {
            // Medium #4 fix: Log warning for invalid ability
            console.warn(`[MagicManager] getCooldownPercent: Unknown ability '${abilityId}'`);
            return 0;
        }

        const remaining = this.state.spellCooldowns[abilityId] || 0;
        if (remaining <= 0) return 0;

        return (remaining / ability.cooldown) * 100;
    },

    /**
     * Reset magic system state (High #3 fix: called on player death/reset)
     */
    reset() {
        // Reset global cooldown
        this.state.globalCooldown = 0;

        // Reset all spell cooldowns
        if (this.abilityIds) {
            this.abilityIds.forEach(abilityId => {
                this.state.spellCooldowns[abilityId] = 0;
            });
        }

        // Cancel any active targeting
        this.cancelTargeting();
    }
};

// ============================================================================
// SECTION 5: ENTITY CLASSES
// ============================================================================

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

        // Base stats (used as foundation for computed stats)
        this.baseMaxHealth = 100;
        this.baseAttack = 10;
        this.baseDefense = 5;

        // Primary Attributes (6 core stats)
        this.attributes = {
            strength: 5,      // Affects attack damage
            vitality: 5,      // Affects max health and defense
            dexterity: 5,     // Affects crit chance, dodge chance, attack speed
            intelligence: 5,  // Affects magic damage (future)
            wisdom: 5,        // Affects magic defense (future)
            luck: 5           // Affects crit chance and loot quality (future)
        };

        // Attribute points for allocation
        this.attributePoints = 0;

        // Mana System (Phase 1)
        this.baseMana = MAGIC_CONSTANTS.BASE_MANA; // 150
        this.mana = 0; // Will be set after updateComputedStats()
        this.manaRegen = 0; // Per second, calculated from Wisdom
        this.spellPower = 0; // Spell damage bonus, from Intelligence
        this.magicDefense = 0; // Magic damage reduction, from Wisdom

        // Spell System (Phase 1)
        this.unlockedSpells = ['magic_missile']; // Start with one basic spell
        this.hotbar = [
            'magic_missile', // Slot 1
            null, null, null, null, null, null, null // Slots 2-8 empty
        ];

        // Computed stats (calculated from base + attributes)
        this.updateComputedStats();
        this.health = this.maxHealth;
        this.mana = this.maxMana; // Set mana to full after stats calculated

        // Combat
        this.isAttacking = false;
        this.attackCooldown = 0;        // Milliseconds remaining (time-based)
        this.attackRange = 45;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;   // Milliseconds remaining (time-based, replaces invulnerableTimer)

        // Movement
        this.moving = false;
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Recalculate all computed stats based on base values, level, and attributes
     */
    updateComputedStats() {
        // Calculate derived stats from attributes
        const strBonus = this.attributes.strength * 2;  // +2 attack per STR
        const vitBonus = this.attributes.vitality * 5;  // +5 max HP per VIT
        const vitDefBonus = Math.floor(this.attributes.vitality * 0.3);  // +0.3 defense per VIT

        // Update computed stats
        this.attack = this.baseAttack + strBonus + this.level;
        this.maxHealth = this.baseMaxHealth + vitBonus + (this.level * 5);
        this.defense = this.baseDefense + vitDefBonus + this.level;

        // Secondary attributes (computed getters would be cleaner, but this is simpler)
        this.critChance = Math.min(0.5, 0.05 +
            (this.attributes.dexterity * 0.01) +
            (this.attributes.luck * 0.01)
        ); // 5% base, +1% per DEX, +1% per LCK, cap at 50%

        this.dodgeChance = Math.min(0.3, this.attributes.dexterity * 0.01); // +1% dodge per DEX, cap at 30%

        this.attackSpeedMultiplier = 1.0 + (this.attributes.dexterity * 0.02); // +2% attack speed per DEX

        // Magic stats (Phase 1)
        const intBonus = this.attributes.intelligence - 5; // 0 at base 5 INT
        const wisBonus = this.attributes.wisdom - 5; // 0 at base 5 WIS

        this.maxMana = this.baseMana + (intBonus * 10) + (this.level * 5);
        // Base 150 + (0 * 10) + (1 * 5) = 155 at level 1
        // At 10 INT: 150 + (5 * 10) + 5 = 205

        this.manaRegen = MAGIC_CONSTANTS.BASE_MANA_REGEN + (wisBonus * 0.2);
        // Base 3.0/sec + (0 * 0.2) = 3.0/sec at level 1
        // At 10 WIS: 3.0 + (5 * 0.2) = 4.0/sec

        this.spellPower = intBonus * 3;
        // 0 at base 5 INT
        // 15 at 10 INT

        this.magicDefense = this.baseDefense + (wisBonus * 0.8);
        // Physical defense + magic defense bonus
    }

    /**
     * Allocate attribute points
     * @param {string} attributeName - Name of the attribute (strength, vitality, etc.)
     * @param {number} points - Number of points to allocate (default 1)
     * @returns {object} Result with success flag and optional error message
     */
    allocateAttribute(attributeName, points = 1) {
        // Validation: Check if player has enough points
        if (this.attributePoints < points) {
            return { success: false, error: 'Not enough attribute points' };
        }

        // Validation: Check if attribute name is valid
        const validAttributes = ['strength', 'vitality', 'dexterity', 'intelligence', 'wisdom', 'luck'];
        if (!validAttributes.includes(attributeName)) {
            return { success: false, error: 'Invalid attribute name' };
        }

        // Validation: Check if allocation would exceed cap
        if (this.attributes[attributeName] + points > ATTRIBUTE_CAP) {
            return { success: false, error: `Attribute would exceed maximum (${ATTRIBUTE_CAP})` };
        }

        // Allocate the points
        this.attributes[attributeName] += points;
        this.attributePoints -= points;

        // Recalculate all computed stats
        this.updateComputedStats();

        return { success: true };
    }

    update() {
        // Apply time scale for slow-motion effects (Phase 0)
        const scaledDelta = gameState.deltaTime * gameState.timeScale;

        // Movement speed: this.speed is in pixels per frame @ 60 FPS baseline
        // Formula: this.speed * (deltaTime / BASELINE_FRAME_TIME) = pixels to move this frame
        // At 60 FPS: 3 * (16.67 / 16.67) = 3 pixels
        // At 30 FPS: 3 * (33.33 / 16.67) = 6 pixels (but takes 2x as long in real time)
        const moveSpeed = this.speed * (scaledDelta / BASELINE_FRAME_TIME);

        // Handle movement from keyboard
        let dx = 0;
        let dy = 0;

        if (gameState.keys['ArrowUp'] || gameState.keys['w'] || gameState.keys['W']) {
            dy = -moveSpeed;
            this.direction = 2;
            this.moving = true;
        }
        if (gameState.keys['ArrowDown'] || gameState.keys['s'] || gameState.keys['S']) {
            dy = moveSpeed;
            this.direction = 0;
            this.moving = true;
        }
        if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
            dx = -moveSpeed;
            this.direction = 3;
            this.moving = true;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
            dx = moveSpeed;
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

        // Update timers (time-based, not affected by timeScale)
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - gameState.deltaTime);
        }
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime = Math.max(0, this.invulnerabilityTime - gameState.deltaTime);
            if (this.invulnerabilityTime === 0) {
                this.invulnerable = false;
            }
        }

        // Mana regeneration (Phase 1 - time-based, not affected by timeScale)
        const manaRegenPerMs = this.manaRegen / 1000; // Per second → per millisecond
        const manaGain = manaRegenPerMs * gameState.deltaTime;
        this.mana = Math.min(this.maxMana, this.mana + manaGain);
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
            // Attack speed affects cooldown (higher multiplier = faster attacks)
            // Base: 500ms (was 30 frames @ 60 FPS)
            const baseCooldown = 500;
            this.attackCooldown = Math.max(167, baseCooldown / this.attackSpeedMultiplier);

            // Attack selected target only (tab targeting)
            if (gameState.selectedEnemy && !gameState.selectedEnemy.isDead) {
                // Attack selected enemy if in range
                if (this.checkAttackHit(gameState.selectedEnemy)) {
                    this.dealDamage(gameState.selectedEnemy);
                }
            } else {
                // If no target selected, auto-select nearest enemy and attack
                selectNearestEnemy();
                if (gameState.selectedEnemy && this.checkAttackHit(gameState.selectedEnemy)) {
                    this.dealDamage(gameState.selectedEnemy);
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
        // Check for dodge (if enemy has dodge chance)
        const enemyDodgeChance = enemy.dodgeChance || 0;
        if (Math.random() < enemyDodgeChance) {
            showMessage('DODGED!');
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffffff', 8);
            return;
        }

        // Calculate base damage
        let damage = Math.max(1, this.attack - enemy.defense / 2);

        // Check for critical hit
        const isCrit = Math.random() < this.critChance;
        if (isCrit) {
            damage *= 2.0;  // Critical hits deal 2x damage
            showMessage(`CRITICAL HIT! ${damage.toFixed(0)} damage!`);
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0000', 15);
        } else {
            showMessage(`Hit for ${damage.toFixed(0)} damage`);
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff6600', 5);
        }

        enemy.takeDamage(damage);
    }

    takeDamage(damage) {
        if (!this.invulnerable) {
            const actualDamage = Math.max(1, damage - this.defense / 2);
            this.health -= actualDamage;
            this.invulnerable = true;
            this.invulnerabilityTime = 1000; // 1 second in milliseconds (was 60 frames)

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

        // Grant attribute points for player allocation
        this.attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;

        // Small automatic base stat increases (reduced from before)
        this.baseMaxHealth += 5;  // Reduced from +20 (attributes provide more)
        this.baseAttack += 1;     // Reduced from +5 (attributes provide more)
        this.baseDefense += 1;    // Reduced from +2 (attributes provide more)

        // Recalculate all computed stats
        this.updateComputedStats();

        // Full heal on level up
        this.health = this.maxHealth;
        this.mana = this.maxMana;  // Full mana restoration (Phase 1)

        // Unlock new spells at this level (Phase 2)
        const newSpells = [];
        Object.values(ABILITIES).forEach(ability => {
            if (ability.unlockLevel === this.level && !this.unlockedSpells.includes(ability.id)) {
                this.unlockedSpells.push(ability.id);
                newSpells.push(ability.name);
            }
        });

        // Show level up message with new spells
        let levelUpMsg = `LEVEL UP! Lv.${this.level} (+${ATTRIBUTE_POINTS_PER_LEVEL} Pts)`;
        if (newSpells.length > 0) {
            levelUpMsg += ` - New Spell: ${newSpells.join(', ')}!`;
        }
        showMessage(levelUpMsg);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ffd700', 20);
        updateUI();

        // Auto-save on level up
        SaveManager.save(this, gameState);
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

        // Reset base stats
        this.baseMaxHealth = 100;
        this.baseAttack = 10;
        this.baseDefense = 5;

        // Reset attributes to starting values
        this.attributes = {
            strength: 5,
            vitality: 5,
            dexterity: 5,
            intelligence: 5,
            wisdom: 5,
            luck: 5
        };

        // Reset attribute points
        this.attributePoints = 0;

        // Reset spell system (Phase 2)
        this.unlockedSpells = ['magic_missile'];
        this.hotbar = ['magic_missile', null, null, null, null, null, null, null];

        // High #3 fix: Reset MagicManager cooldowns
        MagicManager.reset();

        // Recalculate computed stats
        this.updateComputedStats();

        // Full heal
        this.health = this.maxHealth;
        this.mana = this.maxMana;  // Full mana restoration (Phase 1)

        gameState.enemiesDefeated = 0;
        gameState.chestsOpened = 0;
        loadRoom(0, true); // Skip save on death/reset

        // Delete save on death (start fresh)
        SaveManager.deleteSave();

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
        this.attackCooldown = 0;        // Milliseconds remaining (time-based)
        this.isDead = false;
        this.moveTimer = 0;

        // Status effects (Phase 0)
        this.slowMultiplier = 1.0;      // 1.0 = normal speed, 0.5 = 50% slow
        this.slowEndTime = 0;           // Timestamp when slow expires (ms)
    }

    update(player) {
        if (this.isDead) return;

        // Check if slow has expired
        if (performance.now() >= this.slowEndTime) {
            this.slowMultiplier = 1.0;
        }

        // Apply time scale AND slow effect
        const scaledDelta = gameState.deltaTime * gameState.timeScale;
        // this.speed is in pixels per frame @ 60 FPS baseline
        const baseSpeed = this.speed * (scaledDelta / BASELINE_FRAME_TIME);
        const moveSpeed = baseSpeed * this.slowMultiplier;

        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.aggroRange) {
            // Move towards player
            if (distance > this.attackRange) {
                const angle = Math.atan2(dy, dx);
                const newX = this.x + Math.cos(angle) * moveSpeed;
                const newY = this.y + Math.sin(angle) * moveSpeed;

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

        // Update cooldown (time-based, not affected by timeScale)
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - gameState.deltaTime);
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

    /**
     * Attempt to attack the player
     * Checks dodge chance before applying damage
     * @param {Player} player - The player to attack
     */
    tryAttack(player) {
        if (this.attackCooldown === 0) {
            // Set cooldown before dodge check so enemy's turn is consumed even if dodged
            this.attackCooldown = ENEMY_ATTACK_COOLDOWN;

            // Check if player dodges the attack
            const dodgeChance = Math.max(0, Math.min(1, player.dodgeChance || 0));
            if (Math.random() < dodgeChance) {
                showMessage('Dodged!');
                createParticles(player.x + player.width / 2, player.y + player.height / 2, DODGE_PARTICLE_COLOR, 8);
                return;
            }

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

        // Auto-select next enemy if killed target dies
        if (gameState.selectedEnemy === this) {
            const index = gameState.enemies.indexOf(this);
            if (index > -1) {
                gameState.enemies.splice(index, 1);
            }
            // Select nearest remaining enemy
            if (gameState.enemies.length > 0) {
                selectNearestEnemy();
            } else {
                gameState.selectedEnemy = null;
            }
        } else {
            const index = gameState.enemies.indexOf(this);
            if (index > -1) {
                gameState.enemies.splice(index, 1);
            }
        }
    }

    draw() {
        if (this.isDead) return;

        // Draw selection indicator if this enemy is targeted
        if (gameState.selectedEnemy === this) {
            // Check if enemy is in attack range (using squared distance for performance)
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = this.x + this.width / 2;
            const enemyCenterY = this.y + this.height / 2;
            const distanceSquared = getDistanceSquared(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            const attackRangeSquared = (player.attackRange + this.width / 2) * (player.attackRange + this.width / 2);
            const inRange = distanceSquared <= attackRangeSquared;

            // Color-code: Gold (in range), Orange (out of range)
            const indicatorColor = inRange ? '#FFD700' : '#FFA500';

            // Border outline
            ctx.strokeStyle = indicatorColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);

            // Targeting chevron above enemy
            ctx.fillStyle = indicatorColor;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y - 10);
            ctx.lineTo(this.x + this.width / 2 - 5, this.y - 5);
            ctx.lineTo(this.x + this.width / 2 + 5, this.y - 5);
            ctx.fill();

            // Range indicator text (optional - shows exact distance)
            if (!inRange) {
                const distance = Math.round(Math.sqrt(distanceSquared));
                ctx.fillStyle = '#FFA500';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${distance}px`, this.x + this.width / 2, this.y - 15);
            }
        }

        // Visual indicator for slowed enemies (Phase 0)
        if (this.slowMultiplier < 1.0) {
            ctx.fillStyle = '#00bfff'; // Blue/frozen color
        } else {
            ctx.fillStyle = this.color;
        }
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

    // Reset method for particle pooling (Phase 0)
    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocityX = (Math.random() - 0.5) * 5;
        this.velocityY = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 3 + 2;
        this.life = this.maxLife; // Reset to full life
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

// ============================================================================
// SECTION 5: GAME SYSTEMS & UTILITIES
// ============================================================================

// Target Selection Functions

// Utility: Calculate squared distance (avoids expensive sqrt for comparisons)
function getDistanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

// Utility: Get distance between two entities
function getEntityDistance(entity1, entity2) {
    const x1 = entity1.x + entity1.width / 2;
    const y1 = entity1.y + entity1.height / 2;
    const x2 = entity2.x + entity2.width / 2;
    const y2 = entity2.y + entity2.height / 2;
    return Math.sqrt(getDistanceSquared(x1, y1, x2, y2));
}

function selectNearestEnemy() {
    // Edge case: No enemies or player not initialized
    if (!player || gameState.enemies.length === 0) {
        gameState.selectedEnemy = null;
        return;
    }

    // Cache player center position (avoid recalculating in sort)
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Sort enemies by distance (using squared distance to avoid sqrt)
    const sorted = gameState.enemies.slice().sort((a, b) => {
        const enemyACenterX = a.x + a.width / 2;
        const enemyACenterY = a.y + a.height / 2;
        const enemyBCenterX = b.x + b.width / 2;
        const enemyBCenterY = b.y + b.height / 2;

        const distSqA = getDistanceSquared(playerCenterX, playerCenterY, enemyACenterX, enemyACenterY);
        const distSqB = getDistanceSquared(playerCenterX, playerCenterY, enemyBCenterX, enemyBCenterY);

        return distSqA - distSqB;
    });

    gameState.selectedEnemy = sorted[0];
}

function cycleTarget(direction = 1) {
    if (gameState.enemies.length === 0) {
        gameState.selectedEnemy = null;
        showMessage('No targets available');
        return;
    }

    // If no target selected or current target is dead, select nearest
    if (!gameState.selectedEnemy || !gameState.enemies.includes(gameState.selectedEnemy)) {
        selectNearestEnemy();
        if (gameState.selectedEnemy) {
            const enemyName = gameState.selectedEnemy.type === 'basic' ? 'Goblin' : 'Orc';
            showMessage(`Target: ${enemyName}`);
        }
        return;
    }

    // Cycle to next/previous enemy
    const currentIndex = gameState.enemies.indexOf(gameState.selectedEnemy);
    let nextIndex = (currentIndex + direction + gameState.enemies.length) % gameState.enemies.length;
    gameState.selectedEnemy = gameState.enemies[nextIndex];

    // Visual feedback
    const enemyName = gameState.selectedEnemy.type === 'basic' ? 'Goblin' : 'Orc';
    const distance = Math.round(getEntityDistance(player, gameState.selectedEnemy));
    showMessage(`Target: ${enemyName} (${distance}px)`);
}

function screenToWorld(screenX, screenY) {
    // Convert screen coordinates to world coordinates accounting for viewport
    if (!canvas) return { x: 0, y: 0 }; // Defensive check

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Account for viewport scale and offset
    const worldX = (canvasX - viewport.offsetX) / viewport.scale;
    const worldY = (canvasY - viewport.offsetY) / viewport.scale;

    return { x: worldX, y: worldY };
}

function getEnemyAtPosition(worldX, worldY) {
    // Check if world coordinates are within any enemy's bounds
    for (let enemy of gameState.enemies) {
        if (worldX >= enemy.x && worldX <= enemy.x + enemy.width &&
            worldY >= enemy.y && worldY <= enemy.y + enemy.height) {
            return enemy;
        }
    }
    return null;
}

// Helper Functions
function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push(new Particle(x, y, color));
    }
}

function showMessage(text) {
    gameState.message = text;
    gameState.messageTimer = 3000; // 3 seconds in milliseconds (was 120 frames @ 60 FPS = 2 sec)
    document.getElementById('message-display').textContent = text;
}

function updateUI() {
    // Update quick HUD
    document.getElementById('quick-level').textContent = player.level;
    document.getElementById('quick-health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    const quickHealthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('quick-health-bar').style.width = quickHealthPercent + '%';

    // Update mana display (Phase 1)
    const manaText = `${Math.floor(player.mana)}/${player.maxMana}`;
    document.getElementById('quick-mana-text').textContent = manaText;
    const manaPercent = (player.mana / player.maxMana) * 100;
    document.getElementById('quick-mana-bar').style.width = manaPercent + '%';

    // Update character menu
    document.getElementById('player-level').textContent = player.level;
    document.getElementById('player-xp').textContent = player.xp;
    document.getElementById('player-xp-needed').textContent = player.xpNeeded;
    document.getElementById('player-attack').textContent = Math.floor(player.attack);
    document.getElementById('player-defense').textContent = Math.floor(player.defense);
    document.getElementById('player-crit').textContent = (player.critChance * 100).toFixed(1) + '%';
    document.getElementById('player-dodge').textContent = (player.dodgeChance * 100).toFixed(1) + '%';
    document.getElementById('enemies-defeated').textContent = gameState.enemiesDefeated;
    document.getElementById('current-room').textContent = gameState.currentRoom + 1;

    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    // Update mana stats in character menu (Phase 1)
    document.getElementById('mana-text-detail').textContent = `${Math.floor(player.mana)}/${player.maxMana}`;
    document.getElementById('mana-regen-text').textContent = player.manaRegen.toFixed(1) + '/sec';
    document.getElementById('spell-power-text').textContent = player.spellPower;

    const xpPercent = (player.xp / player.xpNeeded) * 100;
    document.getElementById('xp-bar').style.width = xpPercent + '%';

    // Update attribute points counter
    document.getElementById('attr-points-value').textContent = player.attributePoints;

    // Update attribute values (showing current/max format)
    document.getElementById('attr-strength').textContent = `${player.attributes.strength}/${ATTRIBUTE_CAP}`;
    document.getElementById('attr-vitality').textContent = `${player.attributes.vitality}/${ATTRIBUTE_CAP}`;
    document.getElementById('attr-dexterity').textContent = `${player.attributes.dexterity}/${ATTRIBUTE_CAP}`;
    document.getElementById('attr-intelligence').textContent = `${player.attributes.intelligence}/${ATTRIBUTE_CAP}`;
    document.getElementById('attr-wisdom').textContent = `${player.attributes.wisdom}/${ATTRIBUTE_CAP}`;
    document.getElementById('attr-luck').textContent = `${player.attributes.luck}/${ATTRIBUTE_CAP}`;

    // Enable/disable attribute buttons based on available points
    const attrButtons = document.querySelectorAll('.attr-btn');
    attrButtons.forEach(btn => {
        const attrName = btn.getAttribute('data-attr');
        const canAllocate = player.attributePoints > 0 && player.attributes[attrName] < ATTRIBUTE_CAP;
        btn.disabled = !canAllocate;
    });

    // Update ability bar (Phase 3)
    updateAbilityBar();
}

function updateZoomIndicator() {
    // Check if anything changed
    const scaleChanged = Math.abs(viewport.scale - viewport.lastScale) > 0.001;
    const followChanged = viewport.followPlayer !== viewport.lastFollowPlayer;

    // Only update if something actually changed
    if (!scaleChanged && !followChanged) {
        return;
    }

    // Update tracked values
    if (scaleChanged) {
        viewport.lastScale = viewport.scale;
    }
    if (followChanged) {
        viewport.lastFollowPlayer = viewport.followPlayer;
    }

    const zoomLevelElement = document.getElementById('zoom-level');
    const zoomIndicatorElement = document.getElementById('zoom-indicator');

    // Update zoom percentage if scale changed
    if (scaleChanged && zoomLevelElement) {
        const zoomPercent = Math.round(viewport.scale * 100);
        zoomLevelElement.textContent = zoomPercent;
    }

    // Update visual styling
    if (zoomIndicatorElement) {
        // Fade out indicator if at default zoom
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

function loadRoom(roomIndex, skipSave = false) {
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

    // Auto-select nearest enemy when entering room
    if (gameState.enemies.length > 0) {
        selectNearestEnemy();
    }

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

    // Auto-save on room change (but not on initial load)
    if (!skipSave) {
        SaveManager.save(player, gameState);
    }
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

// Save System Constants
const SAVE_CONSTANTS = {
    KEY: 'dungeon-crawler-save',
    VERSION: '1.0',
    INDICATOR_DURATION: 2000, // milliseconds
    FPS_ESTIMATE: 60 // Frames per second for time conversion
};

// Save Manager - Simple localStorage-based save system
const SaveManager = {
    SAVE_KEY: SAVE_CONSTANTS.KEY,

    /**
     * Check if localStorage is available (handles private browsing mode)
     * @returns {boolean} True if localStorage is accessible
     */
    isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    },

    /**
     * Save current game state to localStorage
     * @param {Player} player - The player object with stats and position
     * @param {Object} gameState - The game state object with world data
     * @returns {boolean} True if save succeeded, false otherwise
     */
    save(player, gameState) {
        if (!this.isAvailable()) {
            console.error('Cannot save: localStorage not available');
            return false;
        }

        try {
            const saveData = {
                v: SAVE_CONSTANTS.VERSION,  // Version
                t: Date.now(),  // Timestamp
                p: {  // Player
                    x: player.x,
                    y: player.y,
                    lvl: player.level,
                    xp: player.xp,
                    xpn: player.xpNeeded,
                    hp: player.health,
                    mp: player.mana,  // Current mana (Phase 1)
                    // Base stats (foundation for computed stats)
                    bmhp: player.baseMaxHealth,
                    batk: player.baseAttack,
                    bdef: player.baseDefense,
                    // Attributes
                    attr: {
                        str: player.attributes.strength,
                        vit: player.attributes.vitality,
                        dex: player.attributes.dexterity,
                        int: player.attributes.intelligence,
                        wis: player.attributes.wisdom,
                        lck: player.attributes.luck
                    },
                    ap: player.attributePoints,  // Available attribute points
                    // Spell system (Phase 2)
                    spells: player.unlockedSpells,  // Unlocked spells array
                    hotbar: player.hotbar  // Hotbar configuration
                },
                r: gameState.currentRoom,  // Current room
                ed: gameState.enemiesDefeated,  // Enemies defeated total
                co: gameState.chestsOpened,  // Chests opened total
                gt: Math.floor(gameState.gameTime / SAVE_CONSTANTS.FPS_ESTIMATE)  // Game time in seconds
            };

            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            this.showSaveIndicator();
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    /**
     * Load saved game state from localStorage
     * @returns {Object|null} Save data object if valid save exists, null otherwise
     */
    load() {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            const json = localStorage.getItem(this.SAVE_KEY);
            if (!json) {
                return null;  // No save exists
            }

            const data = JSON.parse(json);

            // Basic validation
            if (!data.v || !data.p || typeof data.p.lvl !== 'number' || data.p.lvl < 1) {
                console.error('Invalid save data');
                return null;
            }

            return data;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    /**
     * Apply loaded save data to the game (restore player and world state)
     * @param {Object} saveData - The save data object from load()
     * @param {Player} player - The player object to restore
     * @param {Object} gameState - The game state object to restore
     * @returns {boolean} True if successfully applied, false otherwise
     */
    applySave(saveData, player, gameState) {
        if (!saveData) {
            console.error('[SaveManager] applySave: No save data provided');
            return false;
        }

        try {
            console.log('[SaveManager] Restoring player stats');
            // Restore player progression
            player.level = saveData.p.lvl;
            player.xp = saveData.p.xp;
            player.xpNeeded = saveData.p.xpn;

            // Restore base stats
            if (saveData.p.bmhp !== undefined) {
                player.baseMaxHealth = saveData.p.bmhp;
                player.baseAttack = saveData.p.batk;
                player.baseDefense = saveData.p.bdef;
            } else {
                // Legacy save compatibility: calculate base stats from old saves
                player.baseMaxHealth = 100;
                player.baseAttack = 10;
                player.baseDefense = 5;
            }

            // Restore attributes
            if (saveData.p.attr) {
                player.attributes.strength = saveData.p.attr.str || 5;
                player.attributes.vitality = saveData.p.attr.vit || 5;
                player.attributes.dexterity = saveData.p.attr.dex || 5;
                player.attributes.intelligence = saveData.p.attr.int || 5;
                player.attributes.wisdom = saveData.p.attr.wis || 5;
                player.attributes.luck = saveData.p.attr.lck || 5;
            } else {
                // Legacy save compatibility: use default attributes
                player.attributes = {
                    strength: 5,
                    vitality: 5,
                    dexterity: 5,
                    intelligence: 5,
                    wisdom: 5,
                    luck: 5
                };
            }

            // Restore attribute points
            player.attributePoints = saveData.p.ap || 0;

            // Recalculate all computed stats
            player.updateComputedStats();

            // Restore health
            player.health = saveData.p.hp;

            // Restore mana (Phase 1 - with legacy save compatibility)
            player.mana = saveData.p.mp !== undefined ? saveData.p.mp : player.maxMana;

            // Restore spell system (Phase 2 - with legacy save compatibility)
            if (saveData.p.spells && Array.isArray(saveData.p.spells)) {
                player.unlockedSpells = saveData.p.spells;
            } else {
                // Legacy save: start with magic missile only
                player.unlockedSpells = ['magic_missile'];
            }

            // High #5 fix: Validate hotbar data
            if (saveData.p.hotbar && Array.isArray(saveData.p.hotbar)) {
                // Ensure hotbar has exactly 8 slots
                const validatedHotbar = new Array(8).fill(null);

                for (let i = 0; i < Math.min(8, saveData.p.hotbar.length); i++) {
                    const spellId = saveData.p.hotbar[i];

                    // Validate spell ID
                    if (spellId === null || spellId === undefined) {
                        validatedHotbar[i] = null;
                    } else if (typeof spellId === 'string' && ABILITIES[spellId]) {
                        // Check if spell is actually unlocked
                        if (player.unlockedSpells.includes(spellId)) {
                            validatedHotbar[i] = spellId;
                        } else {
                            console.warn(`[SaveManager] Hotbar slot ${i + 1} has locked spell '${spellId}', clearing`);
                            validatedHotbar[i] = null;
                        }
                    } else {
                        console.warn(`[SaveManager] Invalid spell in hotbar slot ${i + 1}: ${spellId}, clearing`);
                        validatedHotbar[i] = null;
                    }
                }

                player.hotbar = validatedHotbar;
            } else {
                // Legacy save: default hotbar
                player.hotbar = ['magic_missile', null, null, null, null, null, null, null];
            }

            // Reset temporary combat state
            player.attackCooldown = 0;
            player.invulnerable = false;
            player.invulnerableTimer = 0;
            player.isAttacking = false;

            console.log('[SaveManager] Restoring game state');
            // Restore game state
            gameState.enemiesDefeated = saveData.ed || 0;
            gameState.chestsOpened = saveData.co || 0;
            gameState.gameTime = (saveData.gt || 0) * SAVE_CONSTANTS.FPS_ESTIMATE;  // Convert back to frames

            // Load the saved room (with bounds checking)
            const roomIndex = Math.min(Math.max(0, saveData.r || 0), roomTemplates.length - 1);
            console.log(`[SaveManager] Loading room ${roomIndex}`);
            loadRoom(roomIndex, true); // Skip auto-save when loading from save

            // NOW restore position (after loadRoom so it doesn't get overwritten)
            console.log(`[SaveManager] Restoring player position to (${saveData.p.x}, ${saveData.p.y})`);
            player.x = saveData.p.x;
            player.y = saveData.p.y;

            console.log('[SaveManager] Save data applied successfully');
            return true;
        } catch (e) {
            console.error('[SaveManager] Failed to apply save:', e);
            return false;
        }
    },

    /**
     * Delete the saved game from localStorage
     * @returns {boolean} True if delete succeeded, false otherwise
     */
    deleteSave() {
        if (!this.isAvailable()) return false;

        try {
            localStorage.removeItem(this.SAVE_KEY);
            return true;
        } catch (e) {
            console.error('Delete save failed:', e);
            return false;
        }
    },

    /**
     * Check if a save file exists in localStorage
     * @returns {boolean} True if save exists, false otherwise
     */
    hasSave() {
        if (!this.isAvailable()) return false;
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    /**
     * Show the save indicator in the UI (fades in/out)
     */
    showSaveIndicator() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.classList.add('visible');
            setTimeout(() => {
                indicator.classList.remove('visible');
            }, SAVE_CONSTANTS.INDICATOR_DURATION);
        }
    },

    /**
     * Get save file metadata without loading full save
     * @returns {Object|null} Metadata object with timestamp, level, room, etc., or null if no save
     */
    getSaveMetadata() {
        if (!this.hasSave()) return null;

        try {
            const json = localStorage.getItem(this.SAVE_KEY);
            const data = JSON.parse(json);

            return {
                timestamp: data.t,
                level: data.p?.lvl,
                room: data.r,
                enemiesDefeated: data.ed,
                chestsOpened: data.co,
                playtime: data.gt,
                version: data.v
            };
        } catch (e) {
            console.error('Failed to read metadata:', e);
            return null;
        }
    },

    /**
     * Format timestamp as "X minutes/hours/days ago"
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} Formatted time string
     */
    formatTimeAgo(timestamp) {
        // Handle invalid timestamps
        if (!timestamp || typeof timestamp !== 'number' || timestamp < 0) {
            return 'Never';
        }

        const now = Date.now();
        const diff = now - timestamp;

        // Handle future dates (clock skew or corrupted data)
        if (diff < 0) {
            return 'just now';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    },

    /**
     * Manually load saved game (user-initiated)
     * @param {Player} player - The player object to restore
     * @param {Object} gameState - The game state object to restore
     * @returns {boolean} True if load succeeded, false otherwise
     */
    loadGame(player, gameState) {
        console.log('[SaveManager] loadGame called');

        if (!this.hasSave()) {
            console.warn('[SaveManager] No save file to load');
            return false;
        }

        try {
            console.log('[SaveManager] Loading save data...');
            const saveData = this.load();
            if (!saveData) {
                console.error('[SaveManager] Failed to load save data');
                return false;
            }

            console.log('[SaveManager] Applying save data:', saveData);
            const success = this.applySave(saveData, player, gameState);
            if (success) {
                console.log('[SaveManager] Save applied successfully, updating UI');
                updateUI();
                showMessage('Game loaded successfully!');
            } else {
                console.error('[SaveManager] Failed to apply save data');
            }
            return success;
        } catch (e) {
            console.error('[SaveManager] Failed to load game:', e);
            return false;
        }
    }
};

// Initialize game
const player = new Player(3 * TILE_SIZE, 3 * TILE_SIZE);

// Try to load save, otherwise start new game
const saveData = SaveManager.load();
if (saveData) {
    // Load from save
    SaveManager.applySave(saveData, player, gameState);
} else {
    // Start new game
    loadRoom(0, true);  // skipSave = true on initial load
}

// Keyboard input
window.addEventListener('keydown', (e) => {
    // Handle Tab for target cycling
    if (e.key === 'Tab') {
        e.preventDefault(); // Prevent browser tab navigation
        cycleTarget(e.shiftKey ? -1 : 1);
        return;
    }

    // Handle spell casting (1-8 keys) - Phase 2
    const keyNum = parseInt(e.key);
    // High #1 fix: Explicit NaN check, High #6 fix: null check for hotbar
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 8 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Validate hotbar exists
        if (!player.hotbar || !Array.isArray(player.hotbar)) {
            console.error('[Keyboard] Player hotbar is invalid');
            return;
        }

        const slotIndex = keyNum - 1;
        const spellId = player.hotbar[slotIndex];
        if (spellId) {
            // Critical #1 fix: Pass player object to beginCast
            MagicManager.beginCast(spellId, player);
        } else {
            showMessage(`Slot ${keyNum} empty`);
        }
        return;
    }

    gameState.keys[e.key] = true;

    // Manual save shortcut (Ctrl+S or Cmd+S)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        const success = SaveManager.save(player, gameState);
        if (success) {
            showMessage('Game saved!');
        }
    }
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// Virtual Joystick Controls
function setupVirtualJoystick() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    const attackBtn = document.getElementById('btn-attack');
    const targetBtn = document.getElementById('btn-target');

    if (!joystickBase || !joystickStick || !attackBtn || !targetBtn) {
        console.error('Joystick or control button elements not found!');
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

    // Target button
    targetBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        cycleTarget(1);
    });

    targetBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        cycleTarget(1);
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

    // Ensure menu is hidden on initialization (defensive programming)
    charMenu.classList.add('hidden');
    charMenu.setAttribute('aria-hidden', 'true');

    function openMenu() {
        charMenu.classList.remove('hidden');
        charMenu.setAttribute('aria-hidden', 'false');
        updateUI(); // Refresh stats when opening
    }

    function closeMenu() {
        charMenu.classList.add('hidden');
        charMenu.setAttribute('aria-hidden', 'true');
    }

    // Click events work on both desktop and touch devices
    charMenuBtn.addEventListener('click', openMenu);
    charMenuClose.addEventListener('click', closeMenu);

    // Close when clicking outside
    charMenu.addEventListener('click', (e) => {
        if (e.target === charMenu) {
            closeMenu();
        }
    });

    /**
     * Show custom confirmation modal for future attributes
     * @param {string} attrName - Attribute name (intelligence or wisdom)
     * @param {function} onConfirm - Callback if user confirms
     */
    function showAttributeWarning(attrName, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        const attrDisplayName = attrName === 'intelligence' ? 'Intelligence' : 'Wisdom';
        const effectType = attrName === 'intelligence' ? 'magic damage and mana' : 'magic defense and mana regeneration';

        message.textContent = `${attrDisplayName} will be used for ${effectType} in a future update when the magic system is implemented. Allocate point anyway?`;

        // Show modal
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');

        // Handle confirm
        const handleConfirm = () => {
            cleanup();
            onConfirm(true);
        };

        // Handle cancel
        const handleCancel = () => {
            cleanup();
            onConfirm(false);
        };

        // Cleanup function
        const cleanup = () => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleClickOutside);
        };

        // Close on click outside
        const handleClickOutside = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleClickOutside);
    }

    // Attribute allocation buttons
    const attrButtons = document.querySelectorAll('.attr-btn');
    attrButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const attrName = btn.getAttribute('data-attr');

            // Warn about future attributes (INT/WIS) - only first time per session
            if (FUTURE_ATTRIBUTES.includes(attrName)) {
                const hasSeenWarning = sessionStorage.getItem(MAGIC_ATTR_WARNING_KEY);

                if (!hasSeenWarning) {
                    // Show warning and mark as seen
                    sessionStorage.setItem(MAGIC_ATTR_WARNING_KEY, 'true');

                    showAttributeWarning(attrName, (confirmed) => {
                        if (confirmed) {
                            allocateAttributePoint(attrName);
                        }
                    });
                    return;
                }
            }

            // Allocate directly if no warning needed
            allocateAttributePoint(attrName);
        });
    });

    /**
     * Allocate a single attribute point and provide visual feedback
     * @param {string} attrName - Name of the attribute to increase
     */
    function allocateAttributePoint(attrName) {
        const result = player.allocateAttribute(attrName, 1);

        if (result.success) {
            // Update UI
            updateUI();

            // Visual feedback - find the button for this attribute
            const btn = document.querySelector(`[data-attr="${attrName}"]`);
            if (btn) {
                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Create a temporary particle effect on the button
                const particle = document.createElement('div');
                particle.textContent = '+1';
                particle.style.position = 'fixed';
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                particle.style.color = '#FFD700';
                particle.style.fontSize = '20px';
                particle.style.fontWeight = 'bold';
                particle.style.pointerEvents = 'none';
                particle.style.zIndex = '10000';
                particle.style.transition = 'all 0.5s ease-out';
                document.body.appendChild(particle);

                // Animate upward and fade out
                setTimeout(() => {
                    particle.style.transform = 'translateY(-30px)';
                    particle.style.opacity = '0';
                }, 10);

                // Remove after animation
                setTimeout(() => {
                    document.body.removeChild(particle);
                }, 600);
            }
        } else {
            // Show error message
            showMessage(result.error);
        }
    }

    // Return close function for keyboard handler
    return { closeMenu, isOpen: () => !charMenu.classList.contains('hidden') };
}

// Save/Load Menu Toggle
function setupSaveMenu() {
    const saveMenu = document.getElementById('save-menu');
    const saveMenuBtn = document.getElementById('save-menu-btn');
    const saveMenuClose = document.getElementById('save-menu-close');

    if (!saveMenu || !saveMenuBtn || !saveMenuClose) {
        console.error('Save menu elements not found!');
        return;
    }

    // Ensure menu is hidden on initialization (defensive programming)
    saveMenu.classList.add('hidden');
    saveMenu.setAttribute('aria-hidden', 'true');

    // Debounce state for save button
    let saveDebounceTimer = null;
    const SAVE_DEBOUNCE_MS = 1000;

    function clearSaveDebounce() {
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
            saveDebounceTimer = null;
            const saveBtn = document.getElementById('btn-save-game');
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        }
    }

    function openMenu() {
        saveMenu.classList.remove('hidden');
        saveMenu.setAttribute('aria-hidden', 'false');
        updateSaveMenuInfo(); // Refresh save info when opening
    }

    function closeMenu() {
        saveMenu.classList.add('hidden');
        saveMenu.setAttribute('aria-hidden', 'true');
        clearSaveDebounce(); // Clear any active debounce timer
    }

    // Click events work on both desktop and touch devices
    saveMenuBtn.addEventListener('click', openMenu);
    saveMenuClose.addEventListener('click', closeMenu);

    // Close when clicking outside
    saveMenu.addEventListener('click', (e) => {
        if (e.target === saveMenu) {
            closeMenu();
        }
    });

    // Save game button with debouncing
    const saveBtn = document.getElementById('btn-save-game');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // Prevent rapid clicks
            if (saveDebounceTimer) {
                return;
            }

            const success = SaveManager.save(player, gameState);
            if (success) {
                showMessage('Game saved successfully!');
                updateSaveMenuInfo(); // Update save info immediately

                // Debounce for 1 second
                saveBtn.disabled = true;
                saveDebounceTimer = setTimeout(() => {
                    saveBtn.disabled = false;
                    saveDebounceTimer = null;
                }, SAVE_DEBOUNCE_MS);
            } else {
                showMessage('Failed to save game');
            }
        });
    }

    // Load game button
    const loadBtn = document.getElementById('btn-load-game');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            console.log('[UI] Load game button clicked');

            if (!SaveManager.hasSave()) {
                console.log('[UI] No save file exists');
                showMessage('No save file to load!');
                return;
            }

            if (confirm('Load saved game? Current unsaved progress will be lost!')) {
                console.log('[UI] User confirmed load');
                const success = SaveManager.loadGame(player, gameState);
                if (success) {
                    console.log('[UI] Load successful, closing menu');
                    closeMenu();
                } else {
                    console.error('[UI] Load failed');
                    showMessage('Failed to load game');
                }
            } else {
                console.log('[UI] User cancelled load');
            }
        });
        console.log('[UI] Load button event listener attached');
    } else {
        console.error('[UI] Load button not found!');
    }

    // Start new game button
    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (confirm('Start a new game? Your current progress will be lost!')) {
                // Reset player (this will also delete the save)
                player.reset();

                // Close menu
                closeMenu();

                showMessage('New game started!');
                updateSaveMenuInfo();
            }
        });
    }

    // Delete save button
    const deleteBtn = document.getElementById('btn-delete-save');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (!SaveManager.hasSave()) {
                showMessage('No save file to delete!');
                return;
            }

            if (confirm('Delete your saved game? This cannot be undone!')) {
                const success = SaveManager.deleteSave();
                if (success) {
                    showMessage('Save deleted successfully!');
                    updateSaveMenuInfo(); // Update display
                } else {
                    showMessage('Failed to delete save');
                }
            }
        });
    }

    console.log('[UI] Save menu setup complete');

    // Return close function for keyboard handler
    return { closeMenu, isOpen: () => !saveMenu.classList.contains('hidden') };
}

// ============================================================================
// SECTION 6: ABILITY BAR & SPELLBOOK UI (Phase 3)
// ============================================================================

// Initialization guard to prevent multiple setup calls (High #2 fix)
let isAbilityBarInitialized = false;

/**
 * Setup ability bar UI and event handlers
 * Handles keyboard shortcuts (1-8), click to cast, long-press/right-click for spell assignment
 */
function setupAbilityBar() {
    // Guard against multiple initialization
    if (isAbilityBarInitialized) {
        console.warn('[AbilityBar] Already initialized, skipping setup');
        return;
    }

    const buttons = document.querySelectorAll('.ability-btn');

    if (buttons.length === 0) {
        console.error('[AbilityBar] Ability buttons not found!');
        return;
    }

    // Track long-press state for mobile
    const pressState = new Map();

    buttons.forEach((btn, index) => {
        // Click to cast spell
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Don't cast if this was a long-press
            const state = pressState.get(btn);
            if (state && state.isLongPress) {
                state.isLongPress = false;
                return;
            }

            const spellId = player.hotbar[index];
            if (spellId) {
                MagicManager.beginCast(spellId, player);
            } else {
                showMessage('Empty slot - long-press or right-click to assign');
            }
        });

        // Long-press for mobile (500ms)
        btn.addEventListener('touchstart', (e) => {
            // Prevent context menu on long-press (High #6 fix)
            e.preventDefault();

            const state = { isLongPress: false, timer: null };
            pressState.set(btn, state);

            state.timer = setTimeout(() => {
                state.isLongPress = true;
                openSpellbookForSlot(index);

                // Haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 500);
        });

        btn.addEventListener('touchend', (e) => {
            const state = pressState.get(btn);
            if (state && state.timer) {
                clearTimeout(state.timer);
            }
            // Reset isLongPress flag and clean up Map (Critical #3 fix)
            setTimeout(() => {
                if (state) state.isLongPress = false;
                pressState.delete(btn); // Clean up to prevent memory leak
            }, 100);
        });

        btn.addEventListener('touchmove', (e) => {
            // Cancel long-press if finger moves
            const state = pressState.get(btn);
            if (state && state.timer) {
                clearTimeout(state.timer);
                // Also clean up Map since long-press was cancelled
                pressState.delete(btn);
            }
        });

        // Right-click for desktop
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openSpellbookForSlot(index);
        });
    });

    // Note: Keyboard shortcuts (1-8) are handled by global keydown listener at line 2176
    // No need to add duplicate handler here

    // Initial update of ability bar UI
    updateAbilityBar();

    // Mark as initialized
    isAbilityBarInitialized = true;

    console.log('[UI] Ability bar setup complete');
}

/**
 * Update ability bar UI to reflect current hotbar, cooldowns, and mana
 * Called from updateUI() and during game loop
 * Uses cached DOM queries for performance (60 FPS optimization)
 */
const updateAbilityBar = (() => {
    // Cache DOM elements to avoid 960+ queries per second
    let cachedButtons = null;

    function getCachedButtons() {
        if (!cachedButtons || cachedButtons.length === 0) {
            const buttons = document.querySelectorAll('.ability-btn');
            if (buttons.length === 0) {
                return null;
            }

            // Cache buttons and their child elements
            cachedButtons = Array.from(buttons).map((btn, index) => ({
                btn,
                icon: btn.querySelector('.ability-icon'),
                cooldownOverlay: btn.querySelector('.ability-cooldown'),
                index
            }));
        }
        return cachedButtons;
    }

    return function() {
        // Guard clause: Check if player is initialized
        if (!player || !player.hotbar || !Array.isArray(player.hotbar)) {
            return;
        }

        // Guard clause: Check if DOM elements exist
        const buttonData = getCachedButtons();
        if (!buttonData) {
            return;
        }

        buttonData.forEach(({ btn, icon, cooldownOverlay, index }) => {
            // Defensive check: Ensure child elements exist
            if (!icon || !cooldownOverlay) {
                console.error(`[AbilityBar] Missing child elements in button ${index}`);
                return;
            }

            const spellId = player.hotbar[index];

            if (spellId && ABILITIES[spellId]) {
            const ability = ABILITIES[spellId];

            // Set icon
            icon.textContent = ability.icon;

            // Add has-spell class
            btn.classList.add('has-spell');
            btn.classList.remove('empty');

            // Check cooldown
            const cooldownPercent = MagicManager.getCooldownPercent(spellId);
            const globalCDPercent = MagicManager.getGlobalCooldownPercent();
            const maxCooldownPercent = Math.max(cooldownPercent, globalCDPercent);

            if (maxCooldownPercent > 0) {
                btn.classList.add('on-cooldown');
                cooldownOverlay.style.height = `${maxCooldownPercent}%`;

                // Add cooldown text
                let existingText = btn.querySelector('.cooldown-text');
                if (!existingText) {
                    existingText = document.createElement('span');
                    existingText.className = 'cooldown-text';
                    btn.appendChild(existingText);
                }

                const remainingTime = Math.max(
                    MagicManager.state.spellCooldowns[spellId] || 0,
                    MagicManager.state.globalCooldown || 0
                );
                existingText.textContent = (remainingTime / 1000).toFixed(1);
            } else {
                btn.classList.remove('on-cooldown');
                cooldownOverlay.style.height = '0%';

                // Remove cooldown text
                const existingText = btn.querySelector('.cooldown-text');
                if (existingText) {
                    existingText.remove();
                }
            }

            // Check mana availability
            const canCast = MagicManager.canCast(spellId, player);
            if (!canCast.canCast && canCast.reason.includes('mana')) {
                btn.style.opacity = '0.5';
            } else if (!btn.classList.contains('on-cooldown')) {
                btn.style.opacity = '1';
            }

        } else {
            // Empty slot
            icon.textContent = '';
            btn.classList.remove('has-spell', 'on-cooldown');
            btn.classList.add('empty');
            cooldownOverlay.style.height = '0%';
            btn.style.opacity = '1';

            // Remove cooldown text if present
            const existingText = btn.querySelector('.cooldown-text');
            if (existingText) {
                existingText.remove();
            }
        }
        });
    };
})();

/**
 * Open spellbook modal for assigning spells to a specific slot
 * @param {number} slotIndex - Hotbar slot index (0-7)
 */
function openSpellbookForSlot(slotIndex) {
    const modal = document.getElementById('spellbook-modal');
    const slotNumber = document.getElementById('spellbook-slot-number');
    const grid = document.getElementById('spellbook-grid');

    if (!modal || !slotNumber || !grid) {
        console.error('[Spellbook] Modal elements not found!');
        return;
    }

    // Validate ABILITIES exists (High #4 fix)
    if (!ABILITIES || typeof ABILITIES !== 'object') {
        console.error('[Spellbook] ABILITIES not defined');
        showMessage('Error: Spell data not loaded');
        return;
    }

    // Validate player data (High #4 fix)
    if (!player || !player.unlockedSpells || !player.hotbar) {
        console.error('[Spellbook] Player data not initialized');
        showMessage('Error: Player data not ready');
        return;
    }

    // Store current slot being edited
    modal.dataset.editingSlot = slotIndex;

    // Update slot number display
    slotNumber.textContent = slotIndex + 1;

    // Clear and populate spell grid
    grid.innerHTML = '';

    Object.values(ABILITIES).forEach(ability => {
        const card = document.createElement('div');
        card.className = 'spell-card';

        // Check if spell is unlocked
        const isUnlocked = player.unlockedSpells.includes(ability.id);
        const isAssigned = player.hotbar.includes(ability.id);

        if (!isUnlocked) {
            card.classList.add('locked');
        }

        if (isAssigned) {
            card.classList.add('assigned');
        }

        // Create card content
        card.innerHTML = `
            <div class="spell-card-icon">${ability.icon}</div>
            <div class="spell-card-name">${ability.name}</div>
            <div class="spell-card-stats">
                <span class="spell-card-cost">${ability.manaCost} MP</span>
                <span class="spell-card-cooldown">${ability.cooldown / 1000}s CD</span>
            </div>
            <div class="spell-card-desc">${ability.description}</div>
            ${!isUnlocked ? `<div class="spell-card-unlock">Unlocks at Level ${ability.unlockLevel}</div>` : ''}
        `;

        // Click handler to assign spell
        if (isUnlocked) {
            card.addEventListener('click', () => {
                assignSpellToSlot(ability.id, slotIndex);
                closeSpellbook();
            });
        }

        grid.appendChild(card);
    });

    // Show modal
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Assign a spell to a hotbar slot
 * @param {string} spellId - Spell ID to assign
 * @param {number} slotIndex - Hotbar slot index (0-7)
 */
function assignSpellToSlot(spellId, slotIndex) {
    // Validate spell ID (High #3 fix)
    if (!spellId || typeof spellId !== 'string') {
        console.error(`[AbilityBar] Invalid spell ID: ${spellId}`);
        showMessage('Error: Invalid spell');
        return;
    }

    if (!ABILITIES[spellId]) {
        console.error(`[AbilityBar] Spell not found in ABILITIES: ${spellId}`);
        showMessage('Error: Spell not found');
        return;
    }

    // Validate slot index (High #3 fix)
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 8) {
        console.error(`[AbilityBar] Invalid slot index: ${slotIndex}`);
        showMessage('Error: Invalid slot number');
        return;
    }

    // Validate player hotbar (High #3 fix)
    if (!player || !player.hotbar || !Array.isArray(player.hotbar)) {
        console.error('[AbilityBar] Player hotbar not initialized');
        showMessage('Error: Hotbar not ready');
        return;
    }

    // Remove spell from other slots if it's already assigned
    for (let i = 0; i < player.hotbar.length; i++) {
        if (player.hotbar[i] === spellId) {
            player.hotbar[i] = null;
        }
    }

    // Assign to new slot
    player.hotbar[slotIndex] = spellId;

    // Update UI
    updateAbilityBar();
    updateUI();

    const ability = ABILITIES[spellId];
    showMessage(`${ability.name} assigned to slot ${slotIndex + 1}`);
}

/**
 * Clear a hotbar slot
 * @param {number} slotIndex - Hotbar slot index (0-7)
 */
function clearHotbarSlot(slotIndex) {
    player.hotbar[slotIndex] = null;
    updateAbilityBar();
    updateUI();
    showMessage(`Slot ${slotIndex + 1} cleared`);
}

/**
 * Close spellbook modal
 */
function closeSpellbook() {
    const modal = document.getElementById('spellbook-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Setup spellbook modal event handlers
 */
function setupSpellbook() {
    const modal = document.getElementById('spellbook-modal');
    const closeBtn = document.getElementById('spellbook-modal-close');
    const clearBtn = document.getElementById('spellbook-clear-btn');

    if (!modal || !closeBtn || !clearBtn) {
        console.error('[Spellbook] Modal elements not found!');
        return;
    }

    // Close button
    closeBtn.addEventListener('click', closeSpellbook);

    // Clear slot button
    clearBtn.addEventListener('click', () => {
        const slotIndex = parseInt(modal.dataset.editingSlot);
        if (!isNaN(slotIndex)) {
            clearHotbarSlot(slotIndex);
            closeSpellbook();
        }
    });

    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSpellbook();
        }
    });

    // ESC key to close (handled by unified keyboard handler in initGame)

    console.log('[UI] Spellbook setup complete');
}

// Update save menu info display (cached DOM queries for performance)
const updateSaveMenuInfo = (() => {
    // Cache DOM elements on first call
    let cachedElements = null;

    function getCachedElements() {
        if (!cachedElements) {
            cachedElements = {
                lastSaved: document.getElementById('save-last-saved'),
                level: document.getElementById('save-level'),
                room: document.getElementById('save-room'),
                enemies: document.getElementById('save-enemies'),
                loadBtn: document.getElementById('btn-load-game'),
                deleteBtn: document.getElementById('btn-delete-save')
            };
        }
        return cachedElements;
    }

    return function() {
        const elements = getCachedElements();
        const metadata = SaveManager.getSaveMetadata();

        if (metadata && metadata.timestamp) {
            // Save exists - display info
            if (elements.lastSaved) {
                elements.lastSaved.textContent = SaveManager.formatTimeAgo(metadata.timestamp);
            }
            if (elements.level) {
                elements.level.textContent = metadata.level || '-';
            }
            if (elements.room) {
                elements.room.textContent = (metadata.room !== undefined ? metadata.room + 1 : '-');
            }
            if (elements.enemies) {
                elements.enemies.textContent = metadata.enemiesDefeated || '-';
            }

            // Enable load and delete buttons
            if (elements.loadBtn) {
                elements.loadBtn.disabled = false;
                elements.loadBtn.setAttribute('aria-disabled', 'false');
            }
            if (elements.deleteBtn) {
                elements.deleteBtn.disabled = false;
                elements.deleteBtn.setAttribute('aria-disabled', 'false');
            }
        } else {
            // No save exists - display default
            if (elements.lastSaved) {
                elements.lastSaved.textContent = 'Never';
            }
            if (elements.level) {
                elements.level.textContent = '-';
            }
            if (elements.room) {
                elements.room.textContent = '-';
            }
            if (elements.enemies) {
                elements.enemies.textContent = '-';
            }

            // Disable load and delete buttons
            if (elements.loadBtn) {
                elements.loadBtn.disabled = true;
                elements.loadBtn.setAttribute('aria-disabled', 'true');
            }
            if (elements.deleteBtn) {
                elements.deleteBtn.disabled = true;
                elements.deleteBtn.setAttribute('aria-disabled', 'true');
            }
        }
    };
})();

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
        // Zoomed in: World is larger than viewport
        // Allow small margin (10% of viewport) for better camera follow near edges
        // This is a compromise: mostly respects world boundaries but allows some centering
        const margin = 0.1;
        const maxEmptySpace = CANVAS_WIDTH * margin;
        const maxEmptySpaceY = CANVAS_HEIGHT * margin;

        // Max offset: Small positive values allowed for centering near top-left
        const maxOffsetX = maxEmptySpace;
        const maxOffsetY = maxEmptySpaceY;

        // Min offset: Bounds for bottom-right with small margin
        const minOffsetX = -(scaledWidth - CANVAS_WIDTH) - maxEmptySpace;
        const minOffsetY = -(scaledHeight - CANVAS_HEIGHT) - maxEmptySpaceY;

        viewport.offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, viewport.offsetX));
        viewport.offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, viewport.offsetY));
    } else {
        // At 1x or zoomed out: World fits entirely in viewport
        // Center the world - camera follow not needed at this scale
        viewport.offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
        viewport.offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
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
        const targetBtn = document.getElementById('btn-target');
        const charMenuBtn = document.getElementById('char-menu-btn');

        return !isPointInElement(touch, joystickBase) &&
               !isPointInElement(touch, attackBtn) &&
               !isPointInElement(touch, targetBtn) &&
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

            // One finger - prepare for potential pan
            // Save initial touch position for drag threshold check
            viewport.touchStartX = touchesOnCanvas[0].clientX;
            viewport.touchStartY = touchesOnCanvas[0].clientY;
            viewport.dragThresholdMet = false;
            viewport.isDragging = false; // Don't set true yet - wait for threshold
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
        } else if (touchesOnCanvas.length === 1 && !viewport.isZooming) {
            // Check if drag threshold has been met
            if (!viewport.dragThresholdMet) {
                const deltaX = touchesOnCanvas[0].clientX - viewport.touchStartX;
                const deltaY = touchesOnCanvas[0].clientY - viewport.touchStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > DRAG_THRESHOLD) {
                    // Threshold exceeded - activate dragging and disable camera follow
                    viewport.dragThresholdMet = true;
                    viewport.isDragging = true;
                    viewport.followPlayer = false;
                }
            }

            // Only pan if drag threshold has been met
            if (viewport.isDragging) {
                // Update offset directly based on drag
                viewport.offsetX = touchesOnCanvas[0].clientX - viewport.dragStartX;
                viewport.offsetY = touchesOnCanvas[0].clientY - viewport.dragStartY;
                clampPanOffset();
            }
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
            // All touches ended
            // Check for tap-to-select enemy (single tap that wasn't a drag)
            if (!viewport.dragThresholdMet && viewport.touchStartX && viewport.touchStartY) {
                // Get the touch end position from changedTouches
                const changedTouch = e.changedTouches[0];
                if (changedTouch) {
                    // Check if this was a single tap (minimal movement)
                    const deltaX = changedTouch.clientX - viewport.touchStartX;
                    const deltaY = changedTouch.clientY - viewport.touchStartY;
                    const tapDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    // If movement was minimal and not waiting for double-tap zoom
                    if (tapDistance < 5 && !viewport.waitingForDoubleTap) {
                        // Convert to world coordinates and check for enemy hit
                        const worldPos = screenToWorld(changedTouch.clientX, changedTouch.clientY);
                        const tappedEnemy = getEnemyAtPosition(worldPos.x, worldPos.y);

                        // Only select if enemy is alive
                        if (tappedEnemy && !tappedEnemy.isDead) {
                            gameState.selectedEnemy = tappedEnemy;
                            const enemyName = tappedEnemy.type === 'basic' ? 'Goblin' : 'Orc';
                            showMessage(`Target: ${enemyName}`);
                        }
                    }
                }
            }

            // Reset drag state
            viewport.isDragging = false;
            viewport.dragThresholdMet = false;
        } else if (touchesOnCanvas.length === 1 && !viewport.isZooming) {
            // One finger remains - only continue drag if threshold was already met
            if (viewport.dragThresholdMet && viewport.isDragging) {
                // Continue existing drag with remaining finger
                viewport.dragStartX = touchesOnCanvas[0].clientX - viewport.offsetX;
                viewport.dragStartY = touchesOnCanvas[0].clientY - viewport.offsetY;
            } else {
                // Start fresh - treat as new potential drag
                viewport.touchStartX = touchesOnCanvas[0].clientX;
                viewport.touchStartY = touchesOnCanvas[0].clientY;
                viewport.dragThresholdMet = false;
                viewport.isDragging = false;
                viewport.dragStartX = touchesOnCanvas[0].clientX - viewport.offsetX;
                viewport.dragStartY = touchesOnCanvas[0].clientY - viewport.offsetY;
            }
        }
    }

    // Mouse Wheel Zoom (for desktop)
    function handleWheel(e) {
        if (!isTouchOnCanvas({ clientX: e.clientX, clientY: e.clientY })) return;

        e.preventDefault();

        const zoomDelta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
        const oldScale = viewport.scale;
        viewport.scale = Math.max(viewport.minScale, Math.min(viewport.maxScale, viewport.scale + zoomDelta));

        // Zoom towards mouse position
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const scaleFactor = viewport.scale / oldScale;
        viewport.offsetX = canvasX - (canvasX - viewport.offsetX) * scaleFactor;
        viewport.offsetY = canvasY - (canvasY - viewport.offsetY) * scaleFactor;

        clampPanOffset();
    }

    // Mouse Click Handler (desktop) - for enemy selection
    function handleClick(e) {
        // Only handle left clicks on canvas
        if (e.button !== 0) return;
        if (!isTouchOnCanvas({ clientX: e.clientX, clientY: e.clientY })) return;

        // Ignore clicks that were part of a drag
        if (viewport.dragThresholdMet) return;

        // Convert to world coordinates and check for enemy hit
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const clickedEnemy = getEnemyAtPosition(worldPos.x, worldPos.y);

        // Only select if enemy is alive
        if (clickedEnemy && !clickedEnemy.isDead) {
            gameState.selectedEnemy = clickedEnemy;
            const enemyName = clickedEnemy.type === 'basic' ? 'Goblin' : 'Orc';
            showMessage(`Target: ${enemyName}`);
        }
    }

    // Attach event listeners to canvas wrapper
    canvasWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvasWrapper.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    canvasWrapper.addEventListener('wheel', handleWheel, { passive: false });
    canvasWrapper.addEventListener('click', handleClick);
}

// Initialize game
function initGame() {
    setupVirtualJoystick();
    const charMenuHandler = setupCharacterMenu();
    const saveMenuHandler = setupSaveMenu();
    setupViewportControls();

    // Initialize magic system (Phase 2)
    MagicManager.init();

    // Setup ability bar and spellbook (Phase 3)
    setupAbilityBar();
    setupSpellbook();

    // Unified keyboard handler for ESC key (closes any open menu)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const spellbookModal = document.getElementById('spellbook-modal');
            const isSpellbookOpen = spellbookModal && !spellbookModal.classList.contains('hidden');

            if (isSpellbookOpen) {
                closeSpellbook();
            } else if (charMenuHandler && charMenuHandler.isOpen()) {
                charMenuHandler.closeMenu();
            } else if (saveMenuHandler && saveMenuHandler.isOpen()) {
                saveMenuHandler.closeMenu();
            }
        }
    });

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
    // Update time tracking (Phase 0: Time-based system)
    const currentTime = performance.now();
    gameState.deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;

    // Cap deltaTime to prevent physics explosion when tab is inactive
    if (gameState.deltaTime > MAX_DELTA_TIME) {
        gameState.deltaTime = MAX_DELTA_TIME;
    }

    // Handle edge case where deltaTime is exactly 0 (very rare)
    if (gameState.deltaTime === 0) {
        gameState.deltaTime = BASELINE_FRAME_TIME; // Assume 60 FPS baseline
    }

    gameState.gameTime++;                              // Keep as frame counter (for visual effects)
    gameState.elapsedTime += gameState.deltaTime;      // Track total milliseconds

    // Update magic system (Phase 2)
    MagicManager.update(gameState.deltaTime);

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

    // Update message timer (time-based)
    if (gameState.messageTimer > 0) {
        gameState.messageTimer = Math.max(0, gameState.messageTimer - gameState.deltaTime);
        if (gameState.messageTimer === 0) {
            document.getElementById('message-display').textContent = '';
        }
    }

    // Update zoom indicator
    updateZoomIndicator();

    requestAnimationFrame(gameLoop);
}
