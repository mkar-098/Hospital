// src/core/SaveSystem.js

const DEFAULT_SAVE = {
  hasSaveData: false,
  highestUnlockedShift: 1,
  currentShift: 1,
  endlessUnlocked: false,
  bestEndlessHour: 0,
  shiftRecords: {}, // e.g., { 1: { grade: 'S', accuracy: 100, bestTime: 185 } }
  unlockedAchievements: [],
  unlockedCosmetics: ['standard_coat', 'latex_blue', 'tactical_black', 'slate_standard'],
  equippedCosmetics: {
    uniform: 'standard_coat',
    gloves: 'latex_blue',
    flashlight: 'tactical_black',
    tablet: 'slate_standard'
  },
  settings: {
    musicVol: 0.7,
    ambientVol: 0.75,
    sfxVol: 0.85,
    mouseSensitivity: 1.0,
    graphicsQuality: 'HIGH', // 'HIGH' | 'LOW'
    fov: 70
  }
};

class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      try {
        if (typeof window !== 'undefined' && window.name && window.name.startsWith(STORAGE_KEY + ':')) {
          raw = window.name.slice(STORAGE_KEY.length + 1);
        }
      } catch (_) {}
    }

    if (!raw) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        ...JSON.parse(JSON.stringify(DEFAULT_SAVE)),
        ...parsed,
        equippedCosmetics: {
          ...DEFAULT_SAVE.equippedCosmetics,
          ...(parsed.equippedCosmetics || {})
        },
        settings: {
          ...DEFAULT_SAVE.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  save() {
    const serialized = JSON.stringify(this.data);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (_) {
      try {
        if (typeof window !== 'undefined') {
          window.name = `${STORAGE_KEY}:${serialized}`;
        }
      } catch (_) {}
    }
  }

  markGameStarted(shift = 1) {
    this.data.hasSaveData = true;
    this.data.currentShift = shift;
    if (shift > this.data.highestUnlockedShift && shift <= 5) {
      this.data.highestUnlockedShift = shift;
    }
    this.save();
  }

  recordShiftCompletion(shiftNum, stats) {
    this.data.hasSaveData = true;
    const newRewards = [];

    if (shiftNum >= 1 && shiftNum < 5) {
      const nextShift = shiftNum + 1;
      if (nextShift > this.data.highestUnlockedShift) {
        this.data.highestUnlockedShift = nextShift;
        newRewards.push(`Unlocked Shift ${nextShift}`);
      }
      this.data.currentShift = nextShift;
    } else if (shiftNum === 5) {
      if (!this.data.endlessUnlocked) {
        this.data.endlessUnlocked = true;
        newRewards.push('Unlocked Endless Shift Mode');
      }
    }

    // Record best grade/accuracy/time
    const prev = this.data.shiftRecords[shiftNum];
    const gradeOrder = { S: 4, A: 3, B: 2, C: 1 };
    if (!prev || (gradeOrder[stats.grade] || 0) >= (gradeOrder[prev.grade] || 0)) {
      this.data.shiftRecords[shiftNum] = {
        grade: stats.grade,
        accuracy: Math.max(stats.accuracy, prev ? prev.accuracy : 0),
        timeUsed: stats.timeUsed
      };
    }

    // Unlock cosmetics by shift & accuracy
    if (shiftNum >= 1) {
      if (this.unlockCosmetic('teal_scrubs')) newRewards.push('Cosmetic: Teal Surgical Scrubs');
      if (this.unlockCosmetic('nitrile_white')) newRewards.push('Cosmetic: Sterile Nitrile White Gloves');
      if (this.unlockAchievement('FIRST_SHIFT')) newRewards.push('Achievement: Licensed Intern');
    }
    if (shiftNum >= 3) {
      if (this.unlockCosmetic('rescue_amber')) newRewards.push('Cosmetic: Amber Heavy-Duty Torch');
      if (this.unlockCosmetic('high_contrast')) newRewards.push('Cosmetic: High-Contrast MedTab');
    }
    if (shiftNum >= 5) {
      if (this.unlockCosmetic('chief_crimson')) newRewards.push('Cosmetic: Biohazard Crimson-Gold Suit');
      if (this.unlockCosmetic('tactical_black')) newRewards.push('Cosmetic: Containment Kevlar Gloves');
      if (this.unlockAchievement('CHIEF_PHYSICIAN')) newRewards.push('Achievement: Chief of Containment');
    }
    if (stats.accuracy === 100) {
      if (this.unlockCosmetic('golden_diag')) newRewards.push('Cosmetic: Golden Diagnostic Torch');
      if (this.unlockCosmetic('holo_cyan')) newRewards.push('Cosmetic: Holographic Cyan Tablet');
      if (this.unlockAchievement('SHARP_EYE')) newRewards.push('Achievement: Clinical Precision');
    }

    this.save();
    return newRewards;
  }

  recordEndlessHour(hour) {
    this.data.hasSaveData = true;
    if (hour > this.data.bestEndlessHour) {
      this.data.bestEndlessHour = hour;
    }
    this.save();
  }

  unlockCosmetic(id) {
    if (!this.data.unlockedCosmetics.includes(id)) {
      this.data.unlockedCosmetics.push(id);
      this.save();
      return true;
    }
    return false;
  }

  unlockAchievement(id) {
    if (!this.data.unlockedAchievements.includes(id)) {
      this.data.unlockedAchievements.push(id);
      this.save();
      return true;
    }
    return false;
  }

  equipCosmetic(category, id) {
    if (this.data.unlockedCosmetics.includes(id)) {
      this.data.equippedCosmetics[category] = id;
      this.save();
      return true;
    }
    return false;
  }

  updateSettings(partial) {
    this.data.settings = {
      ...this.data.settings,
      ...partial
    };
    this.save();
  }
}
