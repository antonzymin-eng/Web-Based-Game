# Development Roadmap & Architecture

## Current State
- **Lines of Code:** ~1,200
- **Architecture:** Monolithic single-file JavaScript
- **Status:** Production-ready for current feature set

## Refactoring Strategy for Expansion

### When to Refactor
- **Now:** Code is clean and maintainable at current scale
- **At 1,500+ lines:** Begin modularization
- **At 3,000+ lines:** Implement architectural patterns
- **At 5,000+ lines:** Full data-driven design

### Phase 1: Modularization (1,500+ lines)

Extract to separate files:
```
/src
  /core
    - constants.js       (All game constants)
    - gameState.js      (Central state)
    - gameLoop.js       (Main game loop)
  /entities
    - Player.js
    - Enemy.js
    - Particle.js
  /systems
    - viewport.js       (Camera & zoom/pan)
    - input.js          (Keyboard, touch, joystick)
    - collision.js
    - ui.js
  /world
    - Room.js
    - roomTemplates.js
```

### Phase 2: Architecture Patterns (3,000+ lines)

**Simple Composition (Recommended):**
```javascript
// Composition without ECS overhead
class Enemy {
    constructor(config) {
        this.stats = { ...config.stats };
        this.ai = AIFactory.create(config.aiType);
        this.combat = new Combat(config.attack, config.defense);
    }
}

// AI Factory
class AIFactory {
    static create(type) {
        switch(type) {
            case 'melee': return new MeleeAI();
            case 'ranged': return new RangedAI();
            default: return new BasicAI();
        }
    }
}
```

*Note: Full Entity Component System (ECS) only needed if you have 100+ entities and performance issues. Current approach scales fine to 20,000+ lines.*

**Class System:**
```javascript
const CLASSES = {
    WARRIOR: {
        baseStats: { health: 150, attack: 15, defense: 10, speed: 2.5 },
        skillTree: WARRIOR_SKILLS
    },
    MAGE: {
        baseStats: { health: 80, attack: 25, defense: 3, speed: 3 },
        skillTree: MAGE_SKILLS
    },
    ROGUE: {
        baseStats: { health: 100, attack: 12, defense: 5, speed: 4 },
        skillTree: ROGUE_SKILLS
    }
};
```

**Skill Tree:**
```javascript
class SkillNode {
    constructor(id, name, maxRank, requirements, effect) { /* ... */ }
    canUnlock(player) { /* check requirements */ }
}

class SkillTree {
    unlockSkill(nodeId, player) { /* ... */ }
}
```

### Phase 3: Data-Driven Design (5,000+ lines)

Move configuration to JSON:
```
/data
  - enemies.json        (Enemy type definitions)
  - abilities.json      (Ability definitions)
  - items.json          (Item database)
  - classes.json        (Class configurations)
```

*Note: JSON holds configuration data only (stats, IDs, values). Behavior/functions stay in JavaScript classes.*

**Example:**
```json
{
    "goblin": {
        "stats": { "health": 30, "attack": 8, "defense": 2 },
        "ai": "melee",
        "xpReward": 25,
        "lootTable": ["health_potion", "gold"],
        "abilities": []
    }
}
```

### Phase 4: Advanced Systems

**State Management:**
```javascript
class StateManager {
    transition(stateName) { /* switch between menu/gameplay/pause */ }
}
```

**Enemy AI Factory:**
```javascript
class EnemyFactory {
    static create(type, x, y) {
        const config = ENEMY_TYPES[type];
        const enemy = new Enemy(x, y);
        enemy.ai = new config.aiClass();
        return enemy;
    }
}
```

**Ability System:**
```javascript
class Ability {
    constructor(config) {
        this.cooldown = config.cooldown;
        this.manaCost = config.manaCost;
        this.effect = config.effect;
    }

    use(player, target) { /* execute ability */ }
}
```

## Migration Strategy

1. **Extract viewport code first** (lowest risk, well-isolated)
2. **Extract constants** (simple, high value)
3. **Move classes to files** (Player, Enemy, Particle)
4. **Create factory patterns** (for enemies)
5. **Implement ECS for new features only** (hybrid approach)
6. **Gradually migrate old code**

## Key Principles

- ✅ **Incremental:** Refactor in small steps, test after each
- ✅ **Working code first:** Keep game functional throughout
- ✅ **Data-driven:** Prefer JSON over hardcoded values
- ✅ **Composition > Inheritance:** Use ECS for flexibility
- ⚠️ **Don't refactor everything at once:** High risk, low value

## Module Loading

**Phase 1-3: Native ES6 Modules (No build system needed)**
```html
<script type="module" src="/src/core/game.js"></script>
```
```javascript
// In game.js
import { Player } from './entities/Player.js';
import { viewport } from './systems/viewport.js';
```

**Phase 4: Build System (Optional, 10,000+ lines)**

Only add bundler when you need optimization:
```json
{
    "scripts": {
        "dev": "vite",
        "build": "vite build"
    }
}
```

## Current Features Complete ✅

- Viewport zoom/pan with camera follow
- Touch controls (joystick, pinch-zoom, drag-pan)
- RPG mechanics (XP, levels, combat, stats)
- Room system with enemies, chests, doors
- Visual feedback (zoom indicator, health bars, particles)

## Next Feature Recommendations

Before major refactoring, consider adding:
1. More enemy types (using current Enemy class)
2. More room templates (using current Room structure)
3. Simple abilities (extend Player class)
4. Inventory system (new module, good refactor candidate)

Refactor when you feel pain maintaining/extending current structure.
