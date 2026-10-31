// src/core/Constants.js
// Master constants, room coordinates, shift configurations, impostor profiles, and cosmetics

const STORAGE_KEY = 'HOSPITAL_IMPOSTORS_SAVE_V1';

const IMPOSTOR_TYPES = {
  MIMIC: 'MIMIC',
  FACELESS: 'FACELESS',
  REPEATER: 'REPEATER',
  WRONG_PATIENT: 'WRONG_PATIENT',
  SILENT_ONE: 'SILENT_ONE',
  STALKER: 'STALKER',
  GLITCHED: 'GLITCHED',
  PERFECT: 'PERFECT'
};

const IMPOSTOR_LABELS = {
  [IMPOSTOR_TYPES.MIMIC]: 'Mimic',
  [IMPOSTOR_TYPES.FACELESS]: 'Faceless Patient',
  [IMPOSTOR_TYPES.REPEATER]: 'Repeater',
  [IMPOSTOR_TYPES.WRONG_PATIENT]: 'Wrong Patient',
  [IMPOSTOR_TYPES.SILENT_ONE]: 'Silent One',
  [IMPOSTOR_TYPES.STALKER]: 'Stalker',
  [IMPOSTOR_TYPES.GLITCHED]: 'Glitched Patient',
  [IMPOSTOR_TYPES.PERFECT]: 'Perfect Impostor'
};

const DANGER_LEVELS = {
  1: { level: 1, name: 'LEVEL 1: SUBTLE ANOMALIES', short: 'LEVEL 1: CALM', min: 0, max: 24, color: 'emerald', audio: 'calm' },
  2: { level: 2, name: 'LEVEL 2: INCREASING DISTURBANCES', short: 'LEVEL 2: UNEASY', min: 25, max: 49, color: 'amber', audio: 'uncanny' },
  3: { level: 3, name: 'LEVEL 3: MAJOR INCIDENT', short: 'LEVEL 3: HAZARD', min: 50, max: 74, color: 'orange', audio: 'uncanny' },
  4: { level: 4, name: 'LEVEL 4: CHASE EVENT', short: 'LEVEL 4: CRITICAL', min: 75, max: 100, color: 'red', audio: 'chase' }
};

const PATIENT_ROOMS = [
  { id: 'ROOM 001', number: '001', x: -14, z: 12, doorX: -14, doorZ: 8, bedX: -14, bedZ: 13.2, facing: 0, side: 'north' },
  { id: 'ROOM 002', number: '002', x: -20, z: 12, doorX: -20, doorZ: 8, bedX: -20, bedZ: 13.2, facing: 0, side: 'north' },
  { id: 'ROOM 003', number: '003', x: -26, z: 12, doorX: -26, doorZ: 8, bedX: -26, bedZ: 13.2, facing: 0, side: 'north' },
  { id: 'ROOM 004', number: '004', x: -14, z: 0, doorX: -14, doorZ: 4, bedX: -14, bedZ: -1.2, facing: Math.PI, side: 'south' },
  { id: 'ROOM 005', number: '005', x: -20, z: 0, doorX: -20, doorZ: 4, bedX: -20, bedZ: -1.2, facing: Math.PI, side: 'south' },
  { id: 'ROOM 006', number: '006', x: -26, z: 0, doorX: -26, doorZ: 4, bedX: -26, bedZ: -1.2, facing: Math.PI, side: 'south' }
];

const HOSPITAL_LOCATIONS = {
  RECEPTION: { id: 'RECEPTION', name: '1. Reception', short: 'RECEPTION', x: 0, y: 0, z: 22, sector: 'HALL', bounds: { minX: -5, maxX: 8, minZ: 16, maxZ: 26, y: 0 } },
  WAITING_ROOM: { id: 'WAITING_ROOM', name: '2. Waiting Room', short: 'WAITING', x: -10, y: 0, z: 22, sector: 'HALL', bounds: { minX: -15, maxX: -5, minZ: 16, maxZ: 26, y: 0 } },
  PATIENT_WARD: { id: 'PATIENT_WARD', name: '3. Patient Ward', short: 'WARD', x: -18, y: 0, z: 6, sector: 'WARD', bounds: { minX: -29, maxX: -10, minZ: -3, maxZ: 15, y: 0 } },
  EXAM_ROOM: { id: 'EXAM_ROOM', name: '4. Examination Room', short: 'EXAM', x: 14, y: 0, z: 12, sector: 'ER', bounds: { minX: 10, maxX: 18, minZ: 8, maxZ: 15, y: 0 } },
  TREATMENT_ROOM: { id: 'TREATMENT_ROOM', name: '5. Treatment Room', short: 'TREATMENT', x: 22, y: 0, z: 12, sector: 'ER', bounds: { minX: 18, maxX: 26, minZ: 8, maxZ: 15, y: 0 } },
  EMERGENCY_ROOM: { id: 'EMERGENCY_ROOM', name: '6. Emergency Room (ER)', short: 'ER', x: 20, y: 0, z: 0, sector: 'ER', bounds: { minX: 14, maxX: 26, minZ: -4, maxZ: 4, y: 0 } },
  NURSES_STATION: { id: 'NURSES_STATION', name: "7. Nurses' Station", short: 'NURSES', x: 0, y: 0, z: 6, sector: 'HALL', isSafeZone: true, bounds: { minX: -6, maxX: 6, minZ: 2, maxZ: 10, y: 0 } },
  CCTV_ROOM: { id: 'CCTV_ROOM', name: '8. CCTV Surveillance Room', short: 'CCTV', x: -8, y: 0, z: -8, sector: 'CCTV', isSafeZone: true, bounds: { minX: -12, maxX: -4, minZ: -11, maxZ: -5, y: 0 } },
  PHARMACY: { id: 'PHARMACY', name: '9. Pharmacy', short: 'PHARM', x: 14, y: 0, z: -8, sector: 'PHARM', bounds: { minX: 10, maxX: 20, minZ: -11, maxZ: -4, y: 0 } },
  STAFF_ROOM: { id: 'STAFF_ROOM', name: '10. Staff Room', short: 'STAFF', x: -8, y: 0, z: -15, sector: 'CCTV', bounds: { minX: -12, maxX: -4, minZ: -19, maxZ: -11, y: 0 } },
  STORAGE_ROOM: { id: 'STORAGE_ROOM', name: '11. Storage Room', short: 'STORAGE', x: 8, y: 0, z: -15, sector: 'PHARM', isSafeZone: true, bounds: { minX: 4, maxX: 12, minZ: -19, maxZ: -11, y: 0 } },
  HALLWAYS: { id: 'HALLWAYS', name: '12. Hospital Hallways', short: 'HALL', x: 0, y: 0, z: 12, sector: 'HALL', bounds: { minX: -10, maxX: 14, minZ: -19, maxZ: 16, y: 0 } },
  BASEMENT: { id: 'BASEMENT', name: '13. Basement & Breaker Room', short: 'WING', x: 0, y: -4, z: -24, sector: 'REST', bounds: { minX: -6, maxX: 8, minZ: -29, maxZ: -19, y: -4 } },
  RESTRICTED_WING: { id: 'RESTRICTED_WING', name: '14. Restricted Wing', short: 'WING', x: -14, y: -4, z: -24, sector: 'REST', bounds: { minX: -20, maxX: -6, minZ: -29, maxZ: -19, y: -4 } }
};

const CCTV_CAMERAS = [
  {
    id: 0,
    code: 'CAM 01',
    name: 'CAM 01: Patient Ward',
    sector: 'West Patient Ward (Rooms 001–006)',
    pos: { x: -10.2, y: 3.05, z: 6.0 },
    lookAt: { x: -24.0, y: 1.1, z: 6.0 },
    fov: 68
  },
  {
    id: 1,
    code: 'CAM 02',
    name: 'CAM 02: Emergency Room',
    sector: 'East Wing Trauma & ER Bays',
    pos: { x: 24.8, y: 3.05, z: 3.2 },
    lookAt: { x: 16.0, y: 1.0, z: -1.5 },
    fov: 68
  },
  {
    id: 2,
    code: 'CAM 03',
    name: 'CAM 03: Pharmacy Corridor',
    sector: 'East Clinical & Pharmacy Hall',
    pos: { x: 9.5, y: 3.05, z: 3.0 },
    lookAt: { x: 14.5, y: 1.0, z: -8.5 },
    fov: 68
  },
  {
    id: 3,
    code: 'CAM 04',
    name: 'CAM 04: Restricted Basement',
    sector: 'Lower Level Breaker & Quarantine Airlock',
    pos: { x: 6.5, y: -0.95, z: -20.2 },
    lookAt: { x: -10.0, y: -2.8, z: -24.5 },
    fov: 68
  }
];

const SHIFTS_CONFIG = [
  {
    shift: 1,
    title: 'SHIFT 1 — TRAINING',
    subtitle: 'Orientation & Basic Ward Verification',
    timeLimit: 480, // 08:00
    patientCount: 3,
    impostorCount: 1,
    allowedImpostors: [IMPOSTOR_TYPES.FACELESS, IMPOSTOR_TYPES.WRONG_PATIENT],
    allowRedHerrings: false,
    threatLevel: 'LOW',
    briefingSummary:
      'Welcome to night duty at St. Jude Memorial Hospital, Doctor. Your primary responsibility is to verify patient records at the Nurses\' Station, physically examine all 3 patients in Rooms 001–003, approve genuine patients, and quarantine the 1 infiltrated impostor before locking down the ward.',
    keyInstructions: [
      'Check the Master Patient Database at the central Nurses\' Station.',
      'Walk to the West Patient Ward (Rooms 001–003) and press [E] to open doors and examine patients.',
      'Click INVESTIGATE in the Dossier to scan Vitals, Morphology, Vocal Pattern, and Records before deciding.',
      'CONTAIN the 1 Impostor (requires logged discrepancy evidence) and APPROVE the 2 Genuine patients.',
      'Return to the Nurses\' Station and activate the Ward Security Lockdown Panel.'
    ],
    tasks: ['VERIFY_DATABASE', 'SECURE_WARD']
  },
  {
    shift: 2,
    title: 'SHIFT 2 — UNUSUAL BEHAVIOR',
    subtitle: 'Deceptive Symptoms & Surveillance Interference',
    timeLimit: 540, // 09:00
    patientCount: 4,
    impostorCount: 2,
    allowedImpostors: [IMPOSTOR_TYPES.REPEATER, IMPOSTOR_TYPES.MIMIC, IMPOSTOR_TYPES.SILENT_ONE],
    allowRedHerrings: true,
    threatLevel: 'MODERATE',
    briefingSummary:
      'New night admissions in Rooms 001–004 are exhibiting disturbing vocal and behavioral anomalies. Note that some genuine patients have documented medical fevers or tremors—always cross-check their Official Diagnosis before containing! Additionally, deliver prescribed medication from the Pharmacy and monitor CCTV feeds.',
    keyInstructions: [
      'Review the updated shift roster at the Nurses\' Station Master Terminal.',
      'Inspect the live camera feeds in the CCTV Surveillance Room (South Wing).',
      'Pick up patient medication from the Pharmacy dispensary and administer it in the Patient Ward.',
      'Examine all 4 patients (Rooms 001–004): Contain the 2 Impostors and Approve the 2 Genuine patients.',
      'Engage the Ward Security Lockdown Panel at the Nurses\' Station.'
    ],
    tasks: ['VERIFY_DATABASE', 'CHECK_CCTV', 'DELIVER_MEDICATION', 'SECURE_WARD']
  },
  {
    shift: 3,
    title: 'SHIFT 3 — SYSTEM FAILURE',
    subtitle: 'Electrical Blackout & Missing Records',
    timeLimit: 600, // 10:00
    patientCount: 5,
    impostorCount: 2,
    allowedImpostors: [IMPOSTOR_TYPES.STALKER, IMPOSTOR_TYPES.GLITCHED, IMPOSTOR_TYPES.WRONG_PATIENT],
    allowRedHerrings: true,
    threatLevel: 'HIGH',
    briefingSummary:
      'Severe electrical fluctuations are destabilizing the hospital grid, and a physical patient chart was left at the front Reception desk. Expect a main breaker overload mid-shift—use your Flashlight [F] to navigate down the South Stairwell into the Basement to flip the 3 breaker switches back online.',
    keyInstructions: [
      'Retrieve the misplaced Medical File from the North Reception Desk and deliver it to the Nurses\' Station.',
      'Recalibrate the corrupted surveillance feed in the CCTV Surveillance Room.',
      'Restore Hospital Power at the Basement Main Breaker Panel (Lower Level via South Stairwell).',
      'Examine all 5 patients (Rooms 001–005): Contain the 2 Impostors and Approve the 3 Genuine patients.',
      'Engage the Ward Security Lockdown Panel at the Nurses\' Station.'
    ],
    tasks: ['DELIVER_CHART', 'REPAIR_CCTV', 'RESTORE_BREAKER', 'SECURE_WARD'],
    scriptedBlackoutAtExamCount: 2
  },
  {
    shift: 4,
    title: 'SHIFT 4 — ADVANCED IMPOSTORS',
    subtitle: 'Deep Cover Entities & Multi-Clue Deduction',
    timeLimit: 660, // 11:00
    patientCount: 5,
    impostorCount: 3,
    allowedImpostors: [IMPOSTOR_TYPES.PERFECT, IMPOSTOR_TYPES.STALKER, IMPOSTOR_TYPES.MIMIC, IMPOSTOR_TYPES.REPEATER],
    forcePerfectImpostor: true,
    allowRedHerrings: true,
    threatLevel: 'VERY HIGH',
    briefingSummary:
      'Intelligence warns that a "Perfect Impostor" has infiltrated the ward alongside two other entities. Surface vitals on a Perfect Impostor appear completely normal—you must log at least 2 deep clues (CCTV Anomaly Evidence from CAM 01 + Vocal/Record timeline contradiction) to authorize containment.',
    keyInstructions: [
      'Pick up a Medical Supply Crate from the Storage Room and restock the Examination Room prep table.',
      'Use the CCTV Surveillance Console to spot and click "Log Camera Evidence" on CAM 01.',
      'Examine all 5 patients (Rooms 001–005) and uncover 2+ clues to identify the Perfect Impostor.',
      'Survive the Level 4 Corridor Incident by reaching a Safe Zone (Nurses\' Station, CCTV Room, or Storage Locker).',
      'Engage the Ward Security Lockdown Panel at the Nurses\' Station.'
    ],
    tasks: ['VERIFY_DATABASE', 'RESTOCK_SUPPLIES', 'LOG_CCTV_EVIDENCE', 'SECURE_WARD'],
    scriptedChaseAtContainCount: 2
  },
  {
    shift: 5,
    title: 'SHIFT 5 — OUTBREAK',
    subtitle: 'Facility Emergency & Restricted Wing Lockdown',
    timeLimit: 720, // 12:00
    patientCount: 6,
    impostorCount: 4,
    allowedImpostors: [
      IMPOSTOR_TYPES.PERFECT,
      IMPOSTOR_TYPES.GLITCHED,
      IMPOSTOR_TYPES.STALKER,
      IMPOSTOR_TYPES.SILENT_ONE,
      IMPOSTOR_TYPES.MIMIC
    ],
    forcePerfectImpostor: true,
    allowRedHerrings: true,
    threatLevel: 'CRITICAL',
    briefingSummary:
      'Full biohazard emergency. Six patients occupy Rooms 001–006, four of whom are high-grade impostors. Restore basement power, recalibrate CCTV, resolve all 6 patient cases, retrieve the Restricted Keycard at the Nurses\' Station, and descend into the Restricted Wing to seal the Central Containment Core.',
    keyInstructions: [
      'Restore the Basement Electrical Breaker and Recalibrate CCTV Surveillance.',
      'Examine all 6 patients (Rooms 001–006): Contain all 4 Impostors and Approve the 2 Genuine patients.',
      'Collect the Restricted Wing Keycard from the Nurses\' Station Authorization Rack.',
      'Unlock the Biohazard Airlock in the Basement and activate the Central Containment Core in the Restricted Wing.',
      'Survive the final Outbreak Chase and reach the Nurses\' Station Lockdown Terminal to complete the campaign!'
    ],
    tasks: ['RESTORE_BREAKER', 'REPAIR_CCTV', 'COLLECT_KEYCARD', 'ACTIVATE_CORE', 'SECURE_WARD'],
    startBlackout: true
  }
];

const COSMETICS_CATALOG = {
  uniform: [
    { id: 'standard_coat', name: 'Standard Physician Coat', sleeveColor: 0xf1f5f9, trimColor: 0x38bdf8, unlockText: 'Default Equipment' },
    { id: 'teal_scrubs', name: 'Teal Surgical Scrubs', sleeveColor: 0x0d9488, trimColor: 0x5eead4, unlockText: 'Complete Shift 1' },
    { id: 'chief_crimson', name: 'Biohazard Crimson-Gold Suit', sleeveColor: 0x7f1d1d, trimColor: 0xfbbf24, unlockText: 'Complete Shift 5' }
  ],
  gloves: [
    { id: 'latex_blue', name: 'Latex Medical Blue', color: 0x38bdf8, unlockText: 'Default Equipment' },
    { id: 'nitrile_white', name: 'Sterile Nitrile White', color: 0xe2e8f0, unlockText: 'Complete Shift 1' },
    { id: 'tactical_black', name: 'Containment Kevlar Black', color: 0x1e293b, unlockText: 'Complete Shift 5' }
  ],
  flashlight: [
    { id: 'tactical_black', name: 'Black Tactical Torch', bodyColor: 0x1e293b, ringColor: 0x94a3b8, unlockText: 'Default Equipment' },
    { id: 'rescue_amber', name: 'Amber Heavy-Duty Torch', bodyColor: 0xd97706, ringColor: 0xfef08a, unlockText: 'Complete Shift 3' },
    { id: 'golden_diag', name: 'Golden Diagnostic Torch', bodyColor: 0xeab308, ringColor: 0xffffff, unlockText: '100% Investigation Accuracy' }
  ],
  tablet: [
    { id: 'slate_standard', name: 'Standard Slate Tablet', bodyColor: 0x334155, screenTint: 0x0ea5e9, unlockText: 'Default Equipment' },
    { id: 'high_contrast', name: 'High-Contrast MedTab', bodyColor: 0x0f172a, screenTint: 0x10b981, unlockText: 'Complete Shift 3' },
    { id: 'holo_cyan', name: 'Holographic Cyan Frame', bodyColor: 0x0891b2, screenTint: 0x67e8f9, unlockText: '100% Investigation Accuracy' }
  ]
};

const ACHIEVEMENTS_LIST = [
  { id: 'FIRST_SHIFT', title: 'Licensed Intern', desc: 'Complete Shift 1: Training.', icon: 'fa-user-doctor' },
  { id: 'SHARP_EYE', title: 'Clinical Precision', desc: 'Complete any shift with 100% Investigation Accuracy.', icon: 'fa-eye' },
  { id: 'NIGHT_SURVIVOR', title: 'Escape Artist', desc: 'Survive a Level 4 Chase Event by reaching a Safe Zone.', icon: 'fa-person-running' },
  { id: 'POWER_ENGINEER', title: 'Grid Restorer', desc: 'Restore the Basement Electrical Breaker during a blackout.', icon: 'fa-bolt' },
  { id: 'PERFECT_HUNTER', title: 'Turing Test', desc: 'Identify and contain a Perfect Impostor.', icon: 'fa-biohazard' },
  { id: 'CHIEF_PHYSICIAN', title: 'Chief of Containment', desc: 'Complete Shift 5: Outbreak and seal the Restricted Wing.', icon: 'fa-medal' }
];
