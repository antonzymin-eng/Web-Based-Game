# Tab Targeting System - Test Plan

## Test Environment
- **Browser**: Chrome 120+, Firefox 120+, Safari 17+
- **Devices**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Test Date**: 2026-01-22

---

## 🧪 Functional Tests

### Test Suite 1: Target Selection

#### Test 1.1: Auto-Select on Room Entry
**Objective**: Verify nearest enemy is auto-selected when entering a room

**Steps**:
1. Start new game
2. Enter Room 1
3. Observe enemy selection

**Expected**:
- ✅ Nearest enemy has gold border
- ✅ Gold chevron appears above enemy
- ✅ Message shows "Target: Goblin" (or "Orc" depending on enemy type)

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 1.2: Tab Key Cycling (Forward)
**Objective**: Verify Tab key cycles to next enemy

**Steps**:
1. Enter room with 2+ enemies
2. Note currently selected enemy
3. Press Tab
4. Observe selection changes

**Expected**:
- ✅ Selection moves to next enemy in array
- ✅ Visual indicator updates to new enemy
- ✅ Message displays "Target: [enemy type] ([distance]px)"

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 1.3: Shift+Tab Cycling (Backward)
**Objective**: Verify Shift+Tab cycles to previous enemy

**Steps**:
1. Enter room with 2+ enemies
2. Press Tab to cycle forward twice
3. Press Shift+Tab once
4. Observe selection

**Expected**:
- ✅ Selection moves to previous enemy
- ✅ Wraps around from first to last enemy
- ✅ Message displays updated target

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 1.4: Click to Select (Desktop)
**Objective**: Verify clicking enemy selects it

**Steps**:
1. Enter room with 2+ enemies
2. Click on non-selected enemy
3. Observe selection

**Expected**:
- ✅ Clicked enemy becomes selected
- ✅ Visual indicator moves to clicked enemy
- ✅ Message shows "Target: [enemy type]"

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 1.5: Tap to Select (Mobile)
**Objective**: Verify tapping enemy on touchscreen selects it

**Steps**:
1. Open game on mobile device
2. Tap directly on enemy sprite
3. Observe selection

**Expected**:
- ✅ Tapped enemy becomes selected
- ✅ Visual feedback appears
- ✅ No accidental drag/zoom triggered

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 1.6: Target Button (Mobile)
**Objective**: Verify mobile target button cycles targets

**Steps**:
1. Open game on mobile device
2. Tap 🎯 target button
3. Observe selection changes

**Expected**:
- ✅ Target cycles to next enemy
- ✅ Button provides tactile feedback
- ✅ Message displays target info

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 2: Visual Feedback

#### Test 2.1: Range Indicator (In Range)
**Objective**: Verify gold color when enemy is in attack range

**Steps**:
1. Move within 45px of selected enemy
2. Observe target indicator color

**Expected**:
- ✅ Border and chevron are gold (#FFD700)
- ✅ No distance text appears
- ✅ Visual is clear and visible

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 2.2: Range Indicator (Out of Range)
**Objective**: Verify orange color when enemy is out of attack range

**Steps**:
1. Move >45px away from selected enemy
2. Observe target indicator color

**Expected**:
- ✅ Border and chevron are orange (#FFA500)
- ✅ Distance text appears above enemy (e.g., "78px")
- ✅ Color clearly distinguishable from gold

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 2.3: Visual with Zoom
**Objective**: Verify targeting visuals scale correctly with zoom

**Steps**:
1. Select enemy
2. Zoom in to 200%
3. Zoom out to 50%
4. Observe visual clarity

**Expected**:
- ✅ Border thickness scales proportionally
- ✅ Chevron remains visible at all zoom levels
- ✅ Distance text readable at 100%+ zoom

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 3: Combat Integration

#### Test 3.1: Attack Selected Target Only
**Objective**: Verify attacks only hit selected enemy

**Steps**:
1. Enter room with 2+ enemies close together
2. Stand within range of both enemies
3. Select one enemy with Tab
4. Press Space to attack
5. Observe damage

**Expected**:
- ✅ Only selected enemy takes damage
- ✅ Other nearby enemies unaffected
- ✅ Damage particles appear on selected enemy only

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 3.2: Attack Out of Range
**Objective**: Verify attack fails when target is out of range

**Steps**:
1. Select enemy
2. Move >45px away (orange indicator)
3. Press Space to attack
4. Observe result

**Expected**:
- ✅ No damage dealt
- ✅ Attack animation plays
- ✅ No error messages

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 3.3: Auto-Retarget on Enemy Death
**Objective**: Verify next enemy is auto-selected when target dies

**Steps**:
1. Select enemy with low health
2. Attack until enemy dies
3. Observe target selection

**Expected**:
- ✅ Next nearest enemy auto-selected
- ✅ Visual indicator moves to new target
- ✅ Combat can continue without manual retargeting

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 3.4: Attack with No Target
**Objective**: Verify fallback behavior when no target selected

**Steps**:
1. Manually set `gameState.selectedEnemy = null` via console
2. Stand near enemies
3. Press Space to attack

**Expected**:
- ✅ Nearest enemy auto-selected
- ✅ Attack hits auto-selected enemy
- ✅ System recovers gracefully

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 4: Edge Cases

#### Test 4.1: No Enemies in Room
**Objective**: Verify targeting handles empty enemy array

**Steps**:
1. Clear all enemies from room
2. Press Tab
3. Observe behavior

**Expected**:
- ✅ No crash or error
- ✅ Message shows "No targets available"
- ✅ `gameState.selectedEnemy` is null

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 4.2: Single Enemy in Room
**Objective**: Verify Tab cycling with only one enemy

**Steps**:
1. Enter room with 1 enemy
2. Press Tab multiple times

**Expected**:
- ✅ Same enemy remains selected
- ✅ No error or crash
- ✅ Message updates each press

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 4.3: Overlapping Enemies
**Objective**: Verify click/tap selection with overlapping enemies

**Steps**:
1. Position two enemies at same coordinates
2. Click/tap on overlapping position
3. Observe which enemy is selected

**Expected**:
- ✅ One enemy deterministically selected (first in array)
- ✅ No crash or flicker
- ✅ Can cycle with Tab to select other

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 4.4: Target Dies During Attack Animation
**Objective**: Verify system handles enemy death mid-attack

**Steps**:
1. Attack enemy with exactly 1 HP remaining
2. Trigger simultaneous attack from player
3. Observe behavior

**Expected**:
- ✅ No crash or error
- ✅ Auto-retargeting works correctly
- ✅ No duplicate death particles

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 4.5: Rapid Tab Spamming
**Objective**: Verify system handles rapid input

**Steps**:
1. Enter room with 3+ enemies
2. Rapidly press Tab 20+ times
3. Observe performance and correctness

**Expected**:
- ✅ No lag or stutter
- ✅ Selection updates correctly
- ✅ No messages flood screen

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 4.6: Room Transition with Active Target
**Objective**: Verify target resets on room change

**Steps**:
1. Select enemy in Room 1
2. Walk through door to Room 2
3. Observe target selection

**Expected**:
- ✅ New enemy in Room 2 auto-selected
- ✅ Previous target cleared
- ✅ No reference to Room 1 enemies

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 5: Mobile-Specific Tests

#### Test 5.1: Tap vs Drag Distinction
**Objective**: Verify tap-to-select doesn't trigger on drag

**Steps**:
1. Touch enemy and drag (pan viewport)
2. Release touch
3. Observe enemy selection

**Expected**:
- ✅ Enemy NOT selected (drag threshold exceeded)
- ✅ Viewport panned correctly
- ✅ No unintended target changes

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 5.2: Pinch Zoom Doesn't Affect Targeting
**Objective**: Verify pinch-zoom doesn't trigger target selection

**Steps**:
1. Pinch to zoom over enemy
2. Release pinch
3. Observe target selection

**Expected**:
- ✅ Target unchanged (unless intentionally selected)
- ✅ Zoom works correctly
- ✅ No accidental selections

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 5.3: Double-Tap Zoom Reset
**Objective**: Verify double-tap doesn't select enemies

**Steps**:
1. Double-tap on enemy to reset zoom
2. Observe target selection

**Expected**:
- ✅ Zoom resets correctly
- ✅ Enemy NOT selected (double-tap detection prevents it)
- ✅ No targeting conflicts

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 5.4: Button Overlap (Small Screens)
**Objective**: Verify UI doesn't overlap on small screens (<375px)

**Steps**:
1. Open game on device with 375px or smaller width
2. Check button positioning
3. Test all buttons functional

**Expected**:
- ✅ Target and attack buttons don't overlap
- ✅ Buttons don't overlap with joystick
- ✅ All buttons remain accessible

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 6: Performance Tests

#### Test 6.1: Target Selection Performance (10 Enemies)
**Objective**: Verify selectNearestEnemy() is fast with typical enemy count

**Steps**:
1. Spawn 10 enemies
2. Call selectNearestEnemy() 100 times
3. Measure execution time

**Expected**:
- ✅ Average time < 1ms per call
- ✅ No visible lag
- ✅ Consistent performance

**Benchmark**: ~0.2ms per call (optimized)

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 6.2: Enemy Draw Performance (Range Check)
**Objective**: Verify range indicator doesn't cause FPS drop

**Steps**:
1. Spawn 5 enemies
2. Select one enemy
3. Monitor FPS for 10 seconds

**Expected**:
- ✅ Maintains 60 FPS
- ✅ No stuttering
- ✅ Range indicator updates smoothly

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### Test Suite 7: Cross-Browser Compatibility

#### Test 7.1: Chrome/Edge (Chromium)
**Objective**: Verify all features work in Chrome/Edge

**Browser Version**: 120+

**Steps**:
1. Run all functional tests
2. Check visual rendering
3. Test touch emulation (DevTools)

**Expected**:
- ✅ All features functional
- ✅ Visuals render correctly
- ✅ No console errors

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 7.2: Firefox
**Objective**: Verify all features work in Firefox

**Browser Version**: 120+

**Steps**:
1. Run all functional tests
2. Check visual rendering
3. Test responsive touch events

**Expected**:
- ✅ All features functional
- ✅ Visuals render correctly
- ✅ No console errors

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 7.3: Safari (Desktop)
**Objective**: Verify all features work in Safari desktop

**Browser Version**: 17+

**Steps**:
1. Run all functional tests
2. Check visual rendering
3. Test WebKit-specific behaviors

**Expected**:
- ✅ All features functional
- ✅ Visuals render correctly
- ✅ No console errors

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

#### Test 7.4: Safari (iOS)
**Objective**: Verify all features work on iOS Safari

**iOS Version**: 15+

**Steps**:
1. Test tap-to-select on real device
2. Test target button
3. Check safe area insets

**Expected**:
- ✅ Touch events work correctly
- ✅ Buttons positioned correctly (safe areas)
- ✅ Visuals crisp on Retina display

**Status**: ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## 🐛 Known Issues

### Issue #1: Distance Text Overlaps Health Bar
**Severity**: Low
**Impact**: Distance text can overlap enemy health bar on small enemies
**Workaround**: Adjust text Y position
**Status**: 🔧 To Fix

---

## 📊 Test Summary

| Test Suite | Total Tests | Passed | Failed | Not Tested |
|-----------|-------------|--------|--------|------------|
| Target Selection | 6 | 0 | 0 | 6 |
| Visual Feedback | 3 | 0 | 0 | 3 |
| Combat Integration | 4 | 0 | 0 | 4 |
| Edge Cases | 6 | 0 | 0 | 6 |
| Mobile-Specific | 4 | 0 | 0 | 4 |
| Performance | 2 | 0 | 0 | 2 |
| Cross-Browser | 4 | 0 | 0 | 4 |
| **TOTAL** | **29** | **0** | **0** | **29** |

---

## 🚀 Testing Checklist

### Pre-Release Testing (Required)
- [ ] Test Suite 1: Target Selection (all tests)
- [ ] Test Suite 2: Visual Feedback (all tests)
- [ ] Test Suite 3: Combat Integration (all tests)
- [ ] Test Suite 4.1-4.3: Critical edge cases
- [ ] Test Suite 5.1: Tap vs drag distinction
- [ ] Test 7.1: Chrome compatibility

### Post-Release Testing (Recommended)
- [ ] Remaining Test Suite 4: Edge cases
- [ ] Remaining Test Suite 5: Mobile tests
- [ ] Test Suite 6: Performance benchmarks
- [ ] Test 7.2-7.4: Multi-browser testing

### Regression Testing (On Future Updates)
- [ ] Test 1.2: Tab cycling
- [ ] Test 2.2: Range indicator
- [ ] Test 3.1: Target-only attacks
- [ ] Test 3.3: Auto-retarget on death

---

## 📝 Test Execution Instructions

### Manual Testing Steps
1. Clone repository and checkout branch
2. Open `index.html` in browser
3. Open browser DevTools console
4. Execute test steps from each test case
5. Record results (✅ Pass / ❌ Fail)
6. Document any issues found

### Automated Testing (Future)
```javascript
// Example: Automated test for selectNearestEnemy
describe('Tab Targeting', () => {
    it('should select nearest enemy', () => {
        const enemy1 = new Enemy(100, 100, 'basic');
        const enemy2 = new Enemy(200, 200, 'basic');
        gameState.enemies = [enemy1, enemy2];
        player.x = 90;
        player.y = 90;

        selectNearestEnemy();

        expect(gameState.selectedEnemy).toBe(enemy1);
    });
});
```

---

*Test Plan Version: 1.0*
*Last Updated: 2026-01-22*
