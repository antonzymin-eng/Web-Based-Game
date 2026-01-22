# Tab Targeting System - User Guide

## 🎯 What is Tab Targeting?

Tab targeting is a **tactical combat system** that allows you to select specific enemies to attack. Instead of hitting all nearby enemies at once, you can focus your attacks on a single target.

This MMO-style targeting system gives you more control over combat and allows for strategic decision-making.

---

## 🎮 How to Use Tab Targeting

### Desktop Controls

#### Selecting Targets

| Action | Control | Description |
|--------|---------|-------------|
| **Cycle Forward** | `Tab` | Select the next enemy |
| **Cycle Backward** | `Shift + Tab` | Select the previous enemy |
| **Direct Select** | `Click` on enemy | Click an enemy to target it directly |

#### Visual Indicators

When you have an enemy targeted, you'll see:
- **Gold Border** (🟡) around the enemy - Target is **in attack range** (< 45 pixels)
- **Orange Border** (🟠) around the enemy - Target is **out of range**
- **Chevron (▼)** above the enemy's head
- **Distance Text** (when out of range) - Shows exact distance to target

---

### Mobile/Touch Controls

#### Selecting Targets

| Action | Control | Description |
|--------|---------|-------------|
| **Cycle Targets** | Tap 🎯 button | Tap the gold target button to cycle through enemies |
| **Direct Select** | Tap enemy | Tap directly on an enemy sprite to select it |

#### Button Location

The target button (🎯) is located in the **bottom-right corner**, stacked above the attack button (⚔️):

```
                    🎯 ← Target Button
                    ⚔️ ← Attack Button

🕹️ ← Joystick
```

---

## ⚔️ Combat with Tab Targeting

### How Attacks Work

1. **Select a target** using Tab, click, or tap
2. **Move within range** (gold border = in range, orange = out of range)
3. **Press Space** (desktop) or **tap ⚔️** (mobile) to attack
4. Your attack will **only hit the selected enemy**

### Attack Range

- **Player Attack Range**: 45 pixels
- **Enemy Attack Range**: 35 pixels

💡 **Tip**: You have a longer attack range than enemies! Use this to "kite" them (attack while backing away).

---

## 🧠 Strategic Tips

### 1. Prioritize Dangerous Enemies

Use Tab targeting to focus on **strong enemies** (dark red) before dealing with weaker ones:

```
Strategy: Kill Orc (strong) → Kill Goblins (basic)
```

### 2. Divide and Conquer

When facing multiple enemies, select the **nearest one** to reduce incoming damage faster:

```
Nearest enemy dies faster → Fewer enemies attacking you
```

### 3. Use Range to Your Advantage

The **orange indicator** shows when you're out of range. Use this to:
- Reposition before attacking
- Avoid wasting attack cooldown
- Plan your approach

### 4. Kiting Technique

1. Select an enemy
2. Wait until it's in range (gold border)
3. Attack once
4. Back away while attack is on cooldown
5. Repeat

### 5. Quick Retargeting

When an enemy dies, the system **auto-selects the next nearest enemy**. You can continue attacking without manually retargeting!

---

## 📱 Mobile-Specific Tips

### Tap vs. Drag

The game distinguishes between tapping and dragging:
- **Quick tap on enemy** = Select target
- **Tap and drag** = Pan the camera

If you accidentally pan when trying to select, just tap more deliberately.

### Double-Tap Zoom

**Double-tapping** resets the zoom level. It will NOT select an enemy, so you can safely use double-tap zoom.

### Target Button vs. Tap-to-Select

- **Target Button** (🎯): Cycles through enemies in order
- **Tap on Enemy**: Directly selects that specific enemy

Use the method that feels most natural for your playstyle!

---

## ❓ Frequently Asked Questions

### Q: Can I still attack without selecting a target?

**A:** Yes! If no enemy is selected, the game will automatically select and attack the nearest enemy. Tab targeting is optional but recommended for tactical play.

---

### Q: What happens when my target dies?

**A:** The game automatically selects the next nearest enemy, so you can keep fighting without interruption.

---

### Q: Can I attack multiple enemies at once?

**A:** No. With tab targeting enabled, you can only damage the selected enemy. This is by design for tactical combat.

---

### Q: Why is the border orange instead of gold?

**A:** Orange means the enemy is **out of your attack range** (> 45 pixels away). Move closer until the border turns gold, then attack!

---

### Q: Do I need to retarget when moving between rooms?

**A:** No. When you enter a new room, the game automatically selects the nearest enemy for you.

---

### Q: Can I disable tab targeting?

**A:** Tab targeting is core to the combat system and cannot be disabled. However, it works automatically if you don't manually cycle targets.

---

### Q: What do the numbers above the enemy mean?

**A:** When the border is **orange** (out of range), a distance indicator shows how far away the enemy is (e.g., "78px"). Use this to judge if you need to move closer.

---

### Q: Why can't I select an enemy I'm clicking on?

**A:** Make sure you're:
1. Clicking directly on the enemy sprite (not near it)
2. Not dragging the mouse (clicks after drags are ignored)
3. Clicking on a **living** enemy (dead enemies can't be selected)

---

## 🎓 Advanced Techniques

### Room Clearing Rotation

Efficient room clearing pattern:
1. Enter room → Nearest enemy auto-selected
2. Attack until enemy dies → Next nearest auto-selected
3. Repeat until room clear

### Distance Management

Learn the exact ranges:
- **0-45px**: Gold border - Attack now!
- **45-75px**: Orange border - Move closer
- **75+px**: Very far - Consider repositioning

### Quick Retargeting

If you're fighting Enemy A but Enemy B is closer and dangerous:
1. Press `Tab` to cycle to Enemy B
2. Attack Enemy B
3. Press `Tab` again to return to Enemy A (if still alive)

---

## 🐛 Troubleshooting

### Issue: Tab key doesn't work

**Solution**: Make sure:
- The game canvas has focus (click on the game)
- You're not in a menu or dialog
- Your browser isn't intercepting Tab (try clicking the game first)

---

### Issue: Can't select enemy on mobile

**Solution**: Try:
- Tapping more precisely on the enemy center
- Using the 🎯 button to cycle instead
- Zooming in for easier tapping

---

### Issue: Target keeps changing unexpectedly

**Cause**: Enemies dying auto-selects the next target

**Solution**: This is intentional behavior. To maintain your selected target, avoid killing other enemies nearby.

---

### Issue: Visual indicator not showing

**Solution**:
- Make sure an enemy is actually selected (press Tab)
- Check if you're in a room with enemies
- Zoom in if the border is too thin to see

---

## 🎯 Quick Reference Card

```
┌─────────────────────────────────────┐
│     TAB TARGETING QUICK GUIDE       │
├─────────────────────────────────────┤
│ DESKTOP:                            │
│   Tab          → Next target        │
│   Shift+Tab    → Previous target    │
│   Click enemy  → Direct select      │
│                                     │
│ MOBILE:                             │
│   🎯 button    → Cycle targets      │
│   Tap enemy    → Direct select      │
│                                     │
│ INDICATORS:                         │
│   🟡 Gold      → In range (attack!) │
│   🟠 Orange    → Out of range       │
│   ▼ Chevron    → Target marker      │
│                                     │
│ COMBAT:                             │
│   Attack Range → 45 pixels          │
│   Auto-Select  → On enemy death     │
│   Damage       → Selected enemy only│
└─────────────────────────────────────┘
```

---

## 📖 Related Guides

- [Combat System](./COMBAT_GUIDE.md) - Learn about damage, defense, and cooldowns
- [Controls](../README.md#controls) - Full control reference
- [Gameplay Tips](../README.md#gameplay-tips) - General strategy advice

---

## 💬 Feedback

Found a bug or have a suggestion? Please report it on our [GitHub Issues](https://github.com/antonzymin-eng/Web-Based-Game/issues) page.

---

*Last Updated: 2026-01-22*
*Tab Targeting Version: 1.0*
