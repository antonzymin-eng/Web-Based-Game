# Character Attributes System - Implementation Plan

> **Status:** Planning Phase
> **Branch:** `claude/plan-character-attributes-bUuKD`
> **Created:** 2026-01-22

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Attribute Categories](#attribute-categories)
4. [Code Integration Strategy](#code-integration-strategy)
5. [Validation & Data Integrity](#validation--data-integrity)
6. [Testing Strategy](#testing-strategy)
7. [Refactoring Considerations](#refactoring-considerations)
8. [Implementation Phases](#implementation-phases)
9. [UI/UX Considerations](#uiux-considerations)

---

## Current State Analysis

### Existing Player Attributes
Located in `Player` class (game.js:133-162):

**Base Properties:**
- `x`, `y` - Position
- `width`, `height` - Dimensions (30x30)
- `speed` - Movement speed (3)
- `direction` - Facing direction (0-3)

**RPG Stats (game.js:143-149):**
- `level` - Current level (starts at 1)
- `xp` - Current experience points
- `xpNeeded` - XP required for next level
- `maxHealth` - Maximum health points (100, +20 per level)
- `health` - Current health points
- `attack` - Attack damage (10, +5 per level)
- `defense` - Defense rating (5, +2 per level)

**Combat Properties (game.js:152-156):**
- `isAttacking` - Attack state flag
- `attackCooldown` - Cooldown timer
- `attackRange` - Attack range (45)
- `invulnerable` - Invulnerability flag
- `invulnerableTimer` - Invulnerability duration

**Movement Properties (game.js:159-161):**
- `moving` - Movement state flag
- `targetX`, `targetY` - Target position for pathfinding

### Current Progression System
- **Level Up:** game.js:364-377
  - XP threshold multiplies by 1.5 per level
  - Fixed stat increases: +20 max HP, +5 attack, +2 defense
  - Full health restoration on level up
- **XP Gain:** game.js:353-362
  - Enemies: 25 XP (basic), 50 XP (strong)
  - Chests: Variable XP/gold
  - Auto-levels when XP threshold met

### UI Integration Points
- **Quick HUD** (index.html:16-27): Level, HP bar, HP text
- **Character Menu** (index.html:54-115):
  - Level & Experience section
  - Health section
  - Combat Stats section (Attack, Defense)
  - Progress section (Enemies Defeated, Current Room)
- **Update Function:** game.js:623-646 (updateUI)

---

## Proposed Architecture

### Design Principles
1. **Backward Compatibility:** Maintain existing stats (health, attack, defense)
2. **Extensibility:** Easy to add new attributes without refactoring
3. **Validation:** Type-safe attribute manipulation with bounds checking
4. **Separation of Concerns:** Attribute logic separate from rendering/UI
5. **Progressive Enhancement:** Start simple, scale complexity as needed

### Attribute System Structure

```javascript
// Phase 1: Simple Object-Based Approach (Recommended for current scale)
class Player {
    constructor(x, y) {
        // ... existing properties ...

        // Core attributes (existing - keep for backward compatibility)
        this.coreStats = {
            maxHealth: 100,
            health: 100,
            attack: 10,
            defense: 5,
            speed: 3
        };

        // Extended attributes (NEW)
        this.attributes = {
            // Primary attributes
            strength: 10,      // Affects attack, carry capacity
            vitality: 10,      // Affects max health, health regen
            dexterity: 10,     // Affects speed, dodge chance, crit chance
            intelligence: 10,  // Affects magic damage, mana pool
            wisdom: 10,        // Affects mana regen, magic defense
            luck: 10,          // Affects crit chance, loot quality

            // Secondary attributes (derived/tracked)
            critChance: 0.05,  // 5% base crit chance
            critMultiplier: 1.5, // 1.5x damage on crit
            dodgeChance: 0.05, // 5% base dodge chance
            healthRegen: 0,    // HP per second
            manaRegen: 0,      // Mana per second (if mana system added)

            // Resistance attributes
            physicalResist: 0,
            magicResist: 0,

            // Utility attributes
            movementSpeed: 1.0, // Movement speed multiplier
            attackSpeed: 1.0,   // Attack speed multiplier
            experienceGain: 1.0 // XP multiplier
        };

        // Attribute points (for player allocation)
        this.attributePoints = 0; // Gained on level up
    }

    // Calculated properties based on attributes
    get effectiveAttack() {
        return this.attack + Math.floor(this.attributes.strength * 0.5);
    }

    get effectiveMaxHealth() {
        return this.maxHealth + Math.floor(this.attributes.vitality * 2);
    }

    get effectiveSpeed() {
        const dexBonus = this.attributes.dexterity * 0.1;
        return this.speed * this.attributes.movementSpeed * (1 + dexBonus / 100);
    }

    get effectiveCritChance() {
        const luckBonus = this.attributes.luck * 0.002; // 0.2% per luck
        const dexBonus = this.attributes.dexterity * 0.001; // 0.1% per dex
        return Math.min(0.75, this.attributes.critChance + luckBonus + dexBonus); // Cap at 75%
    }
}
```

### Phase 2: Attribute Manager Pattern (For 3,000+ lines)

```javascript
class AttributeManager {
    constructor(baseAttributes) {
        this.base = { ...baseAttributes };
        this.modifiers = []; // Buffs, debuffs, equipment bonuses
        this.dirty = true; // Recalculation flag
        this.calculated = {};
    }

    addModifier(modifier) {
        this.modifiers.push(modifier);
        this.dirty = true;
    }

    removeModifier(modifierId) {
        this.modifiers = this.modifiers.filter(m => m.id !== modifierId);
        this.dirty = true;
    }

    get(attributeName) {
        if (this.dirty) this.recalculate();
        return this.calculated[attributeName] || this.base[attributeName] || 0;
    }

    recalculate() {
        this.calculated = { ...this.base };

        // Apply all modifiers
        for (const mod of this.modifiers) {
            if (mod.type === 'add') {
                this.calculated[mod.attribute] += mod.value;
            } else if (mod.type === 'multiply') {
                this.calculated[mod.attribute] *= mod.value;
            }
        }

        this.dirty = false;
    }

    validate() {
        // Ensure all attributes within valid ranges
        for (const [key, value] of Object.entries(this.calculated)) {
            if (typeof value !== 'number' || isNaN(value)) {
                console.error(`Invalid attribute value: ${key} = ${value}`);
                this.calculated[key] = this.base[key] || 0;
            }
        }
    }
}
```

---

## Attribute Categories

### Primary Attributes (Player-Controlled)
These attributes can be increased by spending attribute points on level up:

1. **Strength (STR)**
   - Affects: Physical attack damage, carry capacity
   - Formula: `effectiveAttack = baseAttack + (STR * 0.5)`
   - Use cases: Warrior/melee builds

2. **Vitality (VIT)**
   - Affects: Max health, health regeneration
   - Formula: `effectiveMaxHealth = baseMaxHealth + (VIT * 2)`
   - Use cases: Tank builds, survivability

3. **Dexterity (DEX)**
   - Affects: Attack speed, crit chance, dodge chance, movement speed
   - Formula:
     - `critChance += DEX * 0.001`
     - `dodgeChance += DEX * 0.002`
     - `movementSpeed *= (1 + DEX * 0.001)`
   - Use cases: Rogue/agile builds

4. **Intelligence (INT)**
   - Affects: Magic damage, mana pool (future)
   - Formula: `magicDamage = INT * 0.75`
   - Use cases: Mage builds (future feature)

5. **Wisdom (WIS)**
   - Affects: Magic defense, mana regeneration (future)
   - Formula: `magicResist = WIS * 0.5`
   - Use cases: Support/caster builds

6. **Luck (LCK)**
   - Affects: Critical chance, loot quality, rare drops
   - Formula:
     - `critChance += LCK * 0.002`
     - `lootQualityBonus = LCK * 0.01`
   - Use cases: Treasure hunter builds

### Secondary Attributes (Derived/Calculated)
These are calculated from primary attributes and cannot be directly increased:

- **Critical Hit Chance:** Base 5% + bonuses from DEX, LCK
- **Critical Hit Damage:** Base 150% damage multiplier
- **Dodge Chance:** Base 5% + bonuses from DEX
- **Health Regeneration:** Base 0 + bonuses from VIT
- **Physical Resistance:** Base from Defense stat + equipment
- **Magic Resistance:** Base from WIS + equipment
- **Movement Speed Multiplier:** Base 1.0 + bonuses from DEX
- **Attack Speed Multiplier:** Base 1.0 + bonuses from DEX
- **Experience Gain Multiplier:** Base 1.0 + equipment/buffs

### Tertiary Attributes (Tracked Stats)
These track various gameplay metrics:

- **Total Damage Dealt**
- **Total Damage Taken**
- **Total Healing Received**
- **Critical Hits Landed**
- **Attacks Dodged**
- **Distance Traveled**
- **Time Played**

---

## Code Integration Strategy

### File Structure (Current: Monolithic)
Current: Single `game.js` file (1,329 lines)

**Recommendation:** Keep monolithic for now, refactor at 1,500+ lines

### Integration Points

#### 1. Player Class Modifications (game.js:133-162)

**Before:**
```javascript
class Player {
    constructor(x, y) {
        // ... position/size ...
        this.level = 1;
        this.xp = 0;
        this.maxHealth = 100;
        this.health = 100;
        this.attack = 10;
        this.defense = 5;
    }
}
```

**After:**
```javascript
class Player {
    constructor(x, y) {
        // ... position/size ...

        // Core progression (keep for backward compatibility)
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 100;

        // Base stats (keep as-is)
        this.baseMaxHealth = 100;
        this.baseAttack = 10;
        this.baseDefense = 5;
        this.baseSpeed = 3;

        // Primary attributes (NEW)
        this.attributes = this.initializeAttributes();

        // Attribute points for allocation (NEW)
        this.attributePoints = 0;
        this.attributePointsPerLevel = 3;

        // Computed stats (getters will calculate these)
        this.updateComputedStats();
    }

    initializeAttributes() {
        return {
            // Primary
            strength: 10,
            vitality: 10,
            dexterity: 10,
            intelligence: 10,
            wisdom: 10,
            luck: 10,

            // Secondary (derived)
            critChance: 0.05,
            critMultiplier: 1.5,
            dodgeChance: 0.05,
            healthRegen: 0,
            physicalResist: 0,
            magicResist: 0,
            movementSpeedMult: 1.0,
            attackSpeedMult: 1.0,
            xpGainMult: 1.0
        };
    }

    updateComputedStats() {
        // Recalculate derived stats based on attributes
        this.maxHealth = this.baseMaxHealth + Math.floor(this.attributes.vitality * 2);
        this.attack = this.baseAttack + Math.floor(this.attributes.strength * 0.5);
        this.defense = this.baseDefense + Math.floor(this.attributes.vitality * 0.3);
        this.speed = this.baseSpeed * this.attributes.movementSpeedMult * (1 + this.attributes.dexterity * 0.001);

        // Update secondary attributes
        this.attributes.critChance = Math.min(0.75,
            0.05 + this.attributes.luck * 0.002 + this.attributes.dexterity * 0.001
        );
        this.attributes.dodgeChance = Math.min(0.5,
            0.05 + this.attributes.dexterity * 0.002
        );
        this.attributes.healthRegen = this.attributes.vitality * 0.1; // 0.1 HP/sec per VIT
        this.attributes.physicalResist = this.defense * 0.5;
        this.attributes.magicResist = this.attributes.wisdom * 0.5;
    }

    // NEW: Allocate attribute points
    allocateAttribute(attributeName, points = 1) {
        if (this.attributePoints < points) {
            return { success: false, error: 'Not enough attribute points' };
        }

        if (!['strength', 'vitality', 'dexterity', 'intelligence', 'wisdom', 'luck'].includes(attributeName)) {
            return { success: false, error: 'Invalid attribute name' };
        }

        if (this.attributes[attributeName] >= 100) {
            return { success: false, error: 'Attribute cap reached (100)' };
        }

        this.attributes[attributeName] += points;
        this.attributePoints -= points;
        this.updateComputedStats();

        return { success: true };
    }
}
```

#### 2. Level Up System (game.js:364-377)

**Before:**
```javascript
levelUp() {
    this.level++;
    this.xp -= this.xpNeeded;
    this.xpNeeded = Math.floor(this.xpNeeded * 1.5);

    this.maxHealth += 20;
    this.health = this.maxHealth;
    this.attack += 5;
    this.defense += 2;

    showMessage(`LEVEL UP! Now level ${this.level}!`);
}
```

**After:**
```javascript
levelUp() {
    this.level++;
    this.xp -= this.xpNeeded;
    this.xpNeeded = Math.floor(this.xpNeeded * 1.5);

    // Grant attribute points
    this.attributePoints += this.attributePointsPerLevel;

    // Small automatic stat increases (reduced from before)
    this.baseMaxHealth += 5; // Reduced from +20
    this.baseAttack += 1;    // Reduced from +5
    this.baseDefense += 1;   // Reduced from +2

    // Recalculate all computed stats
    this.updateComputedStats();

    // Full heal on level up
    this.health = this.maxHealth;

    showMessage(`LEVEL UP! Now level ${this.level}! (+${this.attributePointsPerLevel} Attribute Points)`);
    createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ffd700', 20);
    updateUI();
}
```

#### 3. Combat System Integration (game.js:200-350)

**Critical Hit System (NEW):**
```javascript
// In Player.attackEnemy() method
attackEnemy(enemy) {
    if (this.attackCooldown > 0) return;

    // Check for dodge
    if (Math.random() < enemy.attributes?.dodgeChance || 0) {
        showMessage('DODGED!');
        createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffffff', 8);
        this.attackCooldown = 30;
        return;
    }

    // Calculate damage
    let damage = Math.max(1, this.attack - enemy.defense);

    // Check for critical hit
    const isCrit = Math.random() < this.attributes.critChance;
    if (isCrit) {
        damage *= this.attributes.critMultiplier;
        showMessage(`CRITICAL HIT! ${Math.floor(damage)} damage!`);
        createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0000', 15);
    } else {
        showMessage(`Hit for ${Math.floor(damage)} damage`);
        createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffaa00', 8);
    }

    enemy.takeDamage(damage);
    this.attackCooldown = 30 / this.attributes.attackSpeedMult; // Attack speed affects cooldown
}
```

**Health Regeneration (NEW):**
```javascript
// In Player.update() method
update() {
    // ... existing movement code ...

    // Health regeneration (if enabled via attributes)
    if (this.attributes.healthRegen > 0) {
        const regenPerFrame = this.attributes.healthRegen / 60; // Convert to per-frame (60 FPS)
        this.health = Math.min(this.maxHealth, this.health + regenPerFrame);
    }

    // ... rest of update logic ...
}
```

#### 4. XP Gain Integration (game.js:353-362)

```javascript
gainXP(amount) {
    const modifiedXP = Math.floor(amount * this.attributes.xpGainMult);
    this.xp += modifiedXP;
    showMessage(`+${modifiedXP} XP!`);

    while (this.xp >= this.xpNeeded) {
        this.levelUp();
    }

    updateUI();
}
```

#### 5. UI Updates (game.js:623-646, index.html)

**New UI Elements Needed:**
- Attribute allocation panel (modal or expandable section)
- Attribute point counter
- Individual attribute displays with +/- buttons
- Secondary attribute tooltips
- Confirmation dialogs for attribute allocation

**updateUI() Modifications:**
```javascript
function updateUI() {
    // Existing UI updates...
    document.getElementById('quick-level').textContent = player.level;
    document.getElementById('quick-health-text').textContent =
        `${Math.ceil(player.health)}/${player.maxHealth}`;

    // NEW: Attribute points indicator
    const attrPointsElement = document.getElementById('attr-points-available');
    if (attrPointsElement) {
        attrPointsElement.textContent = player.attributePoints;
        attrPointsElement.parentElement.style.display =
            player.attributePoints > 0 ? 'block' : 'none';
    }

    // NEW: Primary attributes
    const primaryAttrs = ['strength', 'vitality', 'dexterity', 'intelligence', 'wisdom', 'luck'];
    for (const attr of primaryAttrs) {
        const element = document.getElementById(`attr-${attr}`);
        if (element) {
            element.textContent = player.attributes[attr];
        }
    }

    // NEW: Secondary attributes (with formatting)
    document.getElementById('attr-crit-chance')?.textContent =
        `${(player.attributes.critChance * 100).toFixed(1)}%`;
    document.getElementById('attr-dodge-chance')?.textContent =
        `${(player.attributes.dodgeChance * 100).toFixed(1)}%`;
    document.getElementById('attr-health-regen')?.textContent =
        `${player.attributes.healthRegen.toFixed(1)}/sec`;

    // ... rest of UI updates ...
}
```

---

## Validation & Data Integrity

### Validation Rules

#### 1. Attribute Bounds
```javascript
class AttributeValidator {
    static MIN_ATTRIBUTE = 1;
    static MAX_ATTRIBUTE = 100;
    static MIN_LEVEL = 1;
    static MAX_LEVEL = 100;

    static validateAttribute(name, value) {
        if (typeof value !== 'number' || isNaN(value)) {
            return { valid: false, error: `${name} must be a number` };
        }

        if (value < this.MIN_ATTRIBUTE) {
            return { valid: false, error: `${name} cannot be below ${this.MIN_ATTRIBUTE}` };
        }

        if (value > this.MAX_ATTRIBUTE) {
            return { valid: false, error: `${name} cannot exceed ${this.MAX_ATTRIBUTE}` };
        }

        return { valid: true };
    }

    static validateAttributes(attributes) {
        const errors = [];

        for (const [name, value] of Object.entries(attributes)) {
            const result = this.validateAttribute(name, value);
            if (!result.valid) {
                errors.push(result.error);
            }
        }

        return errors.length === 0 ? { valid: true } : { valid: false, errors };
    }

    static validateAttributeAllocation(player, attributeName, points) {
        // Check if player has enough points
        if (player.attributePoints < points) {
            return { valid: false, error: 'Insufficient attribute points' };
        }

        // Check if attribute exists
        const primaryAttributes = ['strength', 'vitality', 'dexterity', 'intelligence', 'wisdom', 'luck'];
        if (!primaryAttributes.includes(attributeName)) {
            return { valid: false, error: 'Invalid attribute name' };
        }

        // Check if allocation would exceed cap
        if (player.attributes[attributeName] + points > this.MAX_ATTRIBUTE) {
            return { valid: false, error: `${attributeName} would exceed maximum (${this.MAX_ATTRIBUTE})` };
        }

        return { valid: true };
    }
}
```

#### 2. Save/Load Validation
```javascript
class PlayerSerializer {
    static serialize(player) {
        return {
            version: '1.0.0',
            position: { x: player.x, y: player.y },
            level: player.level,
            xp: player.xp,
            xpNeeded: player.xpNeeded,
            health: player.health,
            baseStats: {
                maxHealth: player.baseMaxHealth,
                attack: player.baseAttack,
                defense: player.baseDefense,
                speed: player.baseSpeed
            },
            attributes: { ...player.attributes },
            attributePoints: player.attributePoints,
            timestamp: Date.now()
        };
    }

    static deserialize(data, player) {
        // Version checking
        if (!data.version || data.version !== '1.0.0') {
            console.warn('Save data version mismatch, attempting migration');
        }

        // Validate all data before applying
        const validation = AttributeValidator.validateAttributes(data.attributes || {});
        if (!validation.valid) {
            console.error('Invalid save data:', validation.errors);
            return false;
        }

        // Apply data
        player.x = data.position?.x ?? player.x;
        player.y = data.position?.y ?? player.y;
        player.level = data.level ?? player.level;
        player.xp = data.xp ?? player.xp;
        player.xpNeeded = data.xpNeeded ?? player.xpNeeded;
        player.health = data.health ?? player.health;

        if (data.baseStats) {
            player.baseMaxHealth = data.baseStats.maxHealth;
            player.baseAttack = data.baseStats.attack;
            player.baseDefense = data.baseStats.defense;
            player.baseSpeed = data.baseStats.speed;
        }

        if (data.attributes) {
            player.attributes = { ...player.attributes, ...data.attributes };
        }

        player.attributePoints = data.attributePoints ?? player.attributePoints;
        player.updateComputedStats();

        return true;
    }
}
```

#### 3. Sanitization for Network Play (Future)
```javascript
class AttributeSanitizer {
    // For future multiplayer/leaderboard features
    static sanitizePlayerData(player) {
        // Detect impossible values (cheating detection)
        const totalAttributePoints =
            Object.values(player.attributes)
                .filter((_, key) => ['strength', 'vitality', 'dexterity', 'intelligence', 'wisdom', 'luck'].includes(key))
                .reduce((sum, val) => sum + val, 0);

        const expectedPoints = 60 + (player.level - 1) * player.attributePointsPerLevel + player.attributePoints;

        if (totalAttributePoints > expectedPoints) {
            console.error('Attribute point mismatch detected');
            return null; // Invalid data
        }

        return {
            level: player.level,
            attributes: player.attributes,
            validated: true
        };
    }
}
```

---

## Testing Strategy

### Testing Phases

#### Phase 1: Manual Testing (Current Scale)
**Checklist for Attribute System:**

```markdown
## Attribute System Test Checklist

### Basic Functionality
- [ ] Player starts with correct default attributes (all 10)
- [ ] Player starts with 0 attribute points
- [ ] Level up grants correct number of attribute points (3 per level)
- [ ] Attribute allocation reduces available points correctly
- [ ] Attribute values update in UI immediately
- [ ] Cannot allocate more points than available
- [ ] Cannot allocate to invalid attribute names
- [ ] Cannot exceed attribute cap (100)

### Stat Calculations
- [ ] Max health increases correctly with vitality (base + VIT * 2)
- [ ] Attack damage increases correctly with strength (base + STR * 0.5)
- [ ] Movement speed increases correctly with dexterity
- [ ] Critical hit chance calculates correctly (base + LCK * 0.002 + DEX * 0.001)
- [ ] Dodge chance calculates correctly (base + DEX * 0.002)
- [ ] Health regeneration works (VIT * 0.1 HP/sec)
- [ ] All computed stats recalculate on attribute change

### Combat Integration
- [ ] Critical hits trigger at correct rate
- [ ] Critical hits deal correct damage (base * critMultiplier)
- [ ] Dodge mechanics work correctly
- [ ] Attack speed modifier affects cooldown correctly
- [ ] Damage calculation uses effective attack (with STR bonus)

### Progression
- [ ] Base stats still increase slightly on level up
- [ ] XP multiplier affects XP gain correctly
- [ ] Attribute point allocation persists through room transitions
- [ ] Stats update correctly after level up

### UI/UX
- [ ] Character menu shows all attributes correctly
- [ ] Attribute allocation buttons work
- [ ] Attribute point counter displays correctly
- [ ] Tooltips explain attribute effects
- [ ] Visual feedback for attribute allocation (animation/sound)
- [ ] Unable to allocate when no points available (disabled buttons)

### Edge Cases
- [ ] Level 1 → Level 2 transition works
- [ ] Level 99 → Level 100 transition works (if max level)
- [ ] Allocating last attribute point works
- [ ] Reaching attribute cap (100) works
- [ ] Death/reset resets attributes correctly
- [ ] Multiple level ups in quick succession work (XP overflow)

### Performance
- [ ] updateComputedStats() doesn't cause lag
- [ ] UI updates don't cause frame drops
- [ ] No memory leaks from attribute objects
```

#### Phase 2: Unit Testing (1,500+ lines)

**Test Files Structure:**
```
/tests
  /unit
    - player.test.js
    - attributes.test.js
    - combat.test.js
    - validation.test.js
```

**Example Tests:**
```javascript
// tests/unit/attributes.test.js
describe('Attribute System', () => {
    let player;

    beforeEach(() => {
        player = new Player(100, 100);
    });

    test('should initialize with default attributes', () => {
        expect(player.attributes.strength).toBe(10);
        expect(player.attributes.vitality).toBe(10);
        expect(player.attributes.dexterity).toBe(10);
    });

    test('should grant attribute points on level up', () => {
        const pointsBefore = player.attributePoints;
        player.levelUp();
        expect(player.attributePoints).toBe(pointsBefore + 3);
    });

    test('should increase max health with vitality', () => {
        const healthBefore = player.maxHealth;
        player.attributes.vitality += 10;
        player.updateComputedStats();
        expect(player.maxHealth).toBe(healthBefore + 20); // 10 VIT * 2
    });

    test('should not allow allocation without points', () => {
        player.attributePoints = 0;
        const result = player.allocateAttribute('strength', 1);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough attribute points');
    });

    test('should not exceed attribute cap', () => {
        player.attributes.strength = 100;
        player.attributePoints = 10;
        const result = player.allocateAttribute('strength', 1);
        expect(result.success).toBe(false);
    });

    test('should calculate critical hit chance correctly', () => {
        player.attributes.luck = 20;
        player.attributes.dexterity = 30;
        player.updateComputedStats();

        const expectedCrit = 0.05 + (20 * 0.002) + (30 * 0.001);
        expect(player.attributes.critChance).toBeCloseTo(expectedCrit, 3);
    });
});

describe('Combat System with Attributes', () => {
    test('should apply critical hit damage', () => {
        const player = new Player(100, 100);
        const enemy = new Enemy(200, 200);

        player.attack = 20;
        player.attributes.critMultiplier = 2.0;

        // Mock Math.random to force crit
        const originalRandom = Math.random;
        Math.random = () => 0; // Always crit

        const healthBefore = enemy.health;
        player.attackEnemy(enemy);

        const damage = healthBefore - enemy.health;
        expect(damage).toBeGreaterThan(player.attack); // Should be crit damage

        Math.random = originalRandom;
    });
});
```

#### Phase 3: Integration Testing (3,000+ lines)

**Test Scenarios:**
```javascript
describe('Attribute Integration Tests', () => {
    test('full progression flow', () => {
        const player = new Player(100, 100);

        // Grant XP to level up
        player.gainXP(100);
        expect(player.level).toBe(2);
        expect(player.attributePoints).toBe(3);

        // Allocate points
        player.allocateAttribute('strength', 2);
        player.allocateAttribute('vitality', 1);

        // Verify stats updated
        expect(player.attack).toBeGreaterThan(10);
        expect(player.maxHealth).toBeGreaterThan(100);
        expect(player.attributePoints).toBe(0);
    });

    test('room transition preserves attributes', () => {
        // Test that attributes persist across room changes
    });

    test('death resets attributes correctly', () => {
        // Test that death/restart resets to initial state
    });
});
```

#### Phase 4: Regression Testing

**After Each Change:**
1. Run full manual test checklist
2. Verify no existing features broken
3. Test all room transitions
4. Test combat mechanics
5. Test UI responsiveness
6. Test on mobile (touch controls)

**Automated Regression Suite (if using test framework):**
```bash
npm test -- --coverage
```

### Testing Tools Recommendation

**Current Phase (Manual):**
- Browser DevTools Console
- Manual playthrough testing
- Checklist tracking (markdown file)

**When Scaling (1,500+ lines):**
- **Vitest** or **Jest** for unit tests
- **Manual E2E** for integration testing
- Consider **Playwright** for E2E automation (5,000+ lines)

---

## Refactoring Considerations

### When to Refactor

**Current State:** 1,329 lines (monolithic)
**Recommendation:** Add attribute system without refactoring

**Refactor Trigger Points:**
1. **1,500+ lines:** Extract to modules (see DEVELOPMENT.md Phase 1)
2. **3,000+ lines:** Implement AttributeManager pattern
3. **5,000+ lines:** Data-driven design (JSON configs)

### Refactoring Strategy

#### Step 1: Extract Attribute System (1,500+ lines)
```
/src
  /systems
    - attributes.js        (AttributeManager, validators)
  /entities
    - Player.js           (Player class)
  /utils
    - calculations.js     (Stat calculations, formulas)
```

#### Step 2: Create Configuration Layer (3,000+ lines)
```javascript
// /src/config/attributeConfig.js
export const ATTRIBUTE_CONFIG = {
    primary: {
        strength: {
            displayName: 'Strength',
            description: 'Increases physical attack damage',
            icon: '💪',
            baseValue: 10,
            min: 1,
            max: 100,
            effects: [
                { stat: 'attack', formula: (str) => str * 0.5 }
            ]
        },
        vitality: {
            displayName: 'Vitality',
            description: 'Increases max health and health regeneration',
            icon: '❤️',
            baseValue: 10,
            min: 1,
            max: 100,
            effects: [
                { stat: 'maxHealth', formula: (vit) => vit * 2 },
                { stat: 'healthRegen', formula: (vit) => vit * 0.1 }
            ]
        }
        // ... other attributes
    },
    secondary: {
        critChance: {
            displayName: 'Critical Hit Chance',
            description: 'Chance to deal critical damage',
            format: 'percentage',
            baseValue: 0.05
        }
        // ... other secondary attributes
    }
};
```

#### Step 3: Data-Driven Formulas (5,000+ lines)
```javascript
// Formula engine for extensibility
class FormulaEngine {
    static evaluate(formula, context) {
        // Safe evaluation of formula strings
        // Example: "base + (str * 0.5) + (level * 0.2)"
    }
}
```

### Backward Compatibility Strategy

**Maintain Old Interface:**
```javascript
class Player {
    // Old interface (for backward compatibility)
    get maxHealth() {
        return this._computedMaxHealth || 100;
    }

    get attack() {
        return this._computedAttack || 10;
    }

    // New interface (attributes system)
    get attributes() {
        return this._attributes;
    }
}
```

**Migration Path:**
1. Add new attribute system alongside old stats
2. Gradually shift calculations to new system
3. Keep old properties as computed values
4. Remove old system in major version bump (v2.0)

---

## Implementation Phases

### Phase 1: Foundation (Estimated: 2-4 hours)
**Goal:** Add attribute data structures without breaking existing functionality

**Tasks:**
- [x] Review existing code
- [ ] Create attribute initialization in Player constructor
- [ ] Add `updateComputedStats()` method
- [ ] Implement attribute point system
- [ ] Update level-up to grant attribute points
- [ ] Test basic functionality (no UI yet)

**Validation:**
- Player initializes with attributes
- Level up grants points
- No existing features broken

### Phase 2: Core Mechanics (Estimated: 3-5 hours)
**Goal:** Implement attribute effects on gameplay

**Tasks:**
- [ ] Implement `allocateAttribute()` method
- [ ] Add validation for attribute allocation
- [ ] Integrate strength → attack calculation
- [ ] Integrate vitality → maxHealth calculation
- [ ] Integrate dexterity → speed calculation
- [ ] Add critical hit system
- [ ] Add dodge system
- [ ] Add health regeneration
- [ ] Test all mechanics

**Validation:**
- Attributes affect stats correctly
- Combat mechanics work (crit, dodge)
- Health regen functional

### Phase 3: UI Implementation (Estimated: 4-6 hours)
**Goal:** Create user interface for attribute system

**Tasks:**
- [ ] Design attribute allocation UI (modal or panel)
- [ ] Add HTML elements for attributes
- [ ] Style attribute UI (CSS)
- [ ] Add attribute allocation buttons (+/- or click to allocate)
- [ ] Add attribute point counter display
- [ ] Add tooltips for attributes
- [ ] Update `updateUI()` function
- [ ] Add visual feedback (animations, particles)
- [ ] Add confirmation for attribute allocation (optional)
- [ ] Test UI on desktop
- [ ] Test UI on mobile/tablet

**Validation:**
- UI displays correctly on all devices
- Buttons work correctly
- Visual feedback clear
- No layout issues

### Phase 4: Polish & Balance (Estimated: 2-4 hours)
**Goal:** Fine-tune formulas and user experience

**Tasks:**
- [ ] Balance attribute formulas (test different builds)
- [ ] Adjust attribute point gain rate
- [ ] Tune crit chance, dodge chance caps
- [ ] Add sound effects for attribute allocation
- [ ] Add particle effects for level up
- [ ] Add help text / tutorial
- [ ] Playtest with different attribute builds
- [ ] Adjust based on playtesting feedback

**Validation:**
- Multiple builds viable (STR, VIT, DEX focused)
- No overpowered combinations
- Progression feels rewarding

### Phase 5: Testing & Documentation (Estimated: 2-3 hours)
**Goal:** Comprehensive testing and documentation

**Tasks:**
- [ ] Complete manual test checklist
- [ ] Test all edge cases
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Document attribute formulas
- [ ] Create player-facing documentation (guide)
- [ ] Update DEVELOPMENT.md with implementation notes
- [ ] Write commit messages
- [ ] Create pull request

**Validation:**
- All tests pass
- No bugs found
- Documentation complete

### Phase 6: Deployment (Estimated: 1 hour)
**Goal:** Merge and deploy to production

**Tasks:**
- [ ] Final code review
- [ ] Merge feature branch
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather user feedback

**Total Estimated Time:** 14-23 hours of focused development

---

## UI/UX Considerations

### Attribute Allocation Interface

#### Option 1: Modal Panel (Recommended)
```html
<!-- Character Menu - Add new section -->
<div class="stat-section attributes-section">
    <h3>🎯 Attributes</h3>

    <div class="attr-points-banner" id="attr-points-banner">
        <span class="attr-points-label">Available Points:</span>
        <span class="attr-points-value" id="attr-points-value">0</span>
    </div>

    <!-- Primary Attributes -->
    <div class="attribute-row">
        <span class="attr-icon">💪</span>
        <span class="attr-name">Strength</span>
        <span class="attr-value" id="attr-strength">10</span>
        <button class="attr-btn attr-btn-plus" data-attr="strength">+</button>
    </div>

    <div class="attribute-row">
        <span class="attr-icon">❤️</span>
        <span class="attr-name">Vitality</span>
        <span class="attr-value" id="attr-vitality">10</span>
        <button class="attr-btn attr-btn-plus" data-attr="vitality">+</button>
    </div>

    <!-- ... other attributes ... -->

    <!-- Secondary Attributes (Display Only) -->
    <div class="stat-divider"></div>
    <h4>📊 Derived Stats</h4>

    <div class="secondary-attr-row">
        <span class="sec-attr-name">Critical Chance:</span>
        <span class="sec-attr-value" id="attr-crit-chance">5.0%</span>
    </div>

    <!-- ... other secondary attributes ... -->
</div>
```

#### Option 2: Inline Allocation (Alternative)
- Show +/- buttons directly in character menu
- Pros: No additional modal needed
- Cons: More cluttered interface

#### Option 3: Level-Up Popup (Alternative)
- Show attribute allocation screen immediately on level up
- Force allocation before continuing
- Pros: Immediate feedback, can't forget to allocate
- Cons: Interrupts gameplay flow

**Recommendation:** Option 1 (Modal Panel) + notification on level up

### Visual Feedback

**On Level Up:**
- Golden particle burst (already exists)
- "+3 Attribute Points!" message
- Optional: Highlight character stats button

**On Attribute Allocation:**
- Small particle effect at button location
- Color flash on stat increase
- Sound effect (coin/power-up sound)
- Updated stat values with animation (number count-up)

**Attribute Point Indicator:**
- Badge/notification on character stats button when points available
- Pulsing glow effect
- Color: Gold/yellow to indicate availability

### Mobile Considerations

**Touch Targets:**
- Minimum 44x44px buttons (Apple HIG)
- Adequate spacing between buttons
- Large enough text for readability

**Layout:**
- Scrollable attribute list if many attributes
- Fixed header with point counter
- Sticky action buttons

**Gestures:**
- Tap to allocate
- Long-press for tooltip (optional)
- Swipe to close modal

---

## Risk Assessment & Mitigation

### Potential Risks

#### 1. Balance Issues
**Risk:** Some attributes too strong, creating one optimal build
**Impact:** Medium - Reduces player choice
**Mitigation:**
- Extensive playtesting with different builds
- Cap powerful effects (crit chance, dodge chance)
- Diminishing returns on high attribute values (optional)
- Monitor player feedback post-launch

#### 2. Save Data Corruption
**Risk:** Attribute data not saving/loading correctly
**Impact:** High - Player progress loss
**Mitigation:**
- Implement robust validation
- Version save data format
- Test save/load extensively
- Add fallback to default values

#### 3. Performance Impact
**Risk:** Recalculating stats every frame causes lag
**Impact:** Low-Medium - Gameplay stuttering
**Mitigation:**
- Only recalculate when attributes change (dirty flag)
- Profile performance with browser DevTools
- Optimize calculation functions
- Consider memoization for complex calculations

#### 4. UI Complexity
**Risk:** Too many attributes overwhelm players
**Impact:** Medium - Reduced player engagement
**Mitigation:**
- Start with 6 primary attributes (STR, VIT, DEX, INT, WIS, LCK)
- Hide secondary attributes behind tooltips
- Clear descriptions and icons
- Optional: Tutorial or help text

#### 5. Backward Compatibility
**Risk:** Existing saves break with new system
**Impact:** High - Current players lose progress
**Mitigation:**
- Not applicable (no save system currently)
- When implementing saves, use versioning
- Provide migration path for old saves

#### 6. Testing Coverage
**Risk:** Bugs slip through due to insufficient testing
**Impact:** Medium-High - Poor player experience
**Mitigation:**
- Comprehensive manual test checklist
- Test all edge cases
- Multiple device/browser testing
- Phased rollout (alpha → beta → production)

---

## Future Enhancements

### Post-Implementation Features

**Phase 1 Additions (After initial release):**
- Attribute presets/templates (Warrior, Mage, Rogue builds)
- Attribute respec/reset functionality (for gold or special item)
- Attribute synergies (bonuses for balanced builds)

**Phase 2 Additions (If expanding game):**
- Equipment with attribute requirements
- Attribute-based skill unlocks
- Attribute milestones (bonus at 25, 50, 75, 100)
- Diminishing returns on extreme min-maxing

**Phase 3 Additions (Advanced systems):**
- Attribute soft caps and hard caps
- Attribute-based dialogue/quest options
- Attribute-based enemy scaling
- Build sharing/leaderboards

---

## Success Criteria

### Definition of Done

**Functional Requirements:**
- [ ] Player can allocate attribute points
- [ ] Attributes affect gameplay (combat, movement, progression)
- [ ] UI displays attributes clearly
- [ ] All existing features still work
- [ ] No critical bugs

**Quality Requirements:**
- [ ] Code is clean and maintainable
- [ ] Performance impact minimal (<5ms per frame)
- [ ] Cross-browser compatible
- [ ] Mobile-friendly UI
- [ ] Comprehensive testing completed

**Documentation Requirements:**
- [ ] Implementation documented
- [ ] Player guide created (optional)
- [ ] Code comments added
- [ ] DEVELOPMENT.md updated

### Metrics for Success

**Technical Metrics:**
- 0 critical bugs
- <5ms performance overhead
- 100% feature parity with existing systems
- 90%+ test coverage (manual checklist)

**User Experience Metrics:**
- Multiple viable builds exist
- Attribute allocation intuitive (no confusion)
- Visual feedback clear
- Mobile experience smooth

---

## Conclusion & Next Steps

This plan provides a comprehensive roadmap for adding a character attribute system to the game. The approach prioritizes:

1. **Minimal disruption** to existing functionality
2. **Extensibility** for future enhancements
3. **Player choice** through meaningful attribute allocation
4. **Code quality** through validation and testing
5. **Performance** through efficient calculations

### Immediate Next Steps

1. **Review this plan** with stakeholders (if any)
2. **Select specific attributes** to implement (recommendation: STR, VIT, DEX, LCK for Phase 1)
3. **Begin Phase 1** implementation (foundation)
4. **Set up testing environment** and checklist

### Questions to Answer Before Implementation

1. **Attribute Point Rate:** How many points per level? (Recommended: 3)
2. **Attribute Cap:** Maximum attribute value? (Recommended: 100)
3. **Starting Values:** All attributes start at 10? (Recommended: Yes)
4. **Respec:** Should players be able to reset attributes? (Recommended: No for v1)
5. **Automatic Stats:** Should base stats still increase on level up? (Recommended: Yes, but reduced)

**Ready to implement once attributes are selected and questions answered.**

---

**Document Version:** 1.0
**Last Updated:** 2026-01-22
**Author:** Planning Agent
**Status:** Awaiting Attribute Selection
