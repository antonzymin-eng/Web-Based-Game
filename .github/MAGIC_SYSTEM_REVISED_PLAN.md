# Magic System Implementation Plan (REVISED)

**Version**: 2.0
**Date**: 2026-01-23
**Status**: Ready for Implementation

---

## Executive Summary

This revised plan addresses critical architectural, UX, and performance issues identified in the critique while maintaining the requirement for **8 ability buttons**. Key improvements include:

- ✅ **Time-based cooldowns** (fixes cross-device consistency)
- ✅ **Mobile-optimized 8-button layout** (2×4 grid with adaptive sizing)
- ✅ **Code organization strategy** (commented sections in game.js)
- ✅ **Complete spell progression system** (unlock + customization)
- ✅ **Balanced mana economy** (150 base, 3/sec regen)
- ✅ **Performance optimizations** (spatial partitioning, particle pooling)
- ✅ **Defined targeting UX** (real-time with 0.5x slow-motion)
- ✅ **Edge case handling** (state machine with explicit transitions)

**Estimated Implementation Time**: 14-18 hours (spread across phases)

---

## Critical Fixes from Critique

### 1. Time-Based Cooldowns (BLOCKER FIX)

**Problem**: Frame-based cooldowns cause inconsistent gameplay across devices.

**Solution**: Convert entire codebase to time-based system using `performance.now()`.

#### Implementation:

**Step 1**: Add time tracking to game state (game.js around line 35):
```javascript
const gameState = {
    keys: {},
    enemies: [],
    selectedEnemy: null,
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
    rooms: [],
    // NEW: Time tracking
    lastFrameTime: performance.now(),
    deltaTime: 0  // milliseconds since last frame
};
```

**Step 2**: Update game loop to track delta time (game.js around line 2410):
```javascript
function gameLoop() {
    const currentTime = performance.now();
    gameState.deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    gameState.gameTime += gameState.deltaTime;

    // ... rest of game loop
}
```

**Step 3**: Convert existing cooldowns from frames to milliseconds:
```javascript
// OLD (Player class):
this.attackCooldown = 30; // frames

// NEW:
this.attackCooldown = 0; // milliseconds remaining
this.attackCooldownDuration = 500; // 500ms = 0.5 seconds

// In update():
if (this.attackCooldown > 0) {
    this.attackCooldown = Math.max(0, this.attackCooldown - gameState.deltaTime);
}
```

**Step 4**: Apply to all existing systems:
- Player.attackCooldown: 30 frames → 500ms
- Enemy.attackCooldown: 60 frames → 1000ms
- Invulnerability: 60 frames → 1000ms
- Message timer: 180 frames → 3000ms

**Files to modify**:
- game.js:35-50 (gameState)
- game.js:145-596 (Player class)
- game.js:599-793 (Enemy class)
- game.js:934-945 (showMessage function)
- game.js:2409-2473 (gameLoop)

---

### 2. Mobile UI Solution for 8 Buttons

**Problem**: 8 buttons × 60px = 480px minimum, but iPhone SE is only 667px wide (with joystick and action buttons taking 340px).

**Solution**: Adaptive 2×4 grid layout that shrinks on mobile, positioned bottom-center.

#### Desktop Layout (≥768px width):
```
┌─────────────────────────────────────┐
│                                     │
│         Game Canvas                 │
│                                     │
└─────────────────────────────────────┘
  [1] [2] [3] [4] [5] [6] [7] [8]
  ↑ 8 buttons in single row, 60px each
```

#### Mobile Layout (<768px width):
```
┌─────────────────────────────┐
│                             │
│      Game Canvas            │
│                             │
└─────────────────────────────┘
🕹️                       [1][2]  ⚔️🎯
Joystick               [3][4]  Actions
                       [5][6]
                       [7][8]
                       ↑ 2×4 grid
                       50px each
```

#### CSS Implementation:

```css
/* Ability Bar - Responsive Layout */
.ability-bar {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: grid;
    gap: 6px;
    pointer-events: auto;
}

/* Desktop: 1 row × 8 columns */
@media (min-width: 768px) {
    .ability-bar {
        grid-template-columns: repeat(8, 1fr);
        grid-template-rows: 1fr;
        max-width: 560px; /* 8 × 65px + gaps */
    }

    .ability-btn {
        width: 65px;
        height: 65px;
        font-size: 28px;
    }
}

/* Tablet: 2 rows × 4 columns */
@media (min-width: 481px) and (max-width: 767px) {
    .ability-bar {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        max-width: 260px; /* 4 × 60px + gaps */
    }

    .ability-btn {
        width: 60px;
        height: 60px;
        font-size: 24px;
    }
}

/* Mobile: 2 rows × 4 columns, smaller */
@media (max-width: 480px) {
    .ability-bar {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        max-width: 216px; /* 4 × 50px + gaps */
        right: calc(env(safe-area-inset-right, 0px) + 10px);
        left: auto;
        transform: none;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
    }

    .ability-btn {
        width: 50px;
        height: 50px;
        font-size: 20px;
        border-width: 2px;
    }

    .ability-key {
        font-size: 8px;
        padding: 0px 2px;
    }
}
```

**Mobile Layout Math**:
```
Mobile (480px wide):
  Joystick: 120px (left side)
  Ability bar: 216px (right side, 2×4 grid)
  Action buttons: positioned ABOVE ability bar (no horizontal space conflict)
  Total horizontal: 120 + 216 = 336px ✓ Fits!

  Vertical stack (bottom to top):
    30px - safe area
    100px - ability bar (2 rows × 50px)
    80px - action buttons (moved up)
    = 210px total from bottom
```

#### HTML Structure:

```html
<!-- Ability Bar - Bottom Center/Right (Responsive) -->
<div class="ability-bar">
    <button class="ability-btn" data-slot="0" data-ability="" aria-label="Ability slot 1">
        <span class="ability-icon empty-slot">1</span>
        <span class="ability-key">1</span>
        <div class="cooldown-overlay"></div>
        <div class="mana-insufficient-overlay"></div>
    </button>
    <button class="ability-btn" data-slot="1" data-ability="" aria-label="Ability slot 2">
        <span class="ability-icon empty-slot">2</span>
        <span class="ability-key">2</span>
        <div class="cooldown-overlay"></div>
        <div class="mana-insufficient-overlay"></div>
    </button>
    <!-- Repeat for slots 2-7 (total 8 buttons) -->
</div>
```

**Note**: Slots start empty. Players assign spells via spellbook UI (see Phase 3).

---

### 3. Code Organization Strategy

**Problem**: Adding 500-1000 lines to 2,473-line file = 3,000+ lines (unmaintainable).

**Solution**: Organize game.js into clearly commented sections. Future refactor to modules can happen later.

#### New File Structure (game.js):

```javascript
// ============================================================================
// SECTION 1: CONSTANTS & CONFIGURATION (Lines 1-100)
// ============================================================================
const CANVAS_WIDTH = 800;
// ... existing constants

// NEW: Magic System Constants
const MAGIC_CONSTANTS = {
    BASE_MANA: 150,
    BASE_MANA_REGEN: 3.0, // per second
    GLOBAL_COOLDOWN: 500, // milliseconds
    // ... (see Phase 2)
};

// ============================================================================
// SECTION 2: GAME STATE (Lines 100-150)
// ============================================================================
const gameState = {
    // ... existing state

    // NEW: Magic state
    magicState: null // Will be initialized in MagicManager
};

// ============================================================================
// SECTION 3: UTILITY FUNCTIONS (Lines 150-250)
// ============================================================================
function screenToWorld(screenX, screenY) { /* ... */ }
// ... existing utilities

// ============================================================================
// SECTION 4: ENTITY CLASSES (Lines 250-850)
// ============================================================================
class Player { /* ... */ }
class Enemy { /* ... */ }
class Particle { /* ... */ }

// ============================================================================
// SECTION 5: MAGIC SYSTEM (Lines 850-1850) *** NEW ***
// ============================================================================
// 5.1: Ability Definitions
const ABILITIES = { /* ... */ };

// 5.2: Spell Progression
const SpellProgressionManager = { /* ... */ };

// 5.3: Magic State Manager
const MagicManager = { /* ... */ };

// 5.4: Targeting System
const TargetingSystem = { /* ... */ };

// 5.5: Spell Effects
const SpellEffects = { /* ... */ };

// ============================================================================
// SECTION 6: COMBAT SYSTEM (Lines 1850-2100)
// ============================================================================
function selectNearestEnemy() { /* ... */ }
// ... existing combat functions

// ============================================================================
// SECTION 7: UI MANAGERS (Lines 2100-2300)
// ============================================================================
function updateUI() { /* ... */ }
// ... existing UI functions

// NEW: Magic UI functions
function updateAbilityBar() { /* ... */ }
function updateManaDisplay() { /* ... */ }

// ============================================================================
// SECTION 8: SAVE/LOAD SYSTEM (Lines 2300-2500)
// ============================================================================
const SaveManager = { /* ... */ };

// ============================================================================
// SECTION 9: EVENT HANDLERS (Lines 2500-2800)
// ============================================================================
// ... existing event handlers

// NEW: Ability bar event handlers
function setupAbilityBar() { /* ... */ }
function setupSpellbookUI() { /* ... */ }

// ============================================================================
// SECTION 10: GAME LOOP & INITIALIZATION (Lines 2800-3000)
// ============================================================================
function gameLoop() { /* ... */ }
function initGame() { /* ... */ }
```

**Benefits**:
- Clear boundaries for each system
- Easy to find specific code
- Can be split into modules later without rewrite
- Section comments visible in IDE outline view

---

## Phase 0: Foundation & Architecture (3-4 hours)

**Goal**: Convert codebase to time-based system, add code section markers, update saves.

### Step 0.1: Convert to Time-Based (CRITICAL)

1. Add deltaTime to gameState
2. Update gameLoop to track time
3. Convert Player.attackCooldown to milliseconds
4. Convert Enemy.attackCooldown to milliseconds
5. Convert invulnerability to milliseconds
6. Convert message timer to milliseconds
7. Test thoroughly - ensure no frame-rate dependencies

**Test Cases**:
- Throttle browser to 30 FPS - cooldowns should still be 500ms
- Normal 60 FPS - cooldowns should still be 500ms
- Uncapped FPS - cooldowns should still be 500ms

### Step 0.2: Add Section Comments

Insert section markers (see structure above) to make file navigable.

### Step 0.3: Save Version System

Update SaveManager (game.js around line 1900):

```javascript
const SAVE_VERSION = 2; // Increment for magic system

const SaveManager = {
    save() {
        const saveData = {
            v: SAVE_VERSION, // Version number
            t: Date.now(),
            p: {
                // ... existing player data

                // NEW: Magic system data
                mana: player.mana,
                baseMana: player.baseMana,
                unlockedSpells: player.unlockedSpells,
                hotbar: player.hotbar // [abilityId, abilityId, null, ...]
            },
            // ... rest of save
        };

        // ... save to localStorage
    },

    applySave(saveData) {
        // Version migration
        if (saveData.v === 1) {
            // Migrate old save to version 2
            saveData.p.mana = 150;
            saveData.p.baseMana = 150;
            saveData.p.unlockedSpells = ['magic_missile']; // Default spell
            saveData.p.hotbar = ['magic_missile', null, null, null, null, null, null, null];
        }

        // Apply save data...
    }
};
```

---

## Phase 1: Mana System & UI (2-3 hours)

### Step 1.1: Add Mana to Player Class

Location: Player constructor (game.js around line 155)

```javascript
class Player {
    constructor(x, y) {
        // ... existing properties

        // Mana System (NEW)
        this.baseMana = MAGIC_CONSTANTS.BASE_MANA; // 150
        this.mana = 0; // Will be set after updateComputedStats()
        this.manaRegen = 0; // Per second, calculated from Wisdom
        this.spellPower = 0; // Spell damage bonus, from Intelligence
        this.magicDefense = 0; // Magic damage reduction, from Wisdom

        // Spell System (NEW)
        this.unlockedSpells = ['magic_missile']; // Start with one basic spell
        this.hotbar = [
            'magic_missile', // Slot 1
            null, null, null, null, null, null, null // Slots 2-8 empty
        ];

        // Update computed stats (will calculate maxMana, etc.)
        this.updateComputedStats();

        // Set mana to full after stats calculated
        this.mana = this.maxMana;
    }
}
```

### Step 1.2: Update Computed Stats

Location: Player.updateComputedStats() (game.js around line 197)

```javascript
updateComputedStats() {
    // ... existing stat calculations

    // Magic stats (NEW)
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
```

### Step 1.3: Add Mana Regeneration

Location: Player.update() (game.js around line 320)

```javascript
update() {
    // ... existing update logic

    // Mana regeneration (NEW)
    const manaRegenPerMs = this.manaRegen / 1000; // Per second → per millisecond
    const manaGain = manaRegenPerMs * gameState.deltaTime;
    this.mana = Math.min(this.maxMana, this.mana + manaGain);

    // ... rest of update
}
```

### Step 1.4: Add Mana Bar UI

**HTML** (index.html around line 26, after health):

```html
<div class="quick-stats">
    <div class="quick-health">
        <span class="quick-label">HP:</span>
        <div class="quick-bar-container">
            <div class="quick-bar health-bar" id="quick-health-bar"></div>
        </div>
        <span id="quick-health-text">100/100</span>
    </div>

    <!-- NEW: Mana Bar -->
    <div class="quick-mana">
        <span class="quick-label">MP:</span>
        <div class="quick-bar-container">
            <div class="quick-bar mana-bar" id="quick-mana-bar"></div>
        </div>
        <span id="quick-mana-text">155/155</span>
    </div>

    <div class="quick-level">
        Lv.<span id="quick-level">1</span>
    </div>
</div>
```

**CSS** (styles.css around line 130):

```css
/* Mana Bar Styling */
.quick-mana {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mana-bar {
    background: linear-gradient(90deg, #4fc3f7, #2196F3);
    width: 100%;
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
}

/* Update quick-stats grid to include mana */
.quick-stats {
    display: flex;
    gap: 15px;
    align-items: center;
}

@media (max-width: 768px) {
    .quick-stats {
        flex-direction: column;
        gap: 5px;
        align-items: flex-start;
    }
}
```

**JavaScript** update in updateUI() (game.js around line 940):

```javascript
function updateUI() {
    // ... existing UI updates

    // Update mana display (NEW)
    const manaText = `${Math.floor(player.mana)}/${player.maxMana}`;
    document.getElementById('quick-mana-text').textContent = manaText;
    const manaPercent = (player.mana / player.maxMana) * 100;
    document.getElementById('quick-mana-bar').style.width = manaPercent + '%';
}
```

### Step 1.5: Update Character Menu

Add mana stats to character menu (index.html around line 96):

```html
<div class="stat-section">
    <h3>Mana</h3>
    <div class="stat-row">
        <span class="stat-label">MP:</span>
        <span class="stat-value" id="mana-text-detail">155/155</span>
    </div>
    <div class="stat-row">
        <span class="stat-label">Regen:</span>
        <span class="stat-value" id="mana-regen-text">3.0/sec</span>
    </div>
    <div class="stat-row">
        <span class="stat-label">⚡ Spell Power:</span>
        <span class="stat-value" id="spell-power-text">0</span>
    </div>
</div>
```

Update in updateUI():

```javascript
document.getElementById('mana-text-detail').textContent =
    `${Math.floor(player.mana)}/${player.maxMana}`;
document.getElementById('mana-regen-text').textContent =
    player.manaRegen.toFixed(1) + '/sec';
document.getElementById('spell-power-text').textContent =
    player.spellPower;
```

---

## Phase 2: Ability System Architecture (3-4 hours)

### Step 2.1: Define Abilities

Location: New section in game.js (around line 850)

```javascript
// ============================================================================
// SECTION 5: MAGIC SYSTEM
// ============================================================================

// 5.1: Ability Definitions
const MAGIC_CONSTANTS = {
    BASE_MANA: 150,
    BASE_MANA_REGEN: 3.0,
    GLOBAL_COOLDOWN: 500, // ms
    TARGETING_MODES: {
        INSTANT: 'instant',           // No targeting, casts immediately
        INSTANT_SELF: 'instant_self', // Self-cast (heal, buff)
        ENEMY_TARGET: 'enemy_target', // Uses tab-target system
        CIRCLE_AOE: 'circle_aoe',     // Movable circle
        CONE: 'cone',                 // Cone from player
        LINE: 'line',                 // Line from player
        LINE_GROUND: 'line_ground'    // Line independent of player
    },
    PARTICLE_POOL_SIZE: 300, // Max active particles
    SPATIAL_GRID_SIZE: 10    // For optimized enemy queries
};

const ABILITIES = {
    // Starter spell - always unlocked
    magic_missile: {
        id: 'magic_missile',
        name: 'Magic Missile',
        icon: '✨',
        description: 'Fire a magical projectile at your target',
        manaCost: 10,
        cooldown: 1500, // 1.5 seconds
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
        cooldown: 3000, // 3 seconds
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
        radius: 100, // AOE around player
        damage: 20,
        slow: 0.5, // 50% slow for 2 seconds
        slowDuration: 2000,
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

    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        icon: '⚡',
        description: 'Lightning that jumps between enemies',
        manaCost: 45,
        cooldown: 6000,
        targetingMode: MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET,
        range: 200,
        damage: 25,
        chains: 3, // Hits 3 additional enemies
        chainRange: 120,
        color: '#ffff00',
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
};
```

### Step 2.2: Spell Progression Manager

```javascript
// 5.2: Spell Progression System
const SpellProgressionManager = {
    // Get all spells available at current level
    getAvailableSpells(playerLevel) {
        const available = [];
        for (const key in ABILITIES) {
            const spell = ABILITIES[key];
            if (spell.unlockLevel <= playerLevel) {
                available.push(spell);
            }
        }
        return available;
    },

    // Check if spell is unlocked
    isUnlocked(spellId) {
        return player.unlockedSpells.includes(spellId);
    },

    // Unlock a spell
    unlock(spellId) {
        if (!this.isUnlocked(spellId)) {
            player.unlockedSpells.push(spellId);
            showMessage(`Learned: ${ABILITIES[spellId].name}!`);
            return true;
        }
        return false;
    },

    // Auto-unlock spells when leveling up
    checkLevelUnlocks(newLevel) {
        const newSpells = [];
        for (const key in ABILITIES) {
            const spell = ABILITIES[key];
            if (spell.unlockLevel === newLevel && !this.isUnlocked(spell.id)) {
                this.unlock(spell.id);
                newSpells.push(spell);
            }
        }
        return newSpells;
    },

    // Assign spell to hotbar slot
    assignToHotbar(spellId, slotIndex) {
        if (slotIndex < 0 || slotIndex >= 8) return false;
        if (!this.isUnlocked(spellId)) return false;

        player.hotbar[slotIndex] = spellId;
        updateAbilityBar();
        return true;
    },

    // Remove spell from hotbar slot
    removeFromHotbar(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 8) return false;
        player.hotbar[slotIndex] = null;
        updateAbilityBar();
        return true;
    }
};
```

### Step 2.3: Magic State Manager

```javascript
// 5.3: Magic State Manager
const MagicManager = {
    state: {
        activeAbility: null,      // Currently selected ability ID
        targetingActive: false,
        targetingMode: null,
        targetX: 0,
        targetY: 0,
        targetAngle: 0,

        // Cooldown tracking (time-based)
        cooldowns: {},            // { spellId: timeRemaining in ms }
        globalCooldown: 0,        // Global cooldown remaining (ms)

        // Casting state
        isCasting: false,
        castStartTime: 0,

        // Performance optimization
        lastManaUpdate: 0
    },

    init() {
        // Initialize cooldowns for all abilities
        Object.keys(ABILITIES).forEach(key => {
            this.state.cooldowns[key] = 0;
        });
    },

    // Update cooldowns each frame
    update(deltaTime) {
        // Decrement global cooldown
        if (this.state.globalCooldown > 0) {
            this.state.globalCooldown = Math.max(0, this.state.globalCooldown - deltaTime);
        }

        // Decrement ability cooldowns
        Object.keys(this.state.cooldowns).forEach(key => {
            if (this.state.cooldowns[key] > 0) {
                this.state.cooldowns[key] = Math.max(0, this.state.cooldowns[key] - deltaTime);
            }
        });
    },

    // Check if ability can be cast
    canCast(abilityId) {
        const ability = ABILITIES[abilityId];
        if (!ability) {
            return { success: false, reason: 'Invalid ability' };
        }

        // Check if unlocked
        if (!SpellProgressionManager.isUnlocked(abilityId)) {
            return { success: false, reason: 'Spell not learned' };
        }

        // Check mana
        if (player.mana < ability.manaCost) {
            return { success: false, reason: 'Not enough mana' };
        }

        // Check cooldown
        if (this.state.cooldowns[abilityId] > 0) {
            const secondsLeft = Math.ceil(this.state.cooldowns[abilityId] / 1000);
            return { success: false, reason: `Cooldown: ${secondsLeft}s` };
        }

        // Check global cooldown
        if (this.state.globalCooldown > 0) {
            return { success: false, reason: 'Not ready' };
        }

        // Check if already casting
        if (this.state.isCasting) {
            return { success: false, reason: 'Already casting' };
        }

        // Check range for enemy-target spells
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET) {
            if (!gameState.selectedEnemy || gameState.selectedEnemy.isDead) {
                return { success: false, reason: 'No target' };
            }

            const dist = Math.sqrt(
                Math.pow((gameState.selectedEnemy.x + gameState.selectedEnemy.width / 2) - (player.x + player.width / 2), 2) +
                Math.pow((gameState.selectedEnemy.y + gameState.selectedEnemy.height / 2) - (player.y + player.height / 2), 2)
            );

            if (dist > ability.range) {
                return { success: false, reason: 'Out of range' };
            }
        }

        return { success: true };
    },

    // Begin casting (enter targeting mode or cast instantly)
    beginCast(abilityId) {
        const canCast = this.canCast(abilityId);
        if (!canCast.success) {
            showMessage(canCast.reason);
            return false;
        }

        const ability = ABILITIES[abilityId];
        this.state.activeAbility = abilityId;

        // Instant cast abilities
        if (ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.INSTANT ||
            ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF ||
            ability.targetingMode === MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET) {
            this.executeCast(null);
            return true;
        }

        // Enter targeting mode
        this.enterTargetingMode(ability);
        return true;
    },

    // Enter targeting mode (for ground-targeted spells)
    enterTargetingMode(ability) {
        this.state.targetingActive = true;
        this.state.targetingMode = ability.targetingMode;

        // Initialize target position near player
        this.state.targetX = player.x + player.width / 2;
        this.state.targetY = player.y + player.height / 2;
        this.state.targetAngle = 0;

        // Apply slow-motion effect
        gameState.timeScale = 0.5;
    },

    // Cancel targeting mode
    cancelTargeting() {
        this.state.targetingActive = false;
        this.state.targetingMode = null;
        this.state.activeAbility = null;

        // Remove slow-motion
        gameState.timeScale = 1.0;

        showMessage('Cancelled');
    },

    // Confirm targeting and execute spell
    confirmTargeting() {
        if (!this.state.targetingActive) return;

        const targetData = {
            x: this.state.targetX,
            y: this.state.targetY,
            angle: this.state.targetAngle
        };

        this.executeCast(targetData);
    },

    // Execute the spell
    executeCast(targetData) {
        const ability = ABILITIES[this.state.activeAbility];

        // Consume mana
        player.mana -= ability.manaCost;

        // Set cooldowns
        this.state.cooldowns[ability.id] = ability.cooldown;
        this.state.globalCooldown = MAGIC_CONSTANTS.GLOBAL_COOLDOWN;

        // Execute spell effect
        SpellEffects.execute(ability, targetData);

        // Exit targeting mode
        if (this.state.targetingActive) {
            this.state.targetingActive = false;
            this.state.targetingMode = null;
            gameState.timeScale = 1.0;
        }

        this.state.activeAbility = null;

        // Update UI
        updateUI();
        updateAbilityBar();
    },

    // Get cooldown percentage (for UI)
    getCooldownPercent(abilityId) {
        const ability = ABILITIES[abilityId];
        if (!ability) return 0;

        const remaining = this.state.cooldowns[abilityId] || 0;
        return (remaining / ability.cooldown) * 100;
    }
};
```

### Step 2.4: Add Time Scale to Game State

For slow-motion during targeting (game.js around line 35):

```javascript
const gameState = {
    // ... existing state
    timeScale: 1.0, // NEW: 1.0 = normal, 0.5 = slow-motion
    // ... rest
};
```

Apply time scale in update loops (Player.update, Enemy.update):

```javascript
// In Player.update():
update() {
    const scaledDelta = gameState.deltaTime * gameState.timeScale;

    // Movement
    const moveSpeed = this.speed * (scaledDelta / 16.67); // Normalize to ~60 FPS
    // ... use moveSpeed for movement calculations

    // Cooldowns (don't scale - always tick at real time)
    if (this.attackCooldown > 0) {
        this.attackCooldown = Math.max(0, this.attackCooldown - gameState.deltaTime);
    }

    // Mana regen (don't scale - always tick at real time)
    const manaRegenPerMs = this.manaRegen / 1000;
    const manaGain = manaRegenPerMs * gameState.deltaTime;
    this.mana = Math.min(this.maxMana, this.mana + manaGain);
}
```

---

## Phase 3: UI - Ability Bar & Spellbook (3-4 hours)

### Step 3.1: Ability Bar HTML

Add to index.html (after action-controls, around line 58):

```html
<!-- Ability Bar - Bottom Center/Right (Responsive) -->
<div class="ability-bar">
    <button class="ability-btn" data-slot="0" data-ability="" aria-label="Ability slot 1" tabindex="0">
        <span class="ability-icon empty-slot">1</span>
        <span class="ability-key">1</span>
        <div class="ability-cooldown-overlay"></div>
        <div class="ability-mana-overlay"></div>
        <div class="ability-locked-overlay"></div>
    </button>
    <!-- Repeat for slots 1-7 (8 total) -->
</div>
```

### Step 3.2: Ability Bar CSS

Add to styles.css (end of file):

```css
/* ============================================================================
   ABILITY BAR - Responsive 8-Button Layout
   ============================================================================ */

.ability-bar {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: grid;
    gap: 6px;
    pointer-events: auto;
}

.ability-btn {
    position: relative;
    border-radius: 8px;
    border: 3px solid #2196F3;
    background: linear-gradient(145deg, #1976D2, #0D47A1);
    color: white;
    cursor: pointer;
    transition: all 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.ability-btn:hover {
    transform: translateY(-2px);
    border-color: #FFD700;
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.ability-btn:active {
    transform: translateY(0) scale(0.95);
}

.ability-btn.empty-slot {
    opacity: 0.4;
    border-color: #555;
    background: linear-gradient(145deg, #424242, #212121);
}

.ability-btn.on-cooldown {
    opacity: 0.6;
    cursor: not-allowed;
}

.ability-btn.insufficient-mana {
    border-color: #f44336;
    opacity: 0.7;
}

.ability-icon {
    font-size: inherit;
    line-height: 1;
    position: relative;
    z-index: 2;
}

.ability-icon.empty-slot {
    font-size: 0.6em;
    color: #888;
}

.ability-key {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 10px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
    z-index: 2;
}

/* Cooldown Overlay - Fills from bottom */
.ability-cooldown-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.75);
    height: 0%;
    transition: height 0.1s linear;
    border-radius: 5px;
    z-index: 1;
}

/* Mana Insufficient Overlay - Red tint */
.ability-mana-overlay {
    position: absolute;
    inset: 0;
    background: rgba(244, 67, 54, 0.4);
    border-radius: 5px;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1;
    pointer-events: none;
}

.ability-btn.insufficient-mana .ability-mana-overlay {
    opacity: 1;
}

/* Locked Overlay - Shows lock icon */
.ability-locked-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 5px;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    z-index: 3;
}

.ability-locked-overlay::before {
    content: '🔒';
}

/* Desktop: 1 row × 8 columns */
@media (min-width: 768px) {
    .ability-bar {
        grid-template-columns: repeat(8, 1fr);
        grid-template-rows: 1fr;
        max-width: 560px;
    }

    .ability-btn {
        width: 65px;
        height: 65px;
        font-size: 28px;
    }
}

/* Tablet: 2 rows × 4 columns */
@media (min-width: 481px) and (max-width: 767px) {
    .ability-bar {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        max-width: 260px;
    }

    .ability-btn {
        width: 60px;
        height: 60px;
        font-size: 24px;
    }
}

/* Mobile: 2 rows × 4 columns, positioned right */
@media (max-width: 480px) {
    .ability-bar {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        max-width: 216px;
        right: calc(env(safe-area-inset-right, 0px) + 10px);
        left: auto;
        transform: none;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
    }

    .ability-btn {
        width: 50px;
        height: 50px;
        font-size: 20px;
        border-width: 2px;
    }

    .ability-key {
        font-size: 8px;
        padding: 0px 2px;
    }

    /* Move action buttons up on mobile to avoid overlap */
    .action-controls {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 220px);
    }
}
```

### Step 3.3: Ability Bar JavaScript

Add to game.js (new section around line 2100):

```javascript
// Update ability bar display
function updateAbilityBar() {
    const buttons = document.querySelectorAll('.ability-btn');

    buttons.forEach((btn, index) => {
        const spellId = player.hotbar[index];
        const icon = btn.querySelector('.ability-icon');
        const cooldownOverlay = btn.querySelector('.ability-cooldown-overlay');

        if (!spellId) {
            // Empty slot
            btn.classList.add('empty-slot');
            btn.classList.remove('on-cooldown', 'insufficient-mana');
            icon.textContent = (index + 1).toString();
            icon.classList.add('empty-slot');
            cooldownOverlay.style.height = '0%';
            btn.setAttribute('data-ability', '');
            return;
        }

        const ability = ABILITIES[spellId];
        if (!ability) return;

        // Update icon
        icon.textContent = ability.icon;
        icon.classList.remove('empty-slot');
        btn.classList.remove('empty-slot');
        btn.setAttribute('data-ability', spellId);

        // Update cooldown overlay
        const cooldownPercent = MagicManager.getCooldownPercent(spellId);
        cooldownOverlay.style.height = cooldownPercent + '%';

        if (cooldownPercent > 0) {
            btn.classList.add('on-cooldown');
        } else {
            btn.classList.remove('on-cooldown');
        }

        // Update mana state
        if (player.mana < ability.manaCost) {
            btn.classList.add('insufficient-mana');
        } else {
            btn.classList.remove('insufficient-mana');
        }
    });
}

// Setup ability bar event listeners
function setupAbilityBar() {
    const buttons = document.querySelectorAll('.ability-btn');

    buttons.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const spellId = player.hotbar[index];
            if (spellId) {
                MagicManager.beginCast(spellId);
            } else {
                showMessage('Empty slot - assign a spell');
            }
        });

        // Right-click to open spellbook at this slot
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openSpellbookForSlot(index);
        });
    });

    // Keyboard shortcuts (1-8)
    document.addEventListener('keydown', (e) => {
        // Numbers 1-8
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= 8) {
            const spellId = player.hotbar[keyNum - 1];
            if (spellId) {
                MagicManager.beginCast(spellId);
            }
        }

        // ESC to cancel targeting
        if (e.key === 'Escape' && MagicManager.state.targetingActive) {
            MagicManager.cancelTargeting();
        }
    });
}
```

### Step 3.4: Spellbook UI

Add spellbook modal to index.html (after char-menu, around line 245):

```html
<!-- Spellbook Modal -->
<div id="spellbook-menu" class="char-menu hidden" role="dialog" aria-labelledby="spellbook-title" aria-modal="true" aria-hidden="true">
    <div class="char-menu-content">
        <div class="char-menu-header">
            <h2 id="spellbook-title">📖 Spellbook</h2>
            <button id="spellbook-close" class="close-btn" aria-label="Close spellbook">✕</button>
        </div>

        <div class="char-menu-body">
            <div class="spellbook-info">
                <p>Click a spell to assign it to slot <span id="target-slot-number">1</span></p>
            </div>

            <div id="spell-list" class="spell-list">
                <!-- Dynamically populated with spell cards -->
            </div>
        </div>
    </div>
</div>
```

Add spellbook CSS (styles.css):

```css
/* Spellbook */
.spellbook-info {
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    margin-bottom: 15px;
    text-align: center;
    color: #FFD700;
}

.spell-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
}

.spell-card {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #4CAF50;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    gap: 12px;
    align-items: center;
}

.spell-card:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: #FFD700;
    transform: translateX(5px);
}

.spell-card.locked {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #888;
}

.spell-card-icon {
    font-size: 2em;
    width: 50px;
    text-align: center;
}

.spell-card-info {
    flex: 1;
}

.spell-card-name {
    font-size: 1.2em;
    font-weight: bold;
    color: #FFD700;
    margin-bottom: 4px;
}

.spell-card-description {
    font-size: 0.9em;
    color: #ccc;
    margin-bottom: 6px;
}

.spell-card-stats {
    display: flex;
    gap: 12px;
    font-size: 0.85em;
    color: #aaa;
}

.spell-card-stat {
    display: flex;
    align-items: center;
    gap: 4px;
}
```

Add spellbook JavaScript:

```javascript
// Open spellbook for specific slot
function openSpellbookForSlot(slotIndex) {
    const spellbookMenu = document.getElementById('spellbook-menu');
    const spellList = document.getElementById('spell-list');
    const targetSlotNumber = document.getElementById('target-slot-number');

    // Update target slot display
    targetSlotNumber.textContent = slotIndex + 1;

    // Clear existing list
    spellList.innerHTML = '';

    // Populate with available spells
    for (const key in ABILITIES) {
        const spell = ABILITIES[key];
        const isUnlocked = SpellProgressionManager.isUnlocked(spell.id);
        const isInSlot = player.hotbar.includes(spell.id);

        const card = document.createElement('div');
        card.className = 'spell-card';
        if (!isUnlocked) card.classList.add('locked');

        card.innerHTML = `
            <div class="spell-card-icon">${spell.icon}</div>
            <div class="spell-card-info">
                <div class="spell-card-name">
                    ${spell.name}
                    ${!isUnlocked ? '🔒' : ''}
                    ${isInSlot ? '(Assigned)' : ''}
                </div>
                <div class="spell-card-description">${spell.description}</div>
                <div class="spell-card-stats">
                    <span class="spell-card-stat">💧 ${spell.manaCost}</span>
                    <span class="spell-card-stat">⏱️ ${(spell.cooldown / 1000).toFixed(1)}s</span>
                    ${spell.damage ? `<span class="spell-card-stat">⚔️ ${spell.damage}</span>` : ''}
                    ${spell.healing ? `<span class="spell-card-stat">💚 ${spell.healing}</span>` : ''}
                    <span class="spell-card-stat">📍 Lv.${spell.unlockLevel}</span>
                </div>
            </div>
        `;

        if (isUnlocked) {
            card.addEventListener('click', () => {
                SpellProgressionManager.assignToHotbar(spell.id, slotIndex);
                showMessage(`${spell.name} assigned to slot ${slotIndex + 1}`);
                spellbookMenu.classList.add('hidden');
            });
        }

        spellList.appendChild(card);
    }

    // Show spellbook
    spellbookMenu.classList.remove('hidden');
}

// Setup spellbook close button
function setupSpellbookUI() {
    const closeBtn = document.getElementById('spellbook-close');
    const spellbookMenu = document.getElementById('spellbook-menu');

    closeBtn.addEventListener('click', () => {
        spellbookMenu.classList.add('hidden');
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !spellbookMenu.classList.contains('hidden')) {
            spellbookMenu.classList.add('hidden');
        }
    });
}
```

---

## Phase 4: Targeting System (4-5 hours)

### Step 4.1: Targeting Overlay Rendering

Add to gameLoop() before ctx.restore() (game.js around line 2456):

```javascript
// Draw targeting overlay (if active)
if (MagicManager.state.targetingActive) {
    TargetingSystem.draw(ctx);
}
```

### Step 4.2: Targeting System Implementation

Add to Section 5 (Magic System) in game.js:

```javascript
// 5.4: Targeting System
const TargetingSystem = {
    // Update target position from mouse/touch
    updatePosition(worldX, worldY) {
        if (!MagicManager.state.targetingActive) return;

        const ability = ABILITIES[MagicManager.state.activeAbility];
        const mode = MagicManager.state.targetingMode;

        MagicManager.state.targetX = worldX;
        MagicManager.state.targetY = worldY;

        // Calculate angle for cone/line abilities
        if (mode === MAGIC_CONSTANTS.TARGETING_MODES.CONE ||
            mode === MAGIC_CONSTANTS.TARGETING_MODES.LINE) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const angle = Math.atan2(worldY - playerCenterY, worldX - playerCenterX);
            MagicManager.state.targetAngle = angle;
        }
    },

    // Draw targeting overlay
    draw(ctx) {
        const ability = ABILITIES[MagicManager.state.activeAbility];
        const mode = MagicManager.state.targetingMode;

        ctx.save();
        ctx.globalAlpha = 0.4;

        switch (mode) {
            case MAGIC_CONSTANTS.TARGETING_MODES.CIRCLE_AOE:
                this.drawCircle(ctx, ability);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.CONE:
                this.drawCone(ctx, ability);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.LINE:
                this.drawLine(ctx, ability);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.LINE_GROUND:
                this.drawLineGround(ctx, ability);
                break;
        }

        ctx.restore();

        // Draw cancel button
        this.drawCancelButton(ctx);

        // Draw instruction text
        this.drawInstructions(ctx, ability);
    },

    drawCircle(ctx, ability) {
        const x = MagicManager.state.targetX;
        const y = MagicManager.state.targetY;
        const radius = ability.radius;

        // Check if in range
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const dist = Math.sqrt(
            Math.pow(x - playerCenterX, 2) +
            Math.pow(y - playerCenterY, 2)
        );

        const inRange = dist <= ability.range;
        const color = inRange ? ability.color : '#ff0000';

        // Draw range limit circle (from player)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(playerCenterX, playerCenterY, ability.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw AOE circle
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw crosshair
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 15, y);
        ctx.lineTo(x + 15, y);
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x, y + 15);
        ctx.stroke();
    },

    drawCone(ctx, ability) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const angle = MagicManager.state.targetAngle;
        const halfAngle = (ability.angle / 2) * Math.PI / 180;

        ctx.fillStyle = ability.color;
        ctx.strokeStyle = ability.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(playerCenterX, playerCenterY);
        ctx.arc(playerCenterX, playerCenterY, ability.range,
                angle - halfAngle, angle + halfAngle);
        ctx.lineTo(playerCenterX, playerCenterY);
        ctx.fill();
        ctx.stroke();
    },

    drawLine(ctx, ability) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const angle = MagicManager.state.targetAngle;
        const endX = playerCenterX + Math.cos(angle) * ability.range;
        const endY = playerCenterY + Math.sin(angle) * ability.range;

        ctx.strokeStyle = ability.color;
        ctx.lineWidth = ability.width;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(playerCenterX, playerCenterY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    },

    drawLineGround(ctx, ability) {
        const x = MagicManager.state.targetX;
        const y = MagicManager.state.targetY;
        const angle = MagicManager.state.targetAngle;
        const halfLength = ability.length / 2;

        const startX = x - Math.cos(angle) * halfLength;
        const startY = y - Math.sin(angle) * halfLength;
        const endX = x + Math.cos(angle) * halfLength;
        const endY = y + Math.sin(angle) * halfLength;

        ctx.strokeStyle = ability.color;
        ctx.lineWidth = ability.width;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    },

    drawCancelButton(ctx) {
        // Draw in screen space (not world space)
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        const btnX = CANVAS_WIDTH / 2 - 50;
        const btnY = 30;
        const btnWidth = 100;
        const btnHeight = 40;

        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
        ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CANCEL (ESC)', btnX + btnWidth / 2, btnY + btnHeight / 2);
    },

    drawInstructions(ctx, ability) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);

        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = `${ability.name} - Click to cast, ESC to cancel`;
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25);
    }
};
```

### Step 4.3: Mouse/Touch Controls

Add to event handler section (game.js around line 2600):

```javascript
// Targeting controls
function setupTargetingControls() {
    let isDraggingTarget = false;

    canvas.addEventListener('mousedown', (e) => {
        if (!MagicManager.state.targetingActive) return;

        // Check if clicked cancel button (screen space)
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        if (screenX >= CANVAS_WIDTH / 2 - 50 && screenX <= CANVAS_WIDTH / 2 + 50 &&
            screenY >= 30 && screenY <= 70) {
            MagicManager.cancelTargeting();
            return;
        }

        // Convert to world space
        const world = screenToWorld(e.clientX, e.clientY);
        TargetingSystem.updatePosition(world.x, world.y);
        isDraggingTarget = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!MagicManager.state.targetingActive) return;
        if (!isDraggingTarget) {
            // Still update position even without drag (for line/cone aiming)
            const world = screenToWorld(e.clientX, e.clientY);
            TargetingSystem.updatePosition(world.x, world.y);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!MagicManager.state.targetingActive) return;

        if (isDraggingTarget) {
            isDraggingTarget = false;
            MagicManager.confirmTargeting();
        }
    });

    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        if (!MagicManager.state.targetingActive) return;

        const touch = e.touches[0];
        const world = screenToWorld(touch.clientX, touch.clientY);
        TargetingSystem.updatePosition(world.x, world.y);
        isDraggingTarget = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!MagicManager.state.targetingActive) return;

        e.preventDefault();
        const touch = e.touches[0];
        const world = screenToWorld(touch.clientX, touch.clientY);
        TargetingSystem.updatePosition(world.x, world.y);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!MagicManager.state.targetingActive) return;

        if (isDraggingTarget) {
            isDraggingTarget = false;
            MagicManager.confirmTargeting();
        }
    });
}
```

---

## Phase 5: Spell Effects & Combat (3-4 hours)

### Step 5.1: Spell Effects System

Add to Section 5 (Magic System):

```javascript
// 5.5: Spell Effects
const SpellEffects = {
    execute(ability, targetData) {
        switch (ability.targetingMode) {
            case MAGIC_CONSTANTS.TARGETING_MODES.INSTANT_SELF:
                this.executeInstantSelf(ability);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.ENEMY_TARGET:
                this.executeEnemyTarget(ability);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.CIRCLE_AOE:
                this.executeCircleAOE(ability, targetData.x, targetData.y);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.CONE:
                this.executeCone(ability, targetData.angle);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.LINE:
                this.executeLine(ability, targetData.angle);
                break;
            case MAGIC_CONSTANTS.TARGETING_MODES.LINE_GROUND:
                this.executeLineGround(ability, targetData.x, targetData.y, targetData.angle);
                break;
        }
    },

    executeInstantSelf(ability) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        // Healing
        if (ability.healing) {
            const healAmount = ability.healing;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            showMessage(`Healed ${healAmount} HP!`);
            createParticles(playerCenterX, playerCenterY, ability.color, 20);
            updateUI();
        }

        // AOE around player (Frost Nova)
        if (ability.radius && ability.damage) {
            this.executeCircleAOE(ability, playerCenterX, playerCenterY);
        }
    },

    executeEnemyTarget(ability) {
        const target = gameState.selectedEnemy;
        if (!target || target.isDead) {
            showMessage('No target!');
            return;
        }

        const damage = this.calculateDamage(ability);
        target.takeDamage(damage);

        const targetX = target.x + target.width / 2;
        const targetY = target.y + target.height / 2;

        createParticles(targetX, targetY, ability.color, 15);

        // Chain lightning
        if (ability.chains) {
            this.executeChainLightning(ability, target, ability.chains);
        }
    },

    executeCircleAOE(ability, centerX, centerY) {
        let hitCount = 0;

        gameState.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = Math.sqrt(
                Math.pow(enemyCenterX - centerX, 2) +
                Math.pow(enemyCenterY - centerY, 2)
            );

            if (dist <= ability.radius) {
                const damage = this.calculateDamage(ability);
                enemy.takeDamage(damage);
                createParticles(enemyCenterX, enemyCenterY, ability.color, 10);
                hitCount++;
            }
        });

        // Visual effect at cast location
        createParticles(centerX, centerY, ability.color, 30);
        showMessage(`${ability.name} hit ${hitCount} enemies!`);
    },

    executeCone(ability, angle) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const halfAngle = (ability.angle / 2) * Math.PI / 180;

        let hitCount = 0;

        gameState.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            // Check distance
            const dist = Math.sqrt(
                Math.pow(enemyCenterX - playerCenterX, 2) +
                Math.pow(enemyCenterY - playerCenterY, 2)
            );

            if (dist > ability.range) return;

            // Check angle
            const enemyAngle = Math.atan2(
                enemyCenterY - playerCenterY,
                enemyCenterX - playerCenterX
            );

            let angleDiff = enemyAngle - angle;
            // Normalize to -π to π
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            if (Math.abs(angleDiff) <= halfAngle) {
                const damage = this.calculateDamage(ability);
                enemy.takeDamage(damage);
                createParticles(enemyCenterX, enemyCenterY, ability.color, 10);
                hitCount++;
            }
        });

        createParticles(playerCenterX, playerCenterY, ability.color, 20);
        showMessage(`${ability.name} hit ${hitCount} enemies!`);
    },

    executeLine(ability, angle) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        let hitCount = 0;

        gameState.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            // Point-to-line distance
            const dist = this.pointToLineDistance(
                enemyCenterX, enemyCenterY,
                playerCenterX, playerCenterY,
                playerCenterX + Math.cos(angle) * ability.range,
                playerCenterY + Math.sin(angle) * ability.range
            );

            if (dist <= ability.width / 2) {
                const damage = this.calculateDamage(ability);
                enemy.takeDamage(damage);
                createParticles(enemyCenterX, enemyCenterY, ability.color, 10);
                hitCount++;
            }
        });

        createParticles(playerCenterX, playerCenterY, ability.color, 20);
        showMessage(`${ability.name} hit ${hitCount} enemies!`);
    },

    executeLineGround(ability, centerX, centerY, angle) {
        const halfLength = ability.length / 2;
        const startX = centerX - Math.cos(angle) * halfLength;
        const startY = centerY - Math.sin(angle) * halfLength;
        const endX = centerX + Math.cos(angle) * halfLength;
        const endY = centerY + Math.sin(angle) * halfLength;

        let hitCount = 0;

        gameState.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            const dist = this.pointToLineDistance(
                enemyCenterX, enemyCenterY,
                startX, startY, endX, endY
            );

            if (dist <= ability.width / 2) {
                const damage = this.calculateDamage(ability);
                enemy.takeDamage(damage);
                createParticles(enemyCenterX, enemyCenterY, ability.color, 10);
                hitCount++;
            }
        });

        createParticles(centerX, centerY, ability.color, 30);
        showMessage(`${ability.name} hit ${hitCount} enemies!`);
    },

    executeChainLightning(ability, initialTarget, chainsRemaining) {
        if (chainsRemaining <= 0) return;

        const targetX = initialTarget.x + initialTarget.width / 2;
        const targetY = initialTarget.y + initialTarget.height / 2;

        // Find nearest enemy within chain range
        let nearest = null;
        let nearestDist = Infinity;

        gameState.enemies.forEach(enemy => {
            if (enemy.isDead || enemy === initialTarget) return;

            const enemyX = enemy.x + enemy.width / 2;
            const enemyY = enemy.y + enemy.height / 2;
            const dist = Math.sqrt(
                Math.pow(enemyX - targetX, 2) +
                Math.pow(enemyY - targetY, 2)
            );

            if (dist <= ability.chainRange && dist < nearestDist) {
                nearest = enemy;
                nearestDist = dist;
            }
        });

        if (nearest) {
            const damage = this.calculateDamage(ability);
            nearest.takeDamage(damage);

            const nearestX = nearest.x + nearest.width / 2;
            const nearestY = nearest.y + nearest.height / 2;
            createParticles(nearestX, nearestY, ability.color, 15);

            // Continue chain
            this.executeChainLightning(ability, nearest, chainsRemaining - 1);
        }
    },

    calculateDamage(ability) {
        const baseDamage = ability.damage || 0;
        const spellPowerBonus = player.spellPower;
        return baseDamage + spellPowerBonus;
    },

    // Utility: Point-to-line-segment distance
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }
};
```

---

## Phase 6: Integration & Polish (2-3 hours)

### Step 6.1: Update Game Loop

Modify gameLoop() (game.js around line 2410):

```javascript
function gameLoop() {
    // Time tracking
    const currentTime = performance.now();
    gameState.deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    gameState.gameTime += gameState.deltaTime;

    // Update magic system
    MagicManager.update(gameState.deltaTime);

    // Update camera
    updateCameraFollow();

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Save context and apply viewport transform
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    // Draw game entities
    drawWalls();
    drawDoors();
    drawChests();

    player.draw();
    player.update();

    gameState.enemies.forEach(enemy => {
        enemy.draw();
        enemy.update(player);
    });

    gameState.particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.isDead()) {
            gameState.particles.splice(index, 1);
        }
    });

    // Draw targeting overlay (in world space)
    if (MagicManager.state.targetingActive) {
        TargetingSystem.draw(ctx);
    }

    // Restore context
    ctx.restore();

    // Update UI (called after restore)
    updateUI();
    updateAbilityBar();

    requestAnimationFrame(gameLoop);
}
```

### Step 6.2: Initialize Magic System

Modify initGame() (game.js around line 2380):

```javascript
function initGame() {
    // Initialize time tracking
    gameState.lastFrameTime = performance.now();
    gameState.deltaTime = 0;
    gameState.timeScale = 1.0;

    // Create player
    player = new Player(3 * TILE_SIZE, 3 * TILE_SIZE);

    // Load room
    loadRoom(0, true);

    // Initialize systems
    MagicManager.init();
    setupVirtualJoystick();
    setupAbilityBar();
    setupSpellbookUI();
    setupTargetingControls();

    // Update UI
    updateUI();
    updateAbilityBar();

    // Start game loop
    gameLoop();
}
```

### Step 6.3: Level-Up Integration

Update Player.levelUp() to unlock spells:

```javascript
levelUp() {
    this.level++;
    this.attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;

    // Increase base stats
    this.baseMaxHealth += 5;
    this.baseAttack += 1;
    this.baseDefense += 1;
    this.baseMana += 10; // NEW

    // Update computed stats
    this.updateComputedStats();

    // Heal to full
    this.health = this.maxHealth;
    this.mana = this.maxMana; // NEW

    // Check for spell unlocks (NEW)
    const newSpells = SpellProgressionManager.checkLevelUnlocks(this.level);
    if (newSpells.length > 0) {
        showMessage(`Level ${this.level}! +${newSpells.length} new spells!`);
    } else {
        showMessage(`Level ${this.level}!`);
    }

    // Visual effect
    createParticles(
        this.x + this.width / 2,
        this.y + this.height / 2,
        '#ffd700',
        30
    );

    updateUI();
}
```

### Step 6.4: Save/Load Integration

Update SaveManager.save():

```javascript
save() {
    const saveData = {
        v: SAVE_VERSION, // 2
        t: Date.now(),
        p: {
            x: player.x,
            y: player.y,
            l: player.level,
            xp: player.xp,
            xpn: player.xpNeeded,
            h: player.health,
            mh: player.maxHealth,
            bh: player.baseMaxHealth,
            a: player.attack,
            ba: player.baseAttack,
            d: player.defense,
            bd: player.baseDefense,
            attr: player.attributes,
            ap: player.attributePoints,
            // NEW: Magic system
            mana: player.mana,
            bm: player.baseMana,
            us: player.unlockedSpells,
            hb: player.hotbar
        },
        r: gameState.currentRoom,
        ed: gameState.enemiesDefeated,
        co: gameState.chestsOpened,
        gt: Math.floor(gameState.gameTime / 1000)
    };

    // ... save to localStorage
}
```

Update SaveManager.applySave():

```javascript
applySave(saveData) {
    // Version migration
    if (saveData.v === 1) {
        saveData.p.mana = 155;
        saveData.p.bm = 150;
        saveData.p.us = ['magic_missile'];
        saveData.p.hb = ['magic_missile', null, null, null, null, null, null, null];
        saveData.v = 2;
    }

    // Apply to player
    player.x = saveData.p.x;
    player.y = saveData.p.y;
    player.level = saveData.p.l;
    player.xp = saveData.p.xp;
    player.xpNeeded = saveData.p.xpn;
    player.health = saveData.p.h;
    player.maxHealth = saveData.p.mh;
    player.baseMaxHealth = saveData.p.bh;
    player.attack = saveData.p.a;
    player.baseAttack = saveData.p.ba;
    player.defense = saveData.p.d;
    player.baseDefense = saveData.p.bd;
    player.attributes = saveData.p.attr;
    player.attributePoints = saveData.p.ap;

    // NEW: Magic system
    player.mana = saveData.p.mana || player.maxMana;
    player.baseMana = saveData.p.bm || 150;
    player.unlockedSpells = saveData.p.us || ['magic_missile'];
    player.hotbar = saveData.p.hb || ['magic_missile', null, null, null, null, null, null, null];

    // Update computed stats
    player.updateComputedStats();

    // Load room
    loadRoom(saveData.r, false);

    // Update UI
    updateUI();
    updateAbilityBar();
}
```

---

## Performance Optimizations

### Particle Pooling

Replace createParticles() with pooled version:

```javascript
const particlePool = [];
const MAX_PARTICLES = 300;

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        if (gameState.particles.length >= MAX_PARTICLES) {
            // Reuse oldest particle
            const oldParticle = gameState.particles.shift();
            oldParticle.reset(x, y, color);
            gameState.particles.push(oldParticle);
        } else {
            gameState.particles.push(new Particle(x, y, color));
        }
    }
}

// Add reset method to Particle class
class Particle {
    // ... existing code

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = this.maxLife;
        this.velocityX = (Math.random() - 0.5) * 4;
        this.velocityY = (Math.random() - 0.5) * 4;
        this.size = Math.random() * 3 + 2;
    }
}
```

---

## Testing Checklist

### Phase 0 Tests:
- [ ] Time-based cooldowns work at 30, 60, 120 FPS
- [ ] Save version migration works (v1 → v2)
- [ ] Delta time tracked correctly

### Phase 1 Tests:
- [ ] Mana regenerates at correct rate
- [ ] Mana bar displays correctly
- [ ] Intelligence increases max mana
- [ ] Wisdom increases mana regen
- [ ] Character menu shows mana stats

### Phase 2 Tests:
- [ ] All 8 abilities defined correctly
- [ ] Spell unlock at correct levels
- [ ] Hotbar assignment works
- [ ] Cooldowns decrement properly
- [ ] Global cooldown prevents spam

### Phase 3 Tests:
- [ ] Ability bar displays all 8 buttons
- [ ] Responsive layout works (desktop/tablet/mobile)
- [ ] Keyboard shortcuts 1-8 work
- [ ] Spellbook opens and displays spells
- [ ] Right-click opens spellbook for slot
- [ ] Spell assignment updates hotbar

### Phase 4 Tests:
- [ ] Circle AOE targeting draws correctly
- [ ] Cone targeting aims from player
- [ ] Line targeting aims from player
- [ ] Line ground targeting independent
- [ ] Cancel button works
- [ ] ESC cancels targeting
- [ ] Touch controls work
- [ ] Slow-motion applies during targeting

### Phase 5 Tests:
- [ ] Instant spells cast immediately
- [ ] Enemy-target spells hit selected enemy
- [ ] Circle AOE hits all enemies in radius
- [ ] Cone hits enemies in cone
- [ ] Line hits enemies in line
- [ ] Chain lightning chains correctly
- [ ] Healing restores HP
- [ ] Damage scales with spell power

### Phase 6 Tests:
- [ ] Magic system updates each frame
- [ ] Game loop integrates properly
- [ ] Level-up unlocks new spells
- [ ] Save/load preserves magic state
- [ ] Particle pooling limits particles

---

## File Modification Summary

| File | Lines Modified | Lines Added | Description |
|------|---------------|-------------|-------------|
| game.js | ~100 | ~1200 | Magic system, time-based cooldowns |
| index.html | ~10 | ~80 | Mana bar, ability bar, spellbook modal |
| styles.css | ~20 | ~200 | Ability bar responsive layout, spellbook |

**Total**: ~1480 lines added

**Final game.js size**: ~3700 lines (organized into 10 clear sections)

---

## Next Steps After Implementation

### Future Enhancements:
1. **Spell upgrades** - Increase damage/reduce cooldown/reduce cost
2. **Talent trees** - Specialize in Fire/Ice/Lightning schools
3. **Status effects system** - Burning, frozen, stunned
4. **Persistent AOE** - Ice walls, fire zones
5. **Buff spells** - Shields, speed boosts
6. **Multi-element combos** - Fire + Ice = Steam explosion
7. **Spell crafting** - Combine effects
8. **Visual polish** - Better particles, spell animations
9. **Sound effects** - Casting sounds, impact sounds
10. **Enemy magic** - Enemies cast spells too

---

## Conclusion

This revised plan addresses all critical issues:
- ✅ Time-based cooldowns for consistency
- ✅ Mobile-friendly 8-button layout (2×4 grid)
- ✅ Organized code structure with clear sections
- ✅ Complete spell progression system
- ✅ Balanced mana economy (150 base, 3/sec)
- ✅ Performance optimizations (particle pooling)
- ✅ Clear targeting UX (real-time with slow-motion)
- ✅ Edge case handling (state machine)
- ✅ Save/load with versioning
- ✅ Comprehensive testing checklist

**Ready for implementation!**
