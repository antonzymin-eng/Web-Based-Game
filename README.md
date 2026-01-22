# Dungeon Crawler RPG

A browser-based dungeon crawler RPG with smooth touch controls, progressive difficulty, and engaging combat mechanics. Explore interconnected rooms, fight enemies, collect treasures, and level up your character.

## Features

- **Multi-platform Controls**: Full keyboard and touch/mobile support
- **Tab Targeting System**: MMO-style enemy targeting with range indicators ([Guide](.github/TAB_TARGETING_GUIDE.md))
- **Progressive Difficulty**: 3 interconnected rooms with increasing challenge
- **RPG Mechanics**: Level-up system with stat growth (HP, Attack, Defense)
- **Enemy Variety**: Basic and strong enemy types with distinct behaviors
- **Loot System**: Chests with randomized rewards (health potions, XP, gold)
- **Advanced Camera**: Smooth zoom (50%-300%), pan, and player-follow modes
- **Touch Optimization**: Virtual joystick, pinch-to-zoom, and drag controls
- **Visual Feedback**: Particle effects, health bars, damage indicators
- **Persistent Progress**: Track enemies defeated, chests opened, and room progression

## How to Play

### Objective
Navigate through three interconnected dungeon rooms, defeat enemies, collect treasures, and level up your character. Progress through doors to reach new areas with tougher challenges.

### Controls

#### Desktop (Keyboard + Mouse)
- **Movement**: Arrow Keys or WASD
- **Attack**: Space or Enter
- **Target Enemy**: Tab (next), Shift+Tab (previous), or Click enemy
- **Zoom**: Mouse wheel
- **Pan Camera**: Click and drag on canvas
- **Reset View**: Double-click canvas
- **Stats Menu**: Click "Stats" button

#### Mobile (Touch)
- **Movement**: Virtual joystick (bottom-left)
- **Attack**: Attack button (⚔️, bottom-right)
- **Target Enemy**: Target button (🎯, above attack) or Tap enemy
- **Zoom**: Pinch gesture on canvas
- **Pan Camera**: Drag canvas with one finger
- **Reset View**: Double-tap canvas
- **Stats Menu**: Tap "Stats" button

### Gameplay Tips
- **Tab Targeting**: Use Tab to select specific enemies - gold border = in range, orange = out of range
- **Range Advantage**: Your attack range (45px) exceeds enemy range (35px) - use it!
- **Kiting**: Move away while attacking to avoid damage
- **Prioritize Threats**: Focus on strong enemies (dark red) first with tab targeting
- **Defense Scaling**: Defense reduces damage by half its value
- **Strategic Healing**: Save chest health potions for when you need them
- **Level Curve**: Each level requires 50% more XP than the previous
- **Camera Follow**: Green indicator = camera follows player, Orange = manual mode

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools, frameworks, or dependencies required - pure vanilla JavaScript

### Installation

1. Clone the repository:
```bash
git clone https://github.com/antonzymin-eng/Web-Based-Game.git
cd Web-Based-Game
```

2. Open in browser:
```bash
# Option 1: Local server (recommended)
python3 -m http.server 8000  # or use 'python' if python3 is not available
# Then visit: http://localhost:8000

# Option 2: Direct file
# Simply double-click index.html in your file browser
# Or use: open index.html (macOS), start index.html (Windows), xdg-open index.html (Linux)
```

### Playing on Mobile
- Transfer files to a web server or use local network access
- Ensure browser is in landscape mode for best experience
- Use full-screen mode for optimal gameplay

## Game Mechanics

### Player Stats
| Stat | Level 1 | Per Level Up |
|------|---------|--------------|
| Max Health | 100 | +20 |
| Attack | 10 | +5 |
| Defense | 5 | +2 |
| Speed | 3 px/frame | - |

### Enemy Types
| Type | Health | Attack | Defense | XP Reward |
|------|--------|--------|---------|-----------|
| Basic | 30 | 8 | 2 | 25 |
| Strong | 60 | 15 | 5 | 50 |

### Chest Rewards
- 30% chance: Health Potion (+30 HP)
- 30% chance: XP Bonus (+50 XP)
- 40% chance: Gold (25-75 gold, directly converted to XP)

### Combat System
- **Damage Formula**: `damage = attacker.attack - (defender.defense / 2)` (minimum 1)
- **Attack Cooldown**:
  - Player: 0.5 seconds between attacks
  - Enemies: 1.0 seconds between attacks
- **Invulnerability**: 1 second after taking damage (with visual flash)
- **Death**: Health reaches 0, game restarts after 2 seconds

## Room Layout

1. **Room 1 (Starting Area)**: 2 basic enemies, 1 chest, tutorial-level difficulty
2. **Room 2 (Mid-Game)**: 2 basic + 1 strong enemy, 1 chest, wall obstacles
3. **Room 3 (Challenge)**: 2 strong enemies, 2 chests, final challenge

Progress through doors (golden passages) to advance between rooms.

## Development

For development roadmap, architecture plans, and refactoring guidelines, see [DEVELOPMENT.md](.github/DEVELOPMENT.md).

**Current Status:**
- Lines of Code: 1,329 in game.js (approaching 1,500-line modularization threshold per roadmap)
- Architecture: Single-file JavaScript - clean and maintainable at current scale
- Production Status: Feature-complete for current scope

### Quick Start for Developers
```bash
# No build process required - edit and reload
# Main game logic: game.js
# Styles: styles.css
# HTML structure: index.html
```

## Technical Highlights

- **Pure Vanilla JavaScript**: No frameworks or dependencies - zero external libraries
- **Canvas Rendering**: 60 FPS via `requestAnimationFrame`
- **Responsive Design**: Adapts to desktop and mobile viewports
- **Smart Camera**: Smooth interpolation with boundary clamping
- **Grid-based Collision**: Efficient wall and entity collision detection
- **State Management**: Centralized game state for easy expansion

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- Mobile browsers: Optimized for touch

## Contributing

Contributions are welcome! See development roadmap in [DEVELOPMENT.md](.github/DEVELOPMENT.md) for architecture plans and refactoring guidelines.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with vanilla JavaScript and Canvas API. Designed for both casual play and learning game development fundamentals.

---

**Status**: Feature-complete with active maintenance
