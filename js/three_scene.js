/**
 * SheetFix 3D - Ultra-Clean Interactive 3D Spreadsheet Experience
 * Simple, dramatic, and satisfying: Messy vs. Clean Excel Spreadsheet.
 */

class SimpleSpreadsheet3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cells = [];
    this.bars = [];
    this.chaosTokens = [];
    this.cleanTokens = [];

    // Simple 0 (Messy) to 1 (Clean) progress
    this.cleanProgress = 1.0;
    this.targetClean = 1.0;
    this.isDragging = false;
    this.previousMouseX = 0;
    this.rotationY = 0.5;
    this.targetRotationY = 0.5;

    this.init();
    this.buildSheet();
    this.setupEvents();
    this.animate();
  }

  init() {
    const width = this.container.clientWidth || 700;
    const height = this.container.clientHeight || 450;

    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 7.5, 11);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Soft Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    this.keyLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    this.keyLight.position.set(8, 12, 8);
    this.scene.add(this.keyLight);

    this.greenLight = new THREE.PointLight(0x10b981, 2.5, 20);
    this.greenLight.position.set(-6, 8, 4);
    this.scene.add(this.greenLight);

    this.redWarningLight = new THREE.PointLight(0xef4444, 0, 20);
    this.redWarningLight.position.set(0, 4, 0);
    this.scene.add(this.redWarningLight);
  }

  buildSheet() {
    this.sheetGroup = new THREE.Group();
    this.scene.add(this.sheetGroup);

    // 4x5 Excel Grid
    const rows = 4;
    const cols = 5;
    const cellW = 1.3;
    const cellH = 0.25;
    const cellD = 1.0;
    const gap = 0.12;

    const startX = -((cols * (cellW + gap)) / 2) + cellW / 2;
    const startZ = -((rows * (cellD + gap)) / 2) + cellD / 2;

    const boxGeo = new THREE.BoxGeometry(cellW, cellH, cellD);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cleanX = startX + c * (cellW + gap);
        const cleanZ = startZ + r * (cellD + gap);

        const isHeader = (r === 0);
        const baseColor = isHeader ? 0x059669 : 0x1e293b;

        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.2
        });

        const cell = new THREE.Mesh(boxGeo, mat);
        cell.position.set(cleanX, 0, cleanZ);

        // Edge outlines
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: isHeader ? 0x34d399 : 0x38bdf8,
          transparent: true,
          opacity: 0.8
        });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        cell.add(wire);

        // Chaotic shattered coordinates
        const chaosAngle = Math.random() * Math.PI * 2;
        const chaosX = cleanX + (Math.random() - 0.5) * 1.8;
        const chaosY = (Math.random() - 0.5) * 1.4;
        const chaosZ = cleanZ + (Math.random() - 0.5) * 1.8;

        const chaosRotX = (Math.random() - 0.5) * 0.7;
        const chaosRotY = (Math.random() - 0.5) * 0.9;
        const chaosRotZ = (Math.random() - 0.5) * 0.7;

        cell.userData = {
          cleanPos: new THREE.Vector3(cleanX, 0, cleanZ),
          cleanRot: new THREE.Euler(0, 0, 0),
          chaosPos: new THREE.Vector3(chaosX, chaosY, chaosZ),
          chaosRot: new THREE.Euler(chaosRotX, chaosRotY, chaosRotZ),
          cleanColor: baseColor,
          chaosColor: 0x7f1d1d, // Dark burnt red
          isBroken: Math.random() > 0.5
        };

        this.sheetGroup.add(cell);
        this.cells.push(cell);
      }
    }

    // Add 3 Rising 3D Bar Chart Pillars in Clean Mode
    const barConfigs = [
      { x: startX + 1 * (cellW + gap), z: startZ + 2 * (cellD + gap), h: 2.2, color: 0x38bdf8 },
      { x: startX + 2 * (cellW + gap), z: startZ + 2 * (cellD + gap), h: 3.5, color: 0x10b981 },
      { x: startX + 3 * (cellW + gap), z: startZ + 2 * (cellD + gap), h: 2.8, color: 0x34d399 }
    ];

    barConfigs.forEach(conf => {
      const geo = new THREE.CylinderGeometry(0.35, 0.4, 1, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: conf.color,
        roughness: 0.2,
        metalness: 0.5
      });
      const bar = new THREE.Mesh(geo, mat);
      bar.position.set(conf.x, 0.5, conf.z);
      bar.userData = { targetHeight: conf.h };

      // Glowing white cap
      const capGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.5;
      bar.add(cap);

      this.sheetGroup.add(bar);
      this.bars.push(bar);
    });

    // Floating Error Tokens for Chaos Mode
    const errors = ['#REF!', '#DIV/0!', '#VALUE!', 'BROKEN!'];
    errors.forEach((txt, idx) => {
      const sprite = this.createLabel(txt, '#EF4444', 'rgba(239, 68, 68, 0.35)');
      const angle = (idx / errors.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 3.4, 1.8 + Math.sin(idx) * 0.6, Math.sin(angle) * 3.4);
      this.sheetGroup.add(sprite);
      this.chaosTokens.push(sprite);
    });

    // Floating Clean Badges for Clean Mode
    const cleanLabels = ['✓ 100% Clean', '✓ 0.1s Load Speed', '✓ Error-Free'];
    cleanLabels.forEach((txt, idx) => {
      const sprite = this.createLabel(txt, '#10B981', 'rgba(16, 185, 129, 0.35)');
      const angle = (idx / cleanLabels.length) * Math.PI * 2 + 0.8;
      sprite.position.set(Math.cos(angle) * 3.6, 2.6, Math.sin(angle) * 3.6);
      this.sheetGroup.add(sprite);
      this.cleanTokens.push(sprite);
    });
  }

  createLabel(text, color, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.9, 0.48, 1);
    return sprite;
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Simple Drag to Rotate
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.targetRotationY += deltaX * 0.008;
      this.previousMouseX = e.clientX;
    });

    // Touch support for mobile/tablets
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || !e.touches[0]) return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.targetRotationY += deltaX * 0.008;
      this.previousMouseX = e.touches[0].clientX;
    });
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setMode(mode) {
    if (mode === 'clean') {
      this.targetClean = 1.0;
      if (window.soundEngine) window.soundEngine.playChime();
    } else {
      this.targetClean = 0.0;
      if (window.soundEngine) window.soundEngine.playGlitch();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    // Smooth Morph
    this.cleanProgress += (this.targetClean - this.cleanProgress) * 0.09;

    // Smooth Rotation
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;
    if (!this.isDragging) {
      this.targetRotationY += 0.004; // subtle idle spin
    }
    if (this.sheetGroup) {
      this.sheetGroup.rotation.y = this.rotationY;
    }

    // Animate Cells
    this.cells.forEach(cell => {
      cell.position.lerpVectors(cell.userData.chaosPos, cell.userData.cleanPos, this.cleanProgress);
      cell.rotation.x = THREE.MathUtils.lerp(cell.userData.chaosRot.x, cell.userData.cleanRot.x, this.cleanProgress);
      cell.rotation.y = THREE.MathUtils.lerp(cell.userData.chaosRot.y, cell.userData.cleanRot.y, this.cleanProgress);
      cell.rotation.z = THREE.MathUtils.lerp(cell.userData.chaosRot.z, cell.userData.cleanRot.z, this.cleanProgress);

      if (cell.userData.isBroken) {
        const errCol = new THREE.Color(cell.userData.chaosColor);
        const clnCol = new THREE.Color(cell.userData.cleanColor);
        cell.material.color.lerpColors(errCol, clnCol, this.cleanProgress);
      }
    });

    // Animate Bars
    this.bars.forEach(bar => {
      const h = THREE.MathUtils.lerp(0.05, bar.userData.targetHeight, this.cleanProgress);
      bar.scale.y = h;
      bar.position.y = h / 2;
    });

    // Animate Floating Badges
    this.chaosTokens.forEach((tok, i) => {
      tok.visible = (this.cleanProgress < 0.7);
      tok.material.opacity = (1.0 - this.cleanProgress);
      tok.position.y += Math.sin(time * 2 + i) * 0.003;
    });

    this.cleanTokens.forEach((tok, i) => {
      tok.visible = (this.cleanProgress > 0.3);
      tok.material.opacity = this.cleanProgress;
      tok.position.y += Math.sin(time * 2 + i) * 0.003;
    });

    // Lights
    if (this.redWarningLight) {
      this.redWarningLight.intensity = (1.0 - this.cleanProgress) * 3.5;
    }
    if (this.greenLight) {
      this.greenLight.intensity = this.cleanProgress * 2.8;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.SimpleSpreadsheet3D = SimpleSpreadsheet3D;
