# Development Roadmap & Architecture

> **Navigation:** [Current State](#current-state) | [Refactoring Strategy](#refactoring-strategy-for-expansion) | [Testing](#testing-strategy) | [Module Loading](#module-loading) | [Features](#current-features-complete-)

## Current State
- **Lines of Code:** 1,329 (game.js)
- **File Structure:**
  - `game.js` - Core game logic (1,329 lines)
  - `index.html` - HTML structure (120 lines)
  - `styles.css` - Styling and responsive design
- **Architecture:** Monolithic single-file JavaScript
- **Status:** Production-ready, approaching modularization threshold (1,500 lines)

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
- ✅ **Data-driven:** Prefer JSON over hardcoded values (when project scales)
- ✅ **Composition > Inheritance:** Use composition patterns for flexibility
- ⚠️ **Don't refactor everything at once:** High risk, low value
- ✅ **Test before refactoring:** Ensure current functionality works before restructuring

## Testing Strategy

### Current Approach (Pre-Modularization)
At current scale (1,329 lines), manual testing is sufficient:
- **Playthrough Testing**: Play through all 3 rooms after changes
- **Feature Testing**: Test specific features (combat, movement, camera, chests, level-up)
- **Cross-browser Testing**: Test on Chrome, Firefox, Safari (desktop + mobile)
- **Touch Testing**: Verify joystick, pinch-zoom, pan, double-tap on mobile devices

**Manual Test Checklist:**
- [ ] Player movement (WASD, arrows, joystick)
- [ ] Combat (attack key, button, range, damage, cooldown)
- [ ] Enemy AI (aggro, chase, attack)
- [ ] Chests (open, rewards: health, XP, gold)
- [ ] Level progression (XP gain, level up, stat increases)
- [ ] Camera (zoom, pan, follow mode, double-tap reset)
- [ ] Room transitions (doors, enemy/chest state persistence)
- [ ] Death and restart (health = 0, respawn)

### Phase 1-2: Lightweight Testing (1,500-3,000 lines)
When modularizing, add basic unit tests for critical functions:
```javascript
// Example: Test damage calculation
function testDamageCalculation() {
    const damage = calculateDamage(10, 5); // attack=10, defense=5
    console.assert(damage === 7.5, 'Damage calculation failed');
}
```

**Recommended Tools:**
- **No framework initially**: Use `console.assert()` for simple unit tests
- **Manual E2E testing**: Continue playthrough testing for integration
- **Test critical refactored modules first**: viewport, collision, combat

### Phase 3-4: Automated Testing (5,000+ lines)
When complexity increases, introduce proper testing framework:

**Unit Testing:**
```bash
npm install --save-dev vitest  # or jest
```
```javascript
// tests/combat.test.js
import { calculateDamage, checkCollision } from '../src/core/combat.js';

describe('Combat System', () => {
    it('should calculate damage correctly', () => {
        expect(calculateDamage(10, 5)).toBe(7.5);
        expect(calculateDamage(5, 10)).toBe(1); // minimum damage
    });
});
```

**Integration Testing:**
- Test multi-system interactions (combat + movement + collision)
- Test state management (room transitions, player progression)

**E2E Testing (Optional for 10,000+ lines):**
```bash
npm install --save-dev playwright  # or cypress
```
- Automated playthrough testing
- Visual regression testing
- Mobile touch interaction testing

### Testing During Refactoring
**Critical Rule:** Test before and after each refactoring step

1. **Baseline test**: Verify current behavior works
2. **Refactor**: Make code changes
3. **Regression test**: Confirm behavior unchanged
4. **Iterate**: Small steps, frequent testing

**Example Refactoring Workflow:**
```bash
# 1. Manual test current viewport behavior
# 2. Create feature branch: git checkout -b refactor/extract-viewport
# 3. Extract viewport code to viewport.js
# 4. Test viewport still works identically
# 5. Commit changes: git commit -m "Extract viewport to separate module"
# 6. Push and create PR for review
# 7. Move to next module
```

**Git Best Practices During Refactoring:**
- Create feature branches for each refactoring phase
- Commit after each successful extraction/migration
- Use descriptive commit messages: `refactor: extract Player class to separate module`
- Keep refactoring commits separate from feature/bug fix commits
- Test before pushing to ensure working state

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
