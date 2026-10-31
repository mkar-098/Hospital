# Hospital Simulator: The Impostors

A single-player 3D medical investigation and psychological survival horror game built with Three.js, modular JavaScript (`src/`), precompiled Tailwind CSS, and procedural Web Audio synthesis.

## Quick Start

**Option 1 — Open Directly (`file://`):**
Double-click `index.html` or open `file:///path/to/Hospital/index.html` directly in any modern browser (all `src/` scripts and stylesheets are configured to load without `file://` CORS restrictions).

**Option 2 — Local HTTP Server (`http://`):**
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

## Controls

- **Move:** `W, A, S, D` or Arrow Keys (Mobile: Left Virtual Thumbstick)
- **Sprint / Run:** Hold `Shift` (Mobile: `RUN` button)
- **Look (360° First-Person):** Mouse Look (Pointer Lock on click or click-and-drag) / Mobile Right-Side Touch Drag
- **Interact / Open Door / Examine Patient:** `E` or HUD `INTERACT [E]` button
- **Flashlight Toggle:** `F` or HUD `Flashlight [F]` button (always available from Shift 1)
- **Quick CCTV Tablet:** `Tab` or `C` or HUD `CCTV [Tab]` button
- **Pause / Close Modal:** `Escape` or HUD `II` button

## Features

- **14 Interconnected 3D Hospital Locations:** Reception, Waiting Room, Patient Ward (`ROOM 001`–`ROOM 006` with hinged doors, room plaques, observation windows, and retractable Biohazard Containment Shutters), Examination Room, Treatment Room, Emergency Room (ER), Nurses' Station Safe Zone, CCTV Surveillance Room Safe Zone, Pharmacy, Staff Room, Storage Room (with hiding locker), Hospital Hallways, Basement & Breaker Room, and the Restricted Wing.
- **8 Impostor Types & Medical Red Herrings:** Mimic, Faceless Patient, Repeater, Wrong Patient, Silent One, Stalker, Glitched Patient, and Perfect Impostor—plus genuine medical red herrings (post-op fevers, concussion tremors, laryngitis whispers).
- **4-Decision Medical Dossier:** `INVESTIGATE` (4-step diagnostic scan), `APPROVE`, `CONTAIN` (requires logged discrepancy evidence), and `RELEASE` (reversible quarantine).
- **4-Channel Live 3D CCTV System:** Real secondary Three.js security cameras (`CAM 01`–`CAM 04`), 6 anomaly types, `Log Camera Evidence`, and `Recalibrate Signal`.
- **5 Campaign Shifts + Endless Wave Mode:** Full mission briefings, real-time objective checklist, 3D screen-space directional waypoints, 4-level danger escalation and chase survival, in-engine 3D cinematic success endings, earnable viewmodel/3D doctor cosmetics, and `localStorage` persistence.


link to page: https://hospital-1053615295105.us-west1.run.app
