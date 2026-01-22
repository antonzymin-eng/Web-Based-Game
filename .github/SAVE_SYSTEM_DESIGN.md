# Save System Design

> **Status:** Design Phase
> **Branch:** `claude/plan-character-attributes-bUuKD`
> **Created:** 2026-01-22
> **Priority:** Foundation - Required before attributes system

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Requirements](#requirements)
4. [Architecture Options](#architecture-options)
5. [Recommended Architecture](#recommended-architecture)
6. [Data Structure](#data-structure)
7. [Implementation Strategy](#implementation-strategy)
8. [Save Triggers](#save-triggers)
9. [Load Strategy](#load-strategy)
10. [UI/UX Design](#uiux-design)
11. [Validation & Error Handling](#validation--error-handling)
12. [Migration Strategy](#migration-strategy)
13. [Testing Plan](#testing-plan)
14. [Implementation Phases](#implementation-phases)

---

## Executive Summary

**Purpose:** Implement persistent game state to preserve player progress across sessions.

**Key Decisions:**
- **Storage:** LocalStorage for MVP (simple, sufficient for current scale)
- **Save Type:** Auto-save on key events + manual save option
- **Slots:** Single slot for MVP, expandable to 3 slots
- **Versioning:** Semantic versioning with migration support
- **Scope:** Player stats, room progress, chest states, enemies defeated

**Implementation Time:** 4-6 hours
**Complexity:** Low-Medium
**Risk:** Low

---

## Current State Analysis

### What Currently Persists
**Nothing.** Game state is lost on page refresh.

### What Needs to Persist

#### Player State (game.js:133-162)
```javascript
// Essential data
- x, y                    // Position
- level                   // Level
- xp, xpNeeded           // Experience
- health, maxHealth      // Health
- attack, defense        // Combat stats

// Optional (can be recalculated)
- speed                  // Constant
- direction              // Not critical
- attackCooldown         // Temporary state
```

#### Game Progress (game.js:24-39)
```javascript
- currentRoom            // Which room player is in
- enemiesDefeated        // Total kills
- chestsOpened           // Total chests opened (not currently used)
- gameTime               // Total playtime (optional)
```

#### Room State (Currently Not Tracked)
```javascript
// Per-room persistence needed:
- Chest opened states    // Which chests were opened
- Enemy defeated states  // Which enemies were killed
```

**Current Problem:**
- `gameState.rooms = []` exists but is unused
- Room state resets when re-entering rooms
- Chests can be opened multiple times
- Enemies respawn when leaving/re-entering

---

## Requirements

### Functional Requirements

#### Must Have (MVP)
1. **Save player stats** (level, XP, health, position, attack, defense)
2. **Save current room** index
3. **Save room state** (chests opened, enemies defeated per room)
4. **Auto-save** on key events (level up, room change, chest open)
5. **Auto-load** on game start
6. **Validation** to prevent corrupted saves
7. **Version** save data for future compatibility

#### Should Have (Phase 2)
8. **Manual save button** in character menu
9. **Save indicator** (visual feedback)
10. **Multiple save slots** (3 slots)
11. **Save metadata** (timestamp, playtime, location)
12. **Delete save** functionality

#### Could Have (Future)
13. **Cloud save** (account-based)
14. **Export/import** save data
15. **Save encryption** (prevent cheating)
16. **Backup saves** (restore from backup)
17. **Save compression** (reduce storage)

### Non-Functional Requirements

#### Performance
- Save operation: <10ms
- Load operation: <50ms
- No noticeable lag during auto-save

#### Storage
- Target: <50KB per save (text-based, easily achievable)
- LocalStorage limit: 5-10MB (plenty of headroom)

#### Reliability
- Graceful degradation if storage unavailable
- Corruption detection and recovery
- Clear error messages to player

#### Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browser support (iOS Safari, Chrome Mobile)
- Private browsing mode handling (may fail, provide fallback)

---

## Architecture Options

### Option 1: LocalStorage (Recommended for MVP)

**Description:** Browser's localStorage API for key-value string storage

**Pros:**
- ✅ Simple API: `localStorage.setItem()`, `localStorage.getItem()`
- ✅ Synchronous (no async complexity)
- ✅ Persistent across sessions
- ✅ Wide browser support
- ✅ 5-10MB storage (more than enough)
- ✅ No dependencies

**Cons:**
- ❌ Synchronous blocks main thread (mitigated: data is small)
- ❌ String-only storage (must serialize/deserialize JSON)
- ❌ Can fail in private browsing
- ❌ No transactions (not needed for our use case)
- ❌ No indexing/querying (not needed)

**Best For:**
- Current game scale (1-3 save slots, small data)
- Quick implementation
- MVP/Phase 1

**Example:**
```javascript
// Save
localStorage.setItem('dungeon-crawler-save', JSON.stringify(saveData));

// Load
const saveData = JSON.parse(localStorage.getItem('dungeon-crawler-save'));
```

---

### Option 2: IndexedDB

**Description:** Browser's indexed database API for structured storage

**Pros:**
- ✅ Asynchronous (doesn't block main thread)
- ✅ Large storage capacity (gigabytes)
- ✅ Supports transactions
- ✅ Can store objects, blobs, files
- ✅ Indexed queries

**Cons:**
- ❌ Complex API (requires wrapper or library)
- ❌ Asynchronous adds complexity
- ❌ Overkill for current needs
- ❌ Steeper learning curve
- ❌ More code to maintain

**Best For:**
- Large games with complex data structures
- Offline-first applications
- When you need queries or transactions
- Future (if game grows significantly)

---

### Option 3: SessionStorage

**Description:** Like localStorage but only persists for session

**Pros:**
- ✅ Simple API
- ✅ Automatic cleanup

**Cons:**
- ❌ Lost when tab closes (not suitable for save system)

**Best For:**
- Temporary data (not persistent saves)

---

### Option 4: Cookies

**Description:** Traditional HTTP cookies

**Cons:**
- ❌ 4KB limit (too small)
- ❌ Sent with every HTTP request (overhead)
- ❌ Not recommended for modern apps

**Best For:**
- Legacy browser support (not needed)

---

### Option 5: Cloud Storage (Backend)

**Description:** Save to server via API (e.g., Firebase, custom backend)

**Pros:**
- ✅ Cross-device sync
- ✅ Backup/recovery
- ✅ Anti-cheat (server validation)
- ✅ Leaderboards
- ✅ Unlimited storage

**Cons:**
- ❌ Requires backend infrastructure
- ❌ Network dependency
- ❌ Authentication system needed
- ❌ Costs (hosting, database)
- ❌ Complexity (APIs, security)

**Best For:**
- Multiplayer games
- Games with leaderboards
- Commercial games
- Future enhancement (Phase 3+)

---

## Recommended Architecture

### Phase 1 (MVP): LocalStorage

**Why:**
- Simple implementation (4-6 hours)
- Sufficient for current needs
- No dependencies
- Low risk
- Can migrate to IndexedDB later if needed

### Storage Strategy

```javascript
// Single save slot for MVP
localStorage.setItem('dungeon-crawler-save-v1', JSON.stringify(saveData));

// Multiple slots (Phase 2)
localStorage.setItem('dungeon-crawler-save-slot-1', JSON.stringify(saveData));
localStorage.setItem('dungeon-crawler-save-slot-2', JSON.stringify(saveData));
localStorage.setItem('dungeon-crawler-save-slot-3', JSON.stringify(saveData));

// Metadata
localStorage.setItem('dungeon-crawler-settings', JSON.stringify(settings));
```

### Key Pattern: "dungeon-crawler-*"
- Prevents conflicts with other sites
- Easy to clear all game data
- Organized namespace

---

## Data Structure

### Save Data Schema v1.0

```javascript
const saveData = {
    // Metadata
    version: "1.0.0",           // Save format version
    timestamp: 1705968000000,   // Unix timestamp (ms)
    playtime: 1234,             // Seconds played

    // Player State
    player: {
        // Position
        x: 120,
        y: 120,

        // Stats
        level: 5,
        xp: 250,
        xpNeeded: 150,
        maxHealth: 100,
        health: 85,
        attack: 10,
        defense: 5,

        // Combat (optional - can reset on load)
        attackCooldown: 0,
        invulnerable: false,
        invulnerableTimer: 0
    },

    // World State
    world: {
        currentRoom: 1,
        enemiesDefeated: 12,    // Total
        chestsOpened: 3,        // Total (not currently tracked properly)

        // Room-specific state
        rooms: [
            {
                index: 0,
                visited: true,
                chestsOpened: [0],      // Indices of opened chests
                enemiesDefeated: [0, 1] // Indices of defeated enemies
            },
            {
                index: 1,
                visited: true,
                chestsOpened: [],
                enemiesDefeated: [0]
            },
            {
                index: 2,
                visited: false,
                chestsOpened: [],
                enemiesDefeated: []
            }
        ]
    },

    // Future: Attributes (when implemented)
    attributes: {
        strength: 10,
        vitality: 10,
        dexterity: 10,
        attributePoints: 0
    },

    // Future: Equipment (when implemented)
    equipment: {
        weapon: null,
        armor: null,
        accessory: null
    },

    // Future: Inventory (when implemented)
    inventory: []
};
```

### Size Estimation
```
Player data: ~200 bytes
World state: ~300 bytes
Attributes: ~100 bytes
Equipment: ~200 bytes
Inventory: ~500 bytes (if 20 items)
---
Total: ~1.3 KB (well within 50KB target)
```

### Validation Schema

```javascript
const SAVE_SCHEMA = {
    version: { type: 'string', required: true, pattern: /^\d+\.\d+\.\d+$/ },
    timestamp: { type: 'number', required: true, min: 1640000000000 },
    playtime: { type: 'number', required: false, min: 0 },

    player: {
        x: { type: 'number', required: true, min: 0, max: 10000 },
        y: { type: 'number', required: true, min: 0, max: 10000 },
        level: { type: 'number', required: true, min: 1, max: 100 },
        xp: { type: 'number', required: true, min: 0 },
        xpNeeded: { type: 'number', required: true, min: 0 },
        maxHealth: { type: 'number', required: true, min: 1, max: 10000 },
        health: { type: 'number', required: true, min: 0, max: 10000 },
        attack: { type: 'number', required: true, min: 0, max: 1000 },
        defense: { type: 'number', required: true, min: 0, max: 1000 }
    },

    world: {
        currentRoom: { type: 'number', required: true, min: 0, max: 2 },
        enemiesDefeated: { type: 'number', required: true, min: 0 },
        chestsOpened: { type: 'number', required: false, min: 0 },
        rooms: { type: 'array', required: true }
    }
};
```

---

## Implementation Strategy

### SaveManager Class

```javascript
class SaveManager {
    constructor() {
        this.SAVE_KEY = 'dungeon-crawler-save-v1';
        this.currentVersion = '1.0.0';
        this.isAvailable = this.checkStorageAvailable();
    }

    // Check if localStorage is available
    checkStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }

    // Save game state
    save(player, gameState) {
        if (!this.isAvailable) {
            console.error('Save failed: localStorage not available');
            return { success: false, error: 'Storage not available' };
        }

        try {
            const saveData = this.serializeSaveData(player, gameState);
            const validation = this.validateSaveData(saveData);

            if (!validation.valid) {
                console.error('Save validation failed:', validation.errors);
                return { success: false, error: 'Invalid save data' };
            }

            const json = JSON.stringify(saveData);
            localStorage.setItem(this.SAVE_KEY, json);

            console.log('Game saved successfully');
            return { success: true, size: json.length };
        } catch (e) {
            console.error('Save failed:', e);
            return { success: false, error: e.message };
        }
    }

    // Load game state
    load() {
        if (!this.isAvailable) {
            return { success: false, error: 'Storage not available' };
        }

        try {
            const json = localStorage.getItem(this.SAVE_KEY);

            if (!json) {
                console.log('No save data found');
                return { success: false, error: 'No save found', noSave: true };
            }

            const saveData = JSON.parse(json);
            const validation = this.validateSaveData(saveData);

            if (!validation.valid) {
                console.error('Save corrupted:', validation.errors);
                return { success: false, error: 'Save corrupted' };
            }

            // Version migration if needed
            const migratedData = this.migrate(saveData);

            console.log('Game loaded successfully');
            return { success: true, data: migratedData };
        } catch (e) {
            console.error('Load failed:', e);
            return { success: false, error: e.message };
        }
    }

    // Delete save
    deleteSave() {
        if (!this.isAvailable) return false;

        try {
            localStorage.removeItem(this.SAVE_KEY);
            console.log('Save deleted');
            return true;
        } catch (e) {
            console.error('Delete failed:', e);
            return false;
        }
    }

    // Check if save exists
    hasSave() {
        if (!this.isAvailable) return false;
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    // Get save metadata without loading full save
    getSaveMetadata() {
        if (!this.hasSave()) return null;

        try {
            const json = localStorage.getItem(this.SAVE_KEY);
            const saveData = JSON.parse(json);

            return {
                version: saveData.version,
                timestamp: saveData.timestamp,
                playtime: saveData.playtime,
                level: saveData.player?.level,
                currentRoom: saveData.world?.currentRoom
            };
        } catch (e) {
            console.error('Failed to read metadata:', e);
            return null;
        }
    }

    // Serialize game state to save format
    serializeSaveData(player, gameState) {
        return {
            version: this.currentVersion,
            timestamp: Date.now(),
            playtime: Math.floor(gameState.gameTime / 60), // Convert frames to seconds

            player: {
                x: player.x,
                y: player.y,
                level: player.level,
                xp: player.xp,
                xpNeeded: player.xpNeeded,
                maxHealth: player.maxHealth,
                health: player.health,
                attack: player.attack,
                defense: player.defense
            },

            world: {
                currentRoom: gameState.currentRoom,
                enemiesDefeated: gameState.enemiesDefeated,
                chestsOpened: gameState.chestsOpened,
                rooms: this.serializeRoomStates(gameState)
            }
        };
    }

    // Serialize room states
    serializeRoomStates(gameState) {
        // For now, use gameState.rooms if it exists, otherwise reconstruct
        const rooms = [];

        for (let i = 0; i < roomTemplates.length; i++) {
            rooms.push({
                index: i,
                visited: i === gameState.currentRoom, // Basic implementation
                chestsOpened: [], // TODO: Track per-room chest states
                enemiesDefeated: [] // TODO: Track per-room enemy defeats
            });
        }

        return rooms;
    }

    // Deserialize save data and apply to game
    deserialize(saveData, player, gameState) {
        // Apply player state
        player.x = saveData.player.x;
        player.y = saveData.player.y;
        player.level = saveData.player.level;
        player.xp = saveData.player.xp;
        player.xpNeeded = saveData.player.xpNeeded;
        player.maxHealth = saveData.player.maxHealth;
        player.health = saveData.player.health;
        player.attack = saveData.player.attack;
        player.defense = saveData.player.defense;

        // Reset temporary combat state
        player.attackCooldown = 0;
        player.invulnerable = false;
        player.invulnerableTimer = 0;
        player.isAttacking = false;

        // Apply world state
        gameState.enemiesDefeated = saveData.world.enemiesDefeated;
        gameState.chestsOpened = saveData.world.chestsOpened || 0;
        gameState.gameTime = (saveData.playtime || 0) * 60; // Convert back to frames

        // Load current room
        loadRoom(saveData.world.currentRoom);

        // Apply room-specific states (if implemented)
        if (saveData.world.rooms) {
            this.applyRoomStates(saveData.world.rooms, gameState);
        }

        // Update UI
        updateUI();
    }

    // Apply room-specific states
    applyRoomStates(roomStates, gameState) {
        // Store room states for later use
        gameState.rooms = roomStates;

        // Apply current room state
        const currentRoomState = roomStates[gameState.currentRoom];

        if (currentRoomState) {
            // Mark chests as opened
            currentRoomState.chestsOpened.forEach(chestIndex => {
                if (gameState.chests[chestIndex]) {
                    gameState.chests[chestIndex].opened = true;
                }
            });

            // Remove defeated enemies
            currentRoomState.enemiesDefeated.forEach(enemyIndex => {
                if (gameState.enemies[enemyIndex]) {
                    gameState.enemies[enemyIndex].isDead = true;
                }
            });
        }
    }

    // Validate save data structure
    validateSaveData(data) {
        const errors = [];

        // Check required fields
        if (!data.version) errors.push('Missing version');
        if (!data.timestamp) errors.push('Missing timestamp');
        if (!data.player) errors.push('Missing player data');
        if (!data.world) errors.push('Missing world data');

        // Validate player data
        if (data.player) {
            if (typeof data.player.level !== 'number') errors.push('Invalid player level');
            if (data.player.level < 1 || data.player.level > 100) errors.push('Player level out of range');
            if (typeof data.player.health !== 'number') errors.push('Invalid player health');
            if (data.player.health < 0) errors.push('Player health cannot be negative');
        }

        // Validate world data
        if (data.world) {
            if (typeof data.world.currentRoom !== 'number') errors.push('Invalid current room');
            if (data.world.currentRoom < 0 || data.world.currentRoom >= roomTemplates.length) {
                errors.push('Current room out of range');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Migrate old save formats to current version
    migrate(saveData) {
        const saveVersion = saveData.version || '0.0.0';

        // No migrations needed yet (first version)
        if (saveVersion === '1.0.0') {
            return saveData;
        }

        // Future migrations would go here
        // Example:
        // if (saveVersion === '1.0.0' && this.currentVersion === '1.1.0') {
        //     saveData = this.migrateFrom1_0_to1_1(saveData);
        // }

        return saveData;
    }
}

// Global instance
const saveManager = new SaveManager();
```

---

## Save Triggers

### Auto-Save Events

**When to auto-save:**

1. **Level Up** (high priority)
   - Player progress milestone
   - Trigger: `player.levelUp()` method

2. **Room Change** (high priority)
   - Preserve exploration progress
   - Trigger: `loadRoom()` function

3. **Chest Opened** (medium priority)
   - Prevent re-looting
   - Trigger: `player.checkChestCollision()` after opening

4. **Enemy Defeated** (optional)
   - Could be expensive if auto-saving after each kill
   - Alternative: Save on room change instead

5. **Periodic Auto-Save** (optional)
   - Every 2-5 minutes
   - Fallback to catch edge cases

**Implementation:**
```javascript
// In player.levelUp()
levelUp() {
    this.level++;
    // ... stat increases ...

    // Auto-save after level up
    saveManager.save(player, gameState);
    showMessage('Level up! Game saved.');
}

// In loadRoom()
function loadRoom(roomIndex) {
    // ... room loading logic ...

    // Auto-save after room change
    saveManager.save(player, gameState);
}

// In player.checkChestCollision()
if (!chest.opened) {
    chest.opened = true;
    // ... give rewards ...

    // Auto-save after opening chest
    saveManager.save(player, gameState);
}
```

### Manual Save

**When to allow:**
- Via button in character menu
- Via keyboard shortcut (Ctrl+S / Cmd+S)

**Implementation:**
```javascript
// Manual save button
document.getElementById('btn-save-game').addEventListener('click', () => {
    const result = saveManager.save(player, gameState);

    if (result.success) {
        showMessage('Game saved successfully!');
    } else {
        showMessage(`Save failed: ${result.error}`);
    }
});

// Keyboard shortcut
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        saveManager.save(player, gameState);
        showMessage('Game saved!');
    }
});
```

---

## Load Strategy

### When to Load

**1. Game Initialization** (primary)
```javascript
function initGame() {
    // Try to load save
    const result = saveManager.load();

    if (result.success) {
        saveManager.deserialize(result.data, player, gameState);
        showMessage('Game loaded! Welcome back.');
    } else if (result.noSave) {
        // New game
        loadRoom(0);
        showMessage('Welcome to Dungeon Crawler!');
    } else {
        // Corrupted save
        showMessage(`Load failed: ${result.error}. Starting new game.`);
        loadRoom(0);
    }

    // Start game loop
    gameLoop();
}
```

**2. Manual Load** (optional)
- From main menu
- From save slot selection screen

### Continue vs New Game

**Option A: Auto-load (Simple)**
- Always load save if exists
- No "New Game" button needed
- Start fresh by deleting save

**Option B: Main Menu (Traditional)**
- Show menu with "Continue" and "New Game" options
- Requires menu screen implementation
- Better UX for multiple playthroughs

**Recommendation:** Option A for MVP (simpler)
- Can add proper menu in Phase 2

---

## UI/UX Design

### Save Indicator

**Visual Feedback:**
```html
<!-- Save indicator in top HUD -->
<div class="save-indicator" id="save-indicator">
    💾 Saved
</div>
```

```css
.save-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 200, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
}

.save-indicator.visible {
    opacity: 1;
}
```

```javascript
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('visible');

    setTimeout(() => {
        indicator.classList.remove('visible');
    }, 2000);
}
```

### Character Menu Integration

```html
<!-- Add to character menu -->
<div class="char-menu-footer">
    <button id="btn-save-game" class="menu-btn">
        💾 Save Game
    </button>
    <button id="btn-delete-save" class="menu-btn menu-btn-danger">
        🗑️ Delete Save
    </button>
</div>
```

### Save Confirmation

**For delete action:**
```javascript
document.getElementById('btn-delete-save').addEventListener('click', () => {
    if (confirm('Delete save data? This cannot be undone!')) {
        saveManager.deleteSave();
        showMessage('Save deleted. Restarting game...');
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
});
```

---

## Validation & Error Handling

### Error Types

#### 1. Storage Not Available
**Cause:** Private browsing, quota exceeded, browser settings
**Handling:**
```javascript
if (!saveManager.isAvailable) {
    showMessage('⚠️ Saves disabled: localStorage unavailable');
    // Continue game without saves
}
```

#### 2. Quota Exceeded
**Cause:** LocalStorage full (rare - 5-10MB limit)
**Handling:**
```javascript
try {
    localStorage.setItem(key, value);
} catch (e) {
    if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded');
        showMessage('⚠️ Save failed: Storage full');
        // Optionally: Clear old saves, compress data
    }
}
```

#### 3. Corrupted Save Data
**Cause:** Manual editing, version mismatch, incomplete save
**Handling:**
```javascript
const validation = validateSaveData(data);
if (!validation.valid) {
    console.error('Corrupted save:', validation.errors);

    // Option 1: Reject and start fresh
    showMessage('Save corrupted. Starting new game.');
    return startNewGame();

    // Option 2: Attempt recovery (advanced)
    const recovered = attemptRecovery(data);
    if (recovered) {
        return loadSave(recovered);
    }
}
```

#### 4. Version Mismatch
**Cause:** Loading old save in new game version
**Handling:**
```javascript
if (saveData.version !== currentVersion) {
    console.log(`Migrating save from ${saveData.version} to ${currentVersion}`);
    saveData = migrate(saveData);
}
```

### Validation Checklist

```javascript
function validateSaveData(data) {
    const checks = [
        // Structure
        () => data && typeof data === 'object',
        () => data.version && typeof data.version === 'string',
        () => data.player && typeof data.player === 'object',
        () => data.world && typeof data.world === 'object',

        // Player bounds
        () => data.player.level >= 1 && data.player.level <= 100,
        () => data.player.health >= 0 && data.player.health <= data.player.maxHealth,
        () => data.player.attack >= 0 && data.player.attack <= 1000,
        () => data.player.defense >= 0 && data.player.defense <= 1000,

        // World bounds
        () => data.world.currentRoom >= 0 && data.world.currentRoom < roomTemplates.length,
        () => data.world.enemiesDefeated >= 0,

        // Position bounds
        () => data.player.x >= 0 && data.player.x <= CANVAS_WIDTH,
        () => data.player.y >= 0 && data.player.y <= CANVAS_HEIGHT
    ];

    const errors = [];
    checks.forEach((check, i) => {
        try {
            if (!check()) {
                errors.push(`Check ${i} failed`);
            }
        } catch (e) {
            errors.push(`Check ${i} threw error: ${e.message}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
```

---

## Migration Strategy

### Version Numbering

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible changes (e.g., 1.0.0 → 2.0.0)
- **MINOR:** Backward-compatible additions (e.g., 1.0.0 → 1.1.0)
- **PATCH:** Bug fixes (e.g., 1.0.0 → 1.0.1)

### Migration Functions

```javascript
class SaveMigrator {
    // Migrate from 1.0.0 to 1.1.0 (example: added attributes)
    static migrateFrom1_0_to1_1(saveData) {
        console.log('Migrating save from 1.0.0 to 1.1.0');

        // Add new attributes field with defaults
        saveData.attributes = {
            strength: 10,
            vitality: 10,
            dexterity: 10,
            attributePoints: 0
        };

        saveData.version = '1.1.0';
        return saveData;
    }

    // Migrate from 1.1.0 to 2.0.0 (example: major restructure)
    static migrateFrom1_1_to2_0(saveData) {
        console.log('Migrating save from 1.1.0 to 2.0.0');

        // Major changes - restructure data
        const newSaveData = {
            version: '2.0.0',
            timestamp: saveData.timestamp,
            playtime: saveData.playtime,

            // Restructured player data
            character: {
                stats: {
                    ...saveData.player,
                    ...saveData.attributes
                },
                position: {
                    x: saveData.player.x,
                    y: saveData.player.y
                }
            },

            world: saveData.world
        };

        return newSaveData;
    }

    // Main migration router
    static migrate(saveData, targetVersion) {
        let currentData = saveData;
        const currentVersion = saveData.version;

        // Define migration path
        const migrations = {
            '1.0.0': { '1.1.0': this.migrateFrom1_0_to1_1 },
            '1.1.0': { '2.0.0': this.migrateFrom1_1_to2_0 }
        };

        // Walk migration path
        // (Simplified - real implementation would need graph traversal)

        return currentData;
    }
}
```

---

## Testing Plan

### Manual Testing Checklist

#### Save Functionality
- [ ] Save creates localStorage entry
- [ ] Save data is valid JSON
- [ ] Save includes all required fields
- [ ] Save size is reasonable (<50KB)
- [ ] Auto-save triggers on level up
- [ ] Auto-save triggers on room change
- [ ] Auto-save triggers on chest open
- [ ] Manual save button works
- [ ] Save indicator appears and fades

#### Load Functionality
- [ ] Load on game start works
- [ ] Player stats restored correctly
- [ ] Player position restored correctly
- [ ] Current room restored correctly
- [ ] Chest states preserved
- [ ] Enemy states preserved (if implemented)
- [ ] Message shows "Game loaded"

#### Error Handling
- [ ] No save → starts new game
- [ ] Corrupted save → starts new game with warning
- [ ] Private browsing → graceful degradation
- [ ] Manual save → shows success/error message

#### Edge Cases
- [ ] Save/load with level 1 player
- [ ] Save/load with level 100 player
- [ ] Save/load with 0 health (edge case)
- [ ] Save/load in each room (0, 1, 2)
- [ ] Save/load with all chests opened
- [ ] Save/load with no enemies defeated
- [ ] Multiple saves in quick succession
- [ ] Delete save → starts fresh

#### Cross-Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

### Automated Testing (Optional - Phase 2)

```javascript
// tests/saveManager.test.js
describe('SaveManager', () => {
    let saveManager;
    let mockPlayer;
    let mockGameState;

    beforeEach(() => {
        localStorage.clear();
        saveManager = new SaveManager();
        mockPlayer = createMockPlayer();
        mockGameState = createMockGameState();
    });

    test('should save game data', () => {
        const result = saveManager.save(mockPlayer, mockGameState);
        expect(result.success).toBe(true);
        expect(localStorage.getItem(saveManager.SAVE_KEY)).toBeTruthy();
    });

    test('should load saved game data', () => {
        saveManager.save(mockPlayer, mockGameState);
        const result = saveManager.load();
        expect(result.success).toBe(true);
        expect(result.data.player.level).toBe(mockPlayer.level);
    });

    test('should handle corrupted save data', () => {
        localStorage.setItem(saveManager.SAVE_KEY, 'invalid json');
        const result = saveManager.load();
        expect(result.success).toBe(false);
        expect(result.error).toContain('Load failed');
    });

    test('should validate save data structure', () => {
        const invalidData = { version: '1.0.0' }; // Missing player/world
        const validation = saveManager.validateSaveData(invalidData);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
    });
});
```

---

## Implementation Phases

### Phase 1: Core Save/Load (MVP) - 3-4 hours

**Goal:** Basic save/load functionality

**Tasks:**
- [ ] Create `SaveManager` class
- [ ] Implement `save()` method
- [ ] Implement `load()` method
- [ ] Implement `serializeSaveData()` method
- [ ] Implement `deserializeSaveData()` method
- [ ] Add auto-save on level up
- [ ] Add auto-save on room change
- [ ] Add auto-load on game start
- [ ] Basic validation
- [ ] Test save/load cycle

**Deliverable:** Game progress persists across sessions

---

### Phase 2: Room State Persistence - 2-3 hours

**Goal:** Track per-room state (chests, enemies)

**Tasks:**
- [ ] Modify chest system to track opened state per room
- [ ] Modify enemy system to track defeated state per room
- [ ] Update `serializeRoomStates()` to capture per-room data
- [ ] Update `applyRoomStates()` to restore per-room data
- [ ] Update `loadRoom()` to check room state
- [ ] Test chest persistence across rooms
- [ ] Test enemy persistence across rooms

**Deliverable:** Chests stay opened, enemies stay defeated

---

### Phase 3: UI & Polish - 1-2 hours

**Goal:** User-friendly save system

**Tasks:**
- [ ] Add save indicator to HUD
- [ ] Add manual save button to character menu
- [ ] Add delete save button with confirmation
- [ ] Add keyboard shortcut (Ctrl+S)
- [ ] Style save/delete buttons
- [ ] Add visual feedback animations
- [ ] Test on mobile (touch interactions)

**Deliverable:** Polished save UX

---

### Phase 4: Error Handling & Validation - 1-2 hours

**Goal:** Robust save system

**Tasks:**
- [ ] Implement comprehensive validation
- [ ] Add error handling for all edge cases
- [ ] Add localStorage availability check
- [ ] Add quota exceeded handling
- [ ] Add corrupted save recovery
- [ ] Test in private browsing mode
- [ ] Test with manually corrupted save
- [ ] Test with full localStorage

**Deliverable:** Bulletproof save system

---

### Phase 5: Testing & Documentation - 1 hour

**Goal:** Validated and documented

**Tasks:**
- [ ] Complete manual test checklist
- [ ] Test on all target browsers
- [ ] Test on mobile devices
- [ ] Document save data format
- [ ] Update player-facing documentation
- [ ] Create troubleshooting guide

**Deliverable:** Fully tested and documented

---

**Total Time: 8-12 hours** (revised from initial 4-6 hour estimate)

---

## Future Enhancements (Phase 3+)

### Multiple Save Slots

```javascript
class SaveManager {
    constructor(slotCount = 3) {
        this.slotCount = slotCount;
    }

    save(slotIndex, player, gameState) {
        const key = `dungeon-crawler-save-slot-${slotIndex}`;
        // ... save logic ...
    }

    load(slotIndex) {
        const key = `dungeon-crawler-save-slot-${slotIndex}`;
        // ... load logic ...
    }

    getAllSlots() {
        const slots = [];
        for (let i = 0; i < this.slotCount; i++) {
            slots.push(this.getSaveMetadata(i));
        }
        return slots;
    }
}
```

**UI for slot selection:**
```html
<div class="save-slots">
    <div class="save-slot">
        <h3>Slot 1</h3>
        <p>Level 5 | Room 2 | 15 min</p>
        <button>Load</button>
        <button>Delete</button>
    </div>
    <!-- More slots... -->
</div>
```

### Cloud Save (Backend Integration)

```javascript
class CloudSaveManager {
    async save(saveData) {
        const response = await fetch('/api/saves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify(saveData)
        });

        return response.json();
    }

    async load() {
        const response = await fetch('/api/saves/latest', {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });

        return response.json();
    }
}
```

### Export/Import

```javascript
// Export save as downloadable JSON
function exportSave() {
    const saveData = saveManager.load().data;
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dungeon-crawler-save-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// Import save from file
function importSave(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const json = e.target.result;
        const saveData = JSON.parse(json);

        // Validate and load
        const validation = saveManager.validateSaveData(saveData);
        if (validation.valid) {
            saveManager.deserialize(saveData, player, gameState);
            showMessage('Save imported successfully!');
        } else {
            showMessage('Invalid save file!');
        }
    };
    reader.readAsText(file);
}
```

### Save Compression

```javascript
// Using LZ-string library for compression
import LZString from 'lz-string';

function saveCompressed(data) {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(json);
    localStorage.setItem(key, compressed);
}

function loadCompressed() {
    const compressed = localStorage.getItem(key);
    const json = LZString.decompressFromUTF16(compressed);
    return JSON.parse(json);
}
```

---

## Risk Assessment

### Risks & Mitigation

#### 1. LocalStorage Unavailable
**Risk:** Private browsing, disabled localStorage
**Impact:** Medium - Save system unusable
**Mitigation:**
- Detect availability on init
- Show warning to user
- Game still playable (single session)
- Fallback to sessionStorage (temporary)

#### 2. Save Data Corruption
**Risk:** Manual editing, version bugs, incomplete saves
**Impact:** Medium - Player loses progress
**Mitigation:**
- Comprehensive validation
- Version checking
- Backup before overwriting (optional)
- Clear error messages

#### 3. Performance Impact
**Risk:** Auto-save causes lag
**Impact:** Low - Data is small
**Mitigation:**
- Profile save operation (<10ms target)
- Throttle auto-saves (max once per 5 seconds)
- Consider debouncing

#### 4. Browser Compatibility
**Risk:** Different browsers handle localStorage differently
**Impact:** Low - Well-supported API
**Mitigation:**
- Test on all major browsers
- Use standard API only (no vendor prefixes)
- Graceful degradation

#### 5. State Inconsistency
**Risk:** Save/load doesn't perfectly preserve state
**Impact:** Medium - Weird gameplay bugs
**Mitigation:**
- Comprehensive testing
- Validate loaded data
- Reset temporary/derived state
- Document what is/isn't saved

---

## Success Criteria

### Definition of Done

**Functional Requirements:**
- [ ] Player progress persists across sessions
- [ ] Save triggers automatically on key events
- [ ] Load works on game start
- [ ] Chest states persist
- [ ] Room states persist
- [ ] Manual save/delete works
- [ ] Error handling for all edge cases

**Quality Requirements:**
- [ ] Save operation <10ms
- [ ] Load operation <50ms
- [ ] No data corruption
- [ ] Works in all major browsers
- [ ] Mobile-friendly
- [ ] Clear user feedback

**Documentation Requirements:**
- [ ] Save data format documented
- [ ] API documented (SaveManager methods)
- [ ] Troubleshooting guide created
- [ ] Testing checklist completed

---

## Conclusion

This save system design provides:

1. **Simple Implementation:** LocalStorage for MVP
2. **Extensible Architecture:** Can add slots, cloud saves later
3. **Robust Validation:** Prevents corruption and cheating
4. **Clear Versioning:** Supports future migrations
5. **Good UX:** Auto-save with manual override

**Next Steps:**
1. Review this design
2. Begin Phase 1 implementation
3. Test thoroughly
4. Deploy with confidence

**Foundation for Attributes System:**
- Save system must be implemented BEFORE attributes
- Attributes data will slot into existing save structure
- No refactoring needed when attributes are added

---

**Document Version:** 1.0
**Status:** Ready for Implementation
**Estimated Time:** 8-12 hours total
**Priority:** High - Foundation system
