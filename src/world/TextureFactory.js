// src/world/TextureFactory.js
// Procedural HTML5 Canvas textures for hospital floors, walls, room plaques, monitors, and signage

class TextureFactory {
  static createTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle tile checkerboard
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1e293b' : '#192334';
        ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 22);
    return tex;
  }

  static createWallTexture(upperColor = '#334155', lowerColor = '#1e293b', stripeColor = '#0ea5e9') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Upper hospital wall
    ctx.fillStyle = upperColor;
    ctx.fillRect(0, 0, 256, 155);

    // Mid hospital bumper / handrail stripe
    ctx.fillStyle = stripeColor;
    ctx.fillRect(0, 155, 256, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 163, 256, 4);

    // Lower wainscot panel
    ctx.fillStyle = lowerColor;
    ctx.fillRect(0, 167, 256, 77);

    // Baseboard
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 244, 256, 12);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  static createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect((i * 37) % 256, (i * 73) % 256, 6, 6);
    }

    // Hazard stripe at bottom
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, 236, 256, 20);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createPlaqueTexture(title, subtitle = '', accent = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 192);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = accent;
    ctx.fillRect(16, 16, 16, 160);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 266, subtitle ? 76 : 96);

    if (subtitle) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(subtitle, 266, 134);
    }

    return new THREE.CanvasTexture(canvas);
  }

  static createMonitorTexture(title = 'VITAL SIGNS', line1 = 'HR: 74 BPM', line2 = 'TEMP: 36.7 C', color = '#10b981') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 160);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 152);

    ctx.fillStyle = color;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(title, 16, 30);

    // ECG waveform
    ctx.beginPath();
    ctx.moveTo(14, 75);
    const pts = [
      [50, 75],
      [62, 65],
      [72, 85],
      [84, 30],
      [96, 110],
      [108, 60],
      [122, 75],
      [165, 75],
      [178, 40],
      [190, 100],
      [202, 75],
      [240, 75]
    ];
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.stroke();

    ctx.font = '18px monospace';
    ctx.fillText(line1, 16, 122);
    ctx.fillText(line2, 16, 144);

    return new THREE.CanvasTexture(canvas);
  }

  static createShutterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 24) {
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, y, 256, 16);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, y + 16, 256, 8);
    }

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QUARANTINE', 128, 115);
    ctx.fillText('CONTAINED', 128, 150);

    return new THREE.CanvasTexture(canvas);
  }
}
