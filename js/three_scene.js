/**
 * GridCraft 3D - Interactive WebGL Spreadsheet Monolith
 * Built with Three.js. Supports Chaos vs Pristine Morphing, Layer Explosion,
 * 3D Bar Chart Pillars, Formula Energy Conduits, and Mouse Parallax.
 */

class Spreadsheet3DScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // State Variables
    this.state = 'pristine'; // 'pristine' | 'chaos'
    this.viewMode = 'unified'; // 'unified' | 'exploded' | 'wireframe'
    this.morphProgress = 1.0; // 0 = complete chaos, 1 = complete pristine
    this.targetMorph = 1.0;
    this.explodeProgress = 0.0; // 0 = unified, 1 = fully exploded
    this.targetExplode = 0.0;
    this.isAutoRotating = true;
    this.hoveredCell = null;

    // Object Collections
    this.layers = [];
    this.cells = [];
    this.barPillars = [];
    this.chaosBadges = [];
    this.pristineBadges = [];
    this.conduitCurves = [];
    this.particleSystem = null;

    this.init();
    this.buildWorld();
    this.setupEvents();
    this.animate();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 550;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060911);
    this.scene.fog = new THREE.FogExp2(0x060911, 0.025);

    // Camera - Isometric 45° Perspective
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.setCameraPreset('isometric');

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (typeof THREE.OrbitControls === 'function') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2.1;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 28;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    this.scene.add(ambientLight);

    this.keyLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    this.keyLight.position.set(12, 18, 14);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.emeraldLight = new THREE.SpotLight(0x10b981, 3.5, 30, Math.PI / 4, 0.3);
    this.emeraldLight.position.set(-10, 15, -8);
    this.scene.add(this.emeraldLight);

    this.rubyWarningLight = new THREE.PointLight(0xef4444, 0.0, 15);
    this.rubyWarningLight.position.set(0, 3, 0);
    this.scene.add(this.rubyWarningLight);
  }

  buildWorld() {
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // 1. Floating Particle Grid in Background
    this.createBackgroundParticles();

    // 2. Build 4 Spreadsheet Architectural Layers
    // Layer 0: Raw Ingestion Base (Charcoal Slate)
    // Layer 1: Data Normalization (Emerald Glass)
    // Layer 2: Formula & Logic Pipeline (Cyan Obsidian)
    // Layer 3: Executive KPI Dashboard (Elevated 3D Bar Columns)
    this.createLayer(0, -1.2, 'Raw Data Ingestion & Sanitizer', 0x1e293b, 0x334155);
    this.createLayer(1, -0.4, 'Normalization & Schema Modeling', 0x064e3b, 0x10b981);
    this.createLayer(2, 0.4, 'Formula & Automation Pipeline', 0x0c4a6e, 0x0284c7);
    this.createLayer(3, 1.2, 'Executive 3D KPI Dashboard', 0x0f172a, 0x34d399, true);

    // 3. Build Floating 3D Error / Chaos Badges
    this.createErrorBadges();

    // 4. Build Floating 3D Metric / Pristine Badges
    this.createPristineBadges();

    // 5. Build Formula Energy Conduits
    this.createFormulaConduits();
  }

  createBackgroundParticles() {
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 36;
      positions[i + 1] = (Math.random() - 0.5) * 24;
      positions[i + 2] = (Math.random() - 0.5) * 36;

      const isEmerald = Math.random() > 0.5;
      colors[i] = isEmerald ? 0.06 : 0.02;
      colors[i + 1] = isEmerald ? 0.72 : 0.52;
      colors[i + 2] = isEmerald ? 0.5 : 0.96;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  createLayer(layerIndex, baseHeight, title, fillColor, edgeColor, isTopKPI = false) {
    const layerGroup = new THREE.Group();
    layerGroup.userData = {
      index: layerIndex,
      baseY: baseHeight,
      explodedY: (layerIndex - 1.5) * 3.8,
      title: title
    };
    layerGroup.position.y = baseHeight;

    const gridSize = 5;
    const cellWidth = 1.1;
    const cellSpacing = 0.15;
    const totalSpan = (gridSize * cellWidth) + ((gridSize - 1) * cellSpacing);
    const startOffset = -totalSpan / 2 + cellWidth / 2;

    const boxGeo = new THREE.BoxGeometry(cellWidth, 0.28, cellWidth);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const posX = startOffset + c * (cellWidth + cellSpacing);
        const posZ = startOffset + r * (cellWidth + cellSpacing);

        const mat = new THREE.MeshStandardMaterial({
          color: fillColor,
          roughness: 0.25,
          metalness: 0.4,
          transparent: true,
          opacity: 0.9
        });

        const cell = new THREE.Mesh(boxGeo, mat);
        cell.position.set(posX, 0, posZ);
        cell.castShadow = true;
        cell.receiveShadow = true;

        // Wireframe Outlines
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1.5, transparent: true, opacity: 0.7 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        cell.add(wire);

        // Pre-compute chaotic jitter coordinates for this cell
        const angle = Math.random() * Math.PI * 2;
        const chaosRotX = (Math.random() - 0.5) * 0.45;
        const chaosRotY = (Math.random() - 0.5) * 0.55;
        const chaosRotZ = (Math.random() - 0.5) * 0.45;
        const chaosOffsetX = (Math.random() - 0.5) * 0.7;
        const chaosOffsetY = (Math.random() - 0.5) * 0.6;
        const chaosOffsetZ = (Math.random() - 0.5) * 0.7;

        cell.userData = {
          layerIndex: layerIndex,
          row: r,
          col: c,
          cellName: String.fromCharCode(65 + c) + (r + 1 + layerIndex * 10),
          pristinePos: new THREE.Vector3(posX, 0, posZ),
          pristineRot: new THREE.Euler(0, 0, 0),
          chaosPos: new THREE.Vector3(posX + chaosOffsetX, chaosOffsetY, posZ + chaosOffsetZ),
          chaosRot: new THREE.Euler(chaosRotX, chaosRotY, chaosRotZ),
          defaultColor: fillColor,
          edgeColor: edgeColor,
          isCorrupt: (Math.random() > 0.65),
          cleanFormula: `=XLOOKUP(${String.fromCharCode(65 + c)}${r + 1}, DataMaster, Target, 0)`
        };

        layerGroup.add(cell);
        this.cells.push(cell);

        // If top layer, place 4 interactive 3D financial KPI bar pillars!
        if (isTopKPI && ((r === 1 && c === 1) || (r === 1 && c === 3) || (r === 3 && c === 1) || (r === 3 && c === 3))) {
          this.createKPIPillar(layerGroup, posX, posZ, r, c);
        }
      }
    }

    this.layers.push(layerGroup);
    this.rootGroup.add(layerGroup);
  }

  createKPIPillar(layerGroup, posX, posZ, r, c) {
    const kpiConfigs = {
      '1,1': { label: 'Net Revenue', targetHeight: 2.8, color: 0x38bdf8, val: '$4.8M' },
      '1,3': { label: 'Gross Margin', targetHeight: 3.9, color: 0x10b981, val: '84.2%' },
      '3,1': { label: 'Burn Multiple', targetHeight: 2.2, color: 0x818cf8, val: '0.8x' },
      '3,3': { label: 'EBITDA Forecast', targetHeight: 4.8, color: 0x34d399, val: '+$1.6M' }
    };

    const conf = kpiConfigs[`${r},${c}`] || { label: 'Metric', targetHeight: 3.0, color: 0x10b981, val: '100%' };
    const pillarGeo = new THREE.CylinderGeometry(0.38, 0.44, 1, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: conf.color,
      roughness: 0.15,
      metalness: 0.7,
      transparent: true,
      opacity: 0.95
    });

    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(posX, 0.5, posZ);
    pillar.castShadow = true;

    // Glowing Cap
    const capGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16);
    const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.5;
    pillar.add(cap);

    pillar.userData = {
      targetHeight: conf.targetHeight,
      label: conf.label,
      val: conf.val,
      baseY: 0.5,
      color: conf.color
    };

    layerGroup.add(pillar);
    this.barPillars.push(pillar);
  }

  createErrorBadges() {
    const errorTokens = ['#REF!', '#DIV/0!', '#VALUE!', '#NAME?', 'CIRCULAR!', 'CORRUPT'];
    const badgeGroup = new THREE.Group();

    errorTokens.forEach((tok, idx) => {
      const sprite = this.createTextSprite(tok, '#EF4444', 'rgba(239, 68, 68, 0.25)');
      const angle = (idx / errorTokens.length) * Math.PI * 2;
      const radius = 3.8 + Math.random() * 0.8;
      sprite.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 3 + 1, Math.sin(angle) * radius);
      sprite.userData = {
        basePos: sprite.position.clone(),
        floatSpeed: 1.5 + Math.random(),
        floatOffset: Math.random() * 5
      };
      badgeGroup.add(sprite);
      this.chaosBadges.push(sprite);
    });

    this.rootGroup.add(badgeGroup);
  }

  createPristineBadges() {
    const metrics = ['✓ 0.18s Calc Speed', '✓ Zero Formula Errors', '✓ Dynamic XLOOKUP', '✓ 100% Automated'];
    const badgeGroup = new THREE.Group();

    metrics.forEach((txt, idx) => {
      const sprite = this.createTextSprite(txt, '#10B981', 'rgba(16, 185, 129, 0.25)');
      const angle = (idx / metrics.length) * Math.PI * 2 + Math.PI / 4;
      const radius = 4.2;
      sprite.position.set(Math.cos(angle) * radius, 2.8 + (idx % 2) * 0.8, Math.sin(angle) * radius);
      sprite.userData = {
        basePos: sprite.position.clone(),
        floatSpeed: 1.2 + Math.random(),
        floatOffset: Math.random() * 5
      };
      badgeGroup.add(sprite);
      this.pristineBadges.push(sprite);
    });

    this.rootGroup.add(badgeGroup);
  }

  createFormulaConduits() {
    // Elegant Bezier curves with glowing pulsing light packets
    const conduitCoords = [
      [new THREE.Vector3(-2, 0.5, -2), new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(2, 2.5, 2)],
      [new THREE.Vector3(2, 0.5, -2), new THREE.Vector3(1, 2.0, 0), new THREE.Vector3(-2, 2.5, 2)],
      [new THREE.Vector3(-2, -1, 0), new THREE.Vector3(-0.5, 0.8, 1), new THREE.Vector3(2, 2.8, -1)]
    ];

    conduitCoords.forEach(points => {
      const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.035, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.65 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);

      // Energy Pulse Bead
      const beadGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bead = new THREE.Mesh(beadGeo, beadMat);

      this.rootGroup.add(tube);
      this.rootGroup.add(bead);

      this.conduitCurves.push({ curve, tube, bead, progress: Math.random() });
    });
  }

  createTextSprite(text, color, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

    // Rounded Box
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 64, 14);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.font = 'bold 24px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 36);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.0, 0.58, 1.0);
    return sprite;
  }

  setupEvents() {
    // Resize Listener
    window.addEventListener('resize', () => this.handleResize());

    // Mouse Tracking for Raycasting & Tooltips
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.mouse.x = -999;
      this.mouse.y = -999;
      this.hideTooltip();
    });

    // Tap / Click to interact with cells
    this.renderer.domElement.addEventListener('click', () => {
      if (this.hoveredCell) {
        window.soundEngine.playClick();
        this.inspectCell(this.hoveredCell);
      }
    });
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setCameraPreset(preset) {
    if (!this.camera) return;

    if (preset === 'isometric') {
      this.camera.position.set(13, 11, 14);
      this.camera.lookAt(0, 0, 0);
    } else if (preset === 'executive') {
      this.camera.position.set(4, 8, 12);
      this.camera.lookAt(0, 1.5, 0);
    } else if (preset === 'topdown') {
      this.camera.position.set(0, 18, 0.1);
      this.camera.lookAt(0, 0, 0);
    }

    if (this.controls) {
      this.controls.target.set(0, 0.5, 0);
      this.controls.update();
    }
  }

  setState(state) {
    this.state = state;
    this.targetMorph = (state === 'pristine') ? 1.0 : 0.0;

    if (state === 'pristine') {
      window.soundEngine.playChime();
    } else {
      window.soundEngine.playGlitch();
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.targetExplode = (mode === 'exploded') ? 1.0 : 0.0;

    const isWire = (mode === 'wireframe');
    this.cells.forEach(c => {
      c.material.wireframe = isWire;
    });

    if (mode === 'exploded') {
      window.soundEngine.playExplode();
    } else {
      window.soundEngine.playClick();
    }
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    // 1. Morph Interpolation (Chaos <-> Pristine)
    this.morphProgress += (this.targetMorph - this.morphProgress) * 0.08;

    // 2. Explode Interpolation (Unified <-> Exploded)
    this.explodeProgress += (this.targetExplode - this.explodeProgress) * 0.08;

    // 3. Update Layers Height based on Explode Progress
    this.layers.forEach(layer => {
      const targetY = THREE.MathUtils.lerp(layer.userData.baseY, layer.userData.explodedY, this.explodeProgress);
      layer.position.y += (targetY - layer.position.y) * 0.1;
    });

    // 4. Update Cells: Position, Rotation, Materials, Color
    const isPristine = (this.morphProgress > 0.5);
    this.cells.forEach(cell => {
      // Interpolate between chaotic pose and pristine aligned pose
      cell.position.lerpVectors(cell.userData.chaosPos, cell.userData.pristinePos, this.morphProgress);

      cell.rotation.x = THREE.MathUtils.lerp(cell.userData.chaosRot.x, cell.userData.pristineRot.x, this.morphProgress);
      cell.rotation.y = THREE.MathUtils.lerp(cell.userData.chaosRot.y, cell.userData.pristineRot.y, this.morphProgress);
      cell.rotation.z = THREE.MathUtils.lerp(cell.userData.chaosRot.z, cell.userData.pristineRot.z, this.morphProgress);

      // Color Shift
      if (cell.userData.isCorrupt) {
        const errorColor = new THREE.Color(0xef4444);
        const cleanColor = new THREE.Color(cell.userData.defaultColor);
        cell.material.color.lerpColors(errorColor, cleanColor, this.morphProgress);
      }
    });

    // 5. Update KPI Bar Chart Pillars
    this.barPillars.forEach(p => {
      const targetScaleY = THREE.MathUtils.lerp(0.15, p.userData.targetHeight, this.morphProgress);
      p.scale.y += (targetScaleY - p.scale.y) * 0.1;
      p.position.y = p.scale.y / 2 + 0.14;
    });

    // 6. Update Floating Badges Visibility and Gentle Floating
    this.chaosBadges.forEach(b => {
      b.visible = (this.morphProgress < 0.85);
      b.material.opacity = 1.0 - this.morphProgress;
      b.position.y = b.userData.basePos.y + Math.sin(time * b.userData.floatSpeed + b.userData.floatOffset) * 0.15;
    });

    this.pristineBadges.forEach(b => {
      b.visible = (this.morphProgress > 0.15);
      b.material.opacity = this.morphProgress;
      b.position.y = b.userData.basePos.y + Math.sin(time * b.userData.floatSpeed + b.userData.floatOffset) * 0.15;
    });

    // 7. Update Formula Conduits & Flowing Energy Packets
    this.conduitCurves.forEach(c => {
      c.progress = (c.progress + 0.008) % 1.0;
      const pt = c.curve.getPoint(c.progress);
      c.bead.position.copy(pt);
      c.tube.visible = (this.morphProgress > 0.25);
      c.bead.visible = (this.morphProgress > 0.25);
    });

    // 8. Warning Light Pulsing in Chaos
    if (this.rubyWarningLight) {
      this.rubyWarningLight.intensity = (1.0 - this.morphProgress) * (2.5 + Math.sin(time * 6) * 1.5);
    }

    // 9. Particle Drift
    if (this.particleSystem) {
      this.particleSystem.rotation.y = time * 0.03;
    }

    // 10. Auto-Rotation
    if (this.isAutoRotating && this.rootGroup) {
      this.rootGroup.rotation.y += 0.0035;
    }

    // 11. Raycasting for Mouse Cell Hover
    this.performRaycast();

    // 12. Update OrbitControls & Render
    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  performRaycast() {
    if (this.mouse.x === -999) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cells);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredCell !== hit) {
        this.hoveredCell = hit;
        this.showTooltip(hit);
      }
    } else {
      if (this.hoveredCell) {
        this.hoveredCell = null;
        this.hideTooltip();
      }
    }
  }

  showTooltip(cell) {
    const tooltip = document.getElementById('sceneCellTooltip');
    if (!tooltip) return;

    const data = cell.userData;
    const isClean = this.morphProgress > 0.5;

    let statusHtml = '';
    if (!isClean && data.isCorrupt) {
      statusHtml = `
        <span class="cell-status-pill error">⚠️ #REF! Corrupted</span>
        <div class="cell-detail">Circular dependency detected across 18 unindexed tabs.</div>
      `;
    } else {
      statusHtml = `
        <span class="cell-status-pill clean">✨ Engineered Pristine</span>
        <div class="cell-detail">${data.cleanFormula}</div>
      `;
    }

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <strong>Cell ${data.cellName}</strong>
        <span class="tooltip-layer">L${data.layerIndex}: ${this.layers[data.layerIndex]?.userData.title || ''}</span>
      </div>
      <div class="tooltip-body">${statusHtml}</div>
    `;

    tooltip.classList.add('visible');
  }

  hideTooltip() {
    const tooltip = document.getElementById('sceneCellTooltip');
    if (tooltip) tooltip.classList.remove('visible');
  }

  inspectCell(cell) {
    const data = cell.userData;
    const hudStatus = document.getElementById('hudSelectedCell');
    if (hudStatus) {
      hudStatus.textContent = `${data.cellName} (${this.morphProgress > 0.5 ? 'Engineered' : 'Disorganized'})`;
    }
  }
}

window.Spreadsheet3DScene = Spreadsheet3DScene;
