// src/entities/PatientGenerator.js
// Generates shift patient rosters, genuine medical red herrings, and all 8 impostor types

const PATIENT_PROFILES = [
  {
    name: 'Arthur Pendelton',
    gownColor: 0x38bdf8,
    hairColor: 0x64748b,
    skinColor: 0xf1c27d,
    biography: 'Retired clockmaker from Northwood; admitted after sudden visual aura.'
  },
  {
    name: 'Elena Rostova',
    gownColor: 0x34d399,
    hairColor: 0x451a03,
    skinColor: 0xfde68a,
    biography: 'Violinist at the city conservatory; admitted for overnight observation.'
  },
  {
    name: 'Marcus Vance',
    gownColor: 0x818cf8,
    hairColor: 0x1e293b,
    skinColor: 0xd97706,
    biography: 'Night warehouse supervisor; brought in by ambulance at 20:15.'
  },
  {
    name: 'Sarah Jenkins',
    gownColor: 0xf472b6,
    hairColor: 0x9a3412,
    skinColor: 0xfcd34d,
    biography: 'Elementary school teacher; recovering from scheduled laparoscopic procedure.'
  },
  {
    name: 'David Kim',
    gownColor: 0x2dd4bf,
    hairColor: 0x0f172a,
    skinColor: 0xfde047,
    biography: 'Graduate architecture student; suffered a minor fall on icy stairs.'
  },
  {
    name: 'Clara Oswald',
    gownColor: 0xa78bfa,
    hairColor: 0x78350f,
    skinColor: 0xfed7aa,
    biography: 'Botanical researcher; admitted for respiratory monitoring.'
  }
];

const GENUINE_TEMPLATES = [
  {
    isRedHerring: false,
    diagnosis: 'Acute Migraine',
    normalTemp: 36.6,
    expectedTempRange: '36.4–37.1 °C',
    currentTemp: '36.7 °C',
    facialSymmetry: 'Normal',
    vocalPattern: 'Coherent',
    motorFunction: 'Stable',
    medicalHistory: 'Admitted 19:30. History of cluster headaches; photophobia noted (squints at bright light).',
    behaviorNote: 'Resting quietly; shields eyes briefly when flashlight is aimed at face.',
    initialQuote: 'Good evening, Doctor. The headache is finally subsiding, though the hallway lights are bright.',
    questionResponse: 'My name and admission time match my chart. The nurse gave me a mild analgesic an hour ago.'
  },
  {
    isRedHerring: false,
    diagnosis: 'Asthma Observation',
    normalTemp: 36.6,
    expectedTempRange: '36.4–37.0 °C',
    currentTemp: '36.6 °C',
    facialSymmetry: 'Normal',
    vocalPattern: 'Coherent (Slight Wheeze)',
    motorFunction: 'Stable',
    medicalHistory: 'Admitted 20:10 after mild bronchospasm. Nebulizer treatment completed; vitals steady.',
    behaviorNote: 'Breathing steadily at 16 breaths/min; cooperative during examination.',
    initialQuote: 'Thank you for checking on me, Doctor. My breathing feels much clearer now.',
    questionResponse: 'I used my rescue inhaler before arriving at 20:10. Everything on my wristband is accurate.'
  },
  {
    isRedHerring: true,
    diagnosis: 'Post-Op Recovery (Mild Fever)',
    normalTemp: 36.7,
    expectedTempRange: '38.0–38.5 °C (Expected Post-Op)',
    currentTemp: '38.3 °C (Documented Post-Op)',
    facialSymmetry: 'Normal',
    vocalPattern: 'Coherent',
    motorFunction: 'Stable',
    medicalHistory: 'RED HERRING NOTE: Expected mild post-op fever 38.0–38.5 °C. Confirmed normal human physiology.',
    behaviorNote: 'Slightly warm forehead consistent with documented post-op surgical recovery.',
    initialQuote: 'Doctor, the surgeon mentioned I would run a mild 38.3 °C fever tonight after the procedure.',
    questionResponse: 'Yes, my chart explicitly notes the expected post-op temperature elevation. My incisions are healing well.'
  },
  {
    isRedHerring: true,
    diagnosis: 'Mild Concussion / Vertigo',
    normalTemp: 36.6,
    expectedTempRange: '36.4–37.1 °C',
    currentTemp: '36.8 °C',
    facialSymmetry: 'Normal',
    vocalPattern: 'Coherent',
    motorFunction: 'Mild Tremor (Documented Concussion)',
    medicalHistory: 'RED HERRING NOTE: Concussion hand tremor noted on admission. Reflexes and pupils normal.',
    behaviorNote: 'Slight hand tremor when reaching, completely explained by documented concussion.',
    initialQuote: 'The room spins a little when I sit up too fast, Doctor, and my hands are still a bit shaky.',
    questionResponse: 'I slipped on the steps at 19:45. The admitting physician documented my benign concussion tremor.'
  },
  {
    isRedHerring: true,
    diagnosis: 'Acute Laryngitis',
    normalTemp: 36.7,
    expectedTempRange: '36.5–37.2 °C',
    currentTemp: '36.9 °C',
    facialSymmetry: 'Normal',
    vocalPattern: 'Hoarse Whisper (Documented Laryngitis)',
    motorFunction: 'Stable',
    medicalHistory: 'RED HERRING NOTE: Vocal cord inflammation; patient speaks in a soft whisper but has normal pulse.',
    behaviorNote: 'Nods responsively and maintains warm 36.9 °C body temperature.',
    initialQuote: '(Whispers hoarsely) Sorry Doctor... my throat is inflamed so I can barely speak above a whisper.',
    questionResponse: '(Whispers) I have a cup of warm water right here. My pulse and temperature are completely normal.'
  }
];

class PatientGenerator {
  static generateRoster(shiftNum = 1, isEndless = false, endlessHour = 1) {
    let config;
    if (isEndless) {
      const pCount = Math.min(6, 4 + Math.floor(endlessHour / 2));
      const iCount = Math.min(pCount - 1, Math.max(2, Math.round(pCount * Math.min(0.8, 0.35 + endlessHour * 0.1))));
      config = {
        patientCount: pCount,
        impostorCount: iCount,
        allowedImpostors: Object.values(IMPOSTOR_TYPES),
        forcePerfectImpostor: endlessHour >= 2,
        allowRedHerrings: true
      };
    } else {
      config = SHIFTS_CONFIG[Math.max(0, Math.min(SHIFTS_CONFIG.length - 1, shiftNum - 1))];
    }

    const count = config.patientCount;
    const impostorCount = config.impostorCount;

    // Pick which room indices (0..count-1) are impostors
    const indices = Array.from({ length: count }, (_, i) => i);
    // Deterministic-friendly shuffle with variety
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const impostorIndices = new Set(indices.slice(0, impostorCount));

    // Assign impostor types
    const impostorTypeList = [];
    if (config.forcePerfectImpostor) {
      impostorTypeList.push(IMPOSTOR_TYPES.PERFECT);
    }
    while (impostorTypeList.length < impostorCount) {
      const pool = config.allowedImpostors;
      const pick = pool[impostorTypeList.length % pool.length];
      impostorTypeList.push(pick);
    }

    const patients = [];
    let impCursor = 0;

    for (let i = 0; i < count; i++) {
      const room = PATIENT_ROOMS[i];
      const profile = PATIENT_PROFILES[i % PATIENT_PROFILES.length];
      const isImpostor = impostorIndices.has(i);
      const impostorType = isImpostor ? impostorTypeList[impCursor++] : null;

      const patientNumber = 8041 + i;
      const officialId = `ID-${9100 + i * 37}-X`;

      // Select genuine template
      const genuinePool = config.allowRedHerrings
        ? GENUINE_TEMPLATES
        : GENUINE_TEMPLATES.filter((t) => !t.isRedHerring);
      const baseTpl = genuinePool[i % genuinePool.length];

      const patient = {
        index: i,
        patientNumber,
        name: profile.name,
        officialId,
        liveWristbandId: officialId,
        assignedRoom: room.id,
        actualRoom: room.id,
        diagnosis: baseTpl.diagnosis,
        normalTemp: baseTpl.normalTemp,
        expectedTempRange: baseTpl.expectedTempRange,
        medicalHistory: `${profile.biography} ${baseTpl.medicalHistory}`,
        isImpostor,
        impostorType,
        impostorLabel: impostorType ? IMPOSTOR_LABELS[impostorType] : 'Genuine Human',
        appearance: {
          gownColor: profile.gownColor,
          hairColor: profile.hairColor,
          skinColor: profile.skinColor
        },
        liveExam: {
          currentTemp: baseTpl.currentTemp,
          facialSymmetry: baseTpl.facialSymmetry,
          vocalPattern: baseTpl.vocalPattern,
          motorFunction: baseTpl.motorFunction,
          behaviorNote: baseTpl.behaviorNote,
          cctvSignature: 'Normal Ward Activity',
          initialQuote: baseTpl.initialQuote,
          questionResponse: baseTpl.questionResponse
        },
        anomalyCluesByStep: {
          vitals: null,
          morphology: null,
          vocal: null,
          records: null,
          cctv: null
        },
        investigation: {
          examinedOnce: false,
          scansCompleted: {
            vitals: false,
            morphology: false,
            vocal: false,
            records: false
          },
          cluesFound: [],
          requiredCluesToContain: impostorType === IMPOSTOR_TYPES.PERFECT ? 2 : 1
        },
        status: 'PENDING', // 'PENDING' | 'APPROVED' | 'CONTAINED'
        medicationNeeded: !isImpostor && i === 0
      };

      if (isImpostor) {
        this.applyImpostorOverrides(patient, impostorType, i);
      }

      patients.push(patient);
    }

    // If a MIMIC exists, copy another patient's appearance and biography so the duplication is unmistakable
    for (const p of patients) {
      if (p.isImpostor && p.impostorType === IMPOSTOR_TYPES.MIMIC) {
        const other = patients.find((o) => o.index !== p.index) || PATIENT_PROFILES[0];
        p.appearance = { ...(other.appearance || p.appearance) };
        p.liveExam.initialQuote = `"Hello Doctor. I am ${other.name}... wait, no, I mean ${p.name}."`;
        p.liveExam.questionResponse = `"${PATIENT_PROFILES[other.index || 0].biography}" (Verbatim copy of ${other.name}'s biography in ${other.assignedRoom}!)`;
        p.anomalyCluesByStep.vocal = `MIMIC VOCAL CLUE: Recited ${other.name}'s personal biography verbatim.`;
        p.anomalyCluesByStep.records = `MIMIC RECORD CLUE: Biometric/appearance duplicate of ${other.assignedRoom} (${other.name}).`;
      }
    }

    return patients;
  }

  static applyImpostorOverrides(p, type, idx) {
    switch (type) {
      case IMPOSTOR_TYPES.FACELESS:
        p.liveExam.facialSymmetry = 'SEVERE CRANIAL ANOMALY / FEATURELESS';
        p.liveExam.behaviorNote = 'Keeps head turned toward shadow; face lacks normal ocular/oral contours.';
        p.liveExam.initialQuote = '"Do not shine that light on my face, Doctor... my eyes are resting."';
        p.liveExam.questionResponse = '"Everyone looks the same in the dark, Doctor. Why do you keep staring?"';
        p.anomalyCluesByStep.morphology = 'MORPHOLOGY ANOMALY: Severe Cranial Anomaly — Face lacks human features.';
        break;

      case IMPOSTOR_TYPES.REPEATER:
        p.liveExam.motorFunction = 'REPETITIVE MECHANICAL LOOP (3.5s Cycle)';
        p.liveExam.vocalPattern = 'ECHOLALIA / NON-HUMAN FLAT CADENCE';
        p.liveExam.behaviorNote = 'Performs an identical neck-tilt and arm-twitch every 3.5 seconds.';
        p.liveExam.initialQuote = '"Check vitals and temperature. Check vitals and temperature. Good evening, Doctor."';
        p.liveExam.questionResponse = '"State your full name and symptoms... State your full name and symptoms..."';
        p.liveExam.cctvSignature = 'CAM 01: Synchronized mechanical looping posture';
        p.anomalyCluesByStep.morphology = 'MOTOR ANOMALY: Repetitive 3.5-second mechanical motor loop.';
        p.anomalyCluesByStep.vocal = 'VOCAL ANOMALY: Echolalia — repeats the Doctor\'s exact clinical prompts.';
        break;

      case IMPOSTOR_TYPES.WRONG_PATIENT:
        p.liveWristbandId = `ID-440${idx}-FORGED`;
        p.liveExam.behaviorNote = `Wristband reads ${p.liveWristbandId} (Contradicts Official ID ${p.officialId}).`;
        p.liveExam.initialQuote = '"Everything is fine, Doctor. You don\'t need to check the Nurses\' Station computer."';
        p.liveExam.questionResponse = `"My ID is ${p.liveWristbandId}... isn't that what your chart says?"`;
        p.anomalyCluesByStep.records = `RECORD MISMATCH: Wristband (${p.liveWristbandId}) contradicts Master Database (${p.officialId}).`;
        break;

      case IMPOSTOR_TYPES.SILENT_ONE:
        p.liveExam.currentTemp = '29.4 °C (HYPOTHERMIC / NO PULSE)';
        p.liveExam.vocalPattern = 'ABSOLUTE SILENCE ("...")';
        p.liveExam.motorFunction = 'Rigid / Zero Chest Respiration';
        p.liveExam.behaviorNote = 'Sits motionless staring directly at you with zero breathing movement.';
        p.liveExam.initialQuote = '"..." (Stares unblinking in dead silence)';
        p.liveExam.questionResponse = '"..." (Zero vocal response; 0 dB room audio reading)';
        p.liveExam.cctvSignature = 'CAM 01 Audio: 0 dB dead silence & motionless stare';
        p.anomalyCluesByStep.vitals = 'VITALS ANOMALY: Core temperature 29.4 °C with zero detectable pulse rhythm.';
        p.anomalyCluesByStep.vocal = 'VOCAL ANOMALY: Complete non-response and absence of respiration.';
        break;

      case IMPOSTOR_TYPES.STALKER:
        p.liveExam.motorFunction = 'PREDATORY GAZE TRACKING (Elevated Adrenaline)';
        p.liveExam.behaviorNote = 'Leaves bed toward doorway when unobserved; snaps back when looked at.';
        p.liveExam.initialQuote = '"I have been lying right here the entire time, Doctor. Why do you look nervous?"';
        p.liveExam.questionResponse = '"I never stood by the door window. Your security cameras must be malfunctioning."';
        p.liveExam.cctvSignature = 'CAM 01 Alert: Subject standing upright staring into corridor lens';
        p.anomalyCluesByStep.morphology = 'MOTOR ANOMALY: Predatory gaze tracking & elevated muscle tension.';
        p.anomalyCluesByStep.records = 'CCTV / RECORD ANOMALY: Subject caught out of bed stalking the ward door.';
        p.anomalyCluesByStep.cctv = 'CCTV EVIDENCE: CAM 01 captured subject standing at door when unobserved.';
        break;

      case IMPOSTOR_TYPES.GLITCHED:
        p.liveExam.currentTemp = '43.2 °C (IMPOSSIBLE BIOLOGICAL READING)';
        p.liveExam.facialSymmetry = 'INTERMITTENT VISUAL DISTORTION';
        p.liveExam.vocalPattern = 'Fragmented Static Modulation';
        p.liveExam.behaviorNote = 'Causes room lights to flicker violently; silhouette jitters.',
        p.liveExam.initialQuote = '"The l-l-lights keep flickering, Doctor... is my skin rendering properly?"';
        p.liveExam.questionResponse = '"43.2 degrees is warm... [STATIC BURST] ...I feel completely normal."';
        p.liveExam.cctvSignature = 'CAM 01 Alert: Heavy chromatic tear & signal distortion';
        p.anomalyCluesByStep.vitals = 'VITALS ANOMALY: Impossible 43.2 °C biological reading.';
        p.anomalyCluesByStep.morphology = 'MORPHOLOGY ANOMALY: Intermittent cranial & vertex distortion.';
        p.anomalyCluesByStep.cctv = 'CCTV EVIDENCE: Severe electromagnetic static & missing-figure tear on CAM 01.';
        break;

      case IMPOSTOR_TYPES.PERFECT:
        // Surface stats look completely normal! Requires 2 deep clues (Vocal + Records/CCTV)
        p.liveExam.currentTemp = '36.6 °C';
        p.liveExam.facialSymmetry = 'Normal';
        p.liveExam.vocalPattern = 'Polite, Measured & Coherent';
        p.liveExam.motorFunction = 'Stable';
        p.liveExam.behaviorNote = 'Surface vitals appear normal; requires deep Vocal & Database/CCTV cross-check.';
        p.liveExam.initialQuote = '"Good evening, Doctor. My vitals are 36.6 °C and my wristband matches my chart."';
        p.liveExam.questionResponse =
          '"I walked in through the front doors at 09:00 AM this morning." (CONTRADICTION: Admitted at 19:30 Night ER; Bloodwork flags non-human DNA!)';
        p.liveExam.cctvSignature = 'CAM 01 Anomaly: Unnatural shadow posture when unobserved';
        p.anomalyCluesByStep.vocal =
          'DEEP CLUE #1 (TIMELINE CONTRADICTION): Claimed 09:00 AM walk-in despite 19:30 night admission record.';
        p.anomalyCluesByStep.records =
          'DEEP CLUE #2 (DATABASE / CCTV ANOMALY): Lab bloodwork DNA mismatch & unnatural shadow on CAM 01.';
        p.anomalyCluesByStep.cctv =
          'DEEP CLUE #2 (CCTV EVIDENCE): CAM 01 logged unnatural shadow/posture when unobserved.';
        break;

      default:
        break;
    }
  }
}
