/**
 * SheetFix 3D - Authentic Microsoft Excel Interactive 3D Workbook Experience
 * Features:
 * - Unmistakable Microsoft Excel aesthetic: Row numbers 1-5, Column headers A-E
 * - High-resolution canvas-rendered cell textures with authentic financial data & error codes
 * - Iconic Excel green active cell selection box with bottom-right fill handle
 * - Real-time sync with Excel Formula Bar (fx) and active cell address (e.g. C3)
 * - 3D Perspective vs Flat Top-Down view modes
 * - Chaos Mode (#REF!, #DIV/0!, shattered cells, red error triangles) vs Clean Mode (pristine, auto-sums, 3D KPI pillars)
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
    this.selectionGroup = null;

    // View & Morph State
    this.viewMode = '3d'; // '3d' or 'flat'
    this.cleanProgress = 1.0;
    this.targetClean = 1.0;
    this.isDragging = false;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.dragVelocity = 0;
    this.rotationY = 0.38;
    this.targetRotationY = 0.38;
    this.rotationX = 0.14;
    this.targetRotationX = 0.14;
    this.priceOfferMultiplier = 1.0;

    // Camera animation targets
    this.camPos = new THREE.Vector3(0, 6.6, 9.4);
    this.targetCamPos = new THREE.Vector3(0, 6.6, 9.4);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.targetCamLook = new THREE.Vector3(0, 0, 0);

    // Raycasting & Hover State
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.hoveredCell = null;
    this.activeCell = null;

    this.init();
    this.buildExcelSheet();
    this.setupEvents();
    this.animate();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 410;

    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xecfdf5, 2.0);
    this.keyLight.position.set(6, 12, 8);
    this.scene.add(this.keyLight);

    this.greenLight = new THREE.PointLight(0x107c41, 2.6, 22);
    this.greenLight.position.set(-5, 6, 4);
    this.scene.add(this.greenLight);

    this.redWarningLight = new THREE.PointLight(0xef4444, 0, 20);
    this.redWarningLight.position.set(0, 4, 2);
    this.scene.add(this.redWarningLight);
  }

  // Create crisp 2D canvas texture for Excel cells
  createCellCanvasTexture(text, subText, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');

    const isHeader = options.isHeader || false;
    const isRowHeader = options.isRowHeader || false;
    const isTotal = options.isTotal || false;
    const isError = options.isError || false;
    const align = options.align || 'left';

    // Cell Background
    if (isError) {
      ctx.fillStyle = '#2A1012'; // Crimson error background
    } else if (isHeader) {
      ctx.fillStyle = '#107C41'; // Microsoft Excel Signature Green
    } else if (isRowHeader) {
      ctx.fillStyle = '#1B2430'; // Excel row index gray
    } else if (isTotal) {
      ctx.fillStyle = '#14281E'; // Clean total highlight
    } else {
      ctx.fillStyle = '#141A22'; // Sleek dark Excel cell
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cell Gridlines
    ctx.strokeStyle = isError ? '#EF4444' : (isHeader ? '#189851' : (isTotal ? '#107C41' : '#2A3647'));
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Excel Red / Yellow Error Corner Flag
    if (isError && !isHeader && !isRowHeader) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(canvas.width - 28, 0);
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(canvas.width, 28);
      ctx.closePath();
      ctx.fill();
    }

    // Double underline for totals in clean mode
    if (isTotal && !isError) {
      ctx.strokeStyle = '#107C41';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, canvas.height - 18);
      ctx.lineTo(canvas.width - 16, canvas.height - 18);
      ctx.moveTo(16, canvas.height - 10);
      ctx.lineTo(canvas.width - 16, canvas.height - 10);
      ctx.stroke();
    }

    // Typography
    let textColor = '#F1F5F9';
    if (isError) textColor = '#FCA5A5';
    else if (isHeader) textColor = '#FFFFFF';
    else if (isTotal) textColor = '#B6FF2E';
    else if (isRowHeader) textColor = '#94A3B8';

    ctx.fillStyle = textColor;
    ctx.font = isHeader ? 'bold 36px "Segoe UI", Calibri, Arial, sans-serif' : '600 32px Consolas, "Segoe UI", monospace';

    let x = 24;
    if (align === 'right') {
      ctx.textAlign = 'right';
      x = canvas.width - 24;
    } else if (align === 'center') {
      ctx.textAlign = 'center';
      x = canvas.width / 2;
    } else {
      ctx.textAlign = 'left';
      x = 24;
    }

    const y = subText ? 62 : 88;
    ctx.fillText(text, x, y);

    if (subText) {
      ctx.font = isHeader ? '600 22px "Segoe UI", Calibri, sans-serif' : '500 24px "Segoe UI", Calibri, sans-serif';
      ctx.fillStyle = isError ? '#F87171' : (isHeader ? '#D1FAE5' : '#94A3B8');
      ctx.fillText(subText, x, 114);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  buildExcelSheet() {
    this.sheetGroup = new THREE.Group();
    this.scene.add(this.sheetGroup);

    // Columns Specification (6 columns: Row#, A, B, C, D, E)
    const colsDef = [
      { name: 'Row', width: 0.8, align: 'center', isRowHeader: true },
      { name: 'A', label: 'Department', width: 2.5, align: 'left' },
      { name: 'B', label: 'Budget', width: 1.5, align: 'right' },
      { name: 'C', label: 'Q3 Actual', width: 1.5, align: 'right' },
      { name: 'D', label: 'Variance', width: 1.4, align: 'right' },
      { name: 'E', label: 'Status', width: 1.4, align: 'center' }
    ];

    // Rows Data Specification (6 rows: Header row 0 + Data rows 1 to 5)
    const rowsDef = [
      // Row 0: Column Letters Header
      {
        rowNum: '',
        isHeader: true,
        cells: [
          { clean: '◢', chaos: '◢', sub: '' },
          { clean: 'A', chaos: 'A', sub: 'Department' },
          { clean: 'B', chaos: 'B', sub: 'Budget' },
          { clean: 'C', chaos: 'C', sub: 'Q3 Actual' },
          { clean: 'D', chaos: 'D', sub: 'Variance' },
          { clean: 'E', chaos: 'E', sub: 'Status' }
        ]
      },
      // Row 1: Enterprise Sales
      {
        rowNum: '1',
        cells: [
          { clean: '1', chaos: '1', sub: '', isRowHeader: true },
          { clean: 'Enterprise Sales', chaos: 'Enterprise Sales', formulaClean: '=VLOOKUP("ENT", Accounts, 2, 0)', formulaChaos: '#REF! Broken Reference' },
          { clean: '$480,000', chaos: '#VALUE!', formulaClean: '=SUM(Pipeline!C2:C10)', formulaChaos: '#VALUE! Text In Formula Range' },
          { clean: '$524,000', chaos: '$524,000', formulaClean: '=Ledger!D24', formulaChaos: '=Ledger!D24' },
          { clean: '+$44,000', chaos: '#REF!', formulaClean: '=C2-B2', formulaChaos: '#REF! Invalid Row Shift' },
          { clean: '+9.2% 🟢', chaos: 'ERR_NULL 🔴', formulaClean: '=(C2-B2)/B2', formulaChaos: 'ERR: Bad Return Type' }
        ]
      },
      // Row 2: Cloud Operations
      {
        rowNum: '2',
        cells: [
          { clean: '2', chaos: '2', sub: '', isRowHeader: true },
          { clean: 'Cloud Operations', chaos: 'Cloud Operations', formulaClean: '=VLOOKUP("AWS", CostCenter, 2, 0)', formulaChaos: '#NAME? Unknown Function' },
          { clean: '$195,000', chaos: '$195,000', formulaClean: '=Allocations!B12', formulaChaos: '=Allocations!B12' },
          { clean: '$192,500', chaos: '#DIV/0!', formulaClean: '=SUMIFS(AWS!F:F, AWS!A:A, "Q3")', formulaChaos: '#DIV/0! Zero Divisor Found' },
          { clean: '-$2,500', chaos: '#DIV/0!', formulaClean: '=C3-B3', formulaChaos: '#DIV/0! Cascaded Error' },
          { clean: 'ON TRACK 🟢', chaos: 'CRASHED 🔴', formulaClean: '=IF(D3>0,"OVER","ON TRACK")', formulaChaos: 'LOGIC FAILURE' }
        ]
      },
      // Row 3: R&D & Engineering
      {
        rowNum: '3',
        cells: [
          { clean: '3', chaos: '3', sub: '', isRowHeader: true },
          { clean: 'R&D & Engineering', chaos: '########', formulaClean: '=Departments!A4', formulaChaos: 'COLUMN WIDTH OVERFLOW' },
          { clean: '$310,000', chaos: '$310,000', formulaClean: '=Headcount!E10*1.12', formulaChaos: '=Headcount!E10*1.12' },
          { clean: '$307,800', chaos: '######', formulaClean: '=XLOOKUP(A4, Actuals!A:C, 3, 0)', formulaChaos: 'CORRUPTED CELL CACHE' },
          { clean: '-$2,200', chaos: 'CIRCULAR', formulaClean: '=C4-B4', formulaChaos: 'CIRCULAR: A4 -> C4 -> A4' },
          { clean: 'ON TRACK 🟢', chaos: 'LOOP_A4 🔴', formulaClean: '=IF(ABS(D4)<5000,"HEALTHY","ALERT")', formulaChaos: 'CYCLIC ERROR' }
        ]
      },
      // Row 4: Growth Marketing
      {
        rowNum: '4',
        cells: [
          { clean: '4', chaos: '4', sub: '', isRowHeader: true },
          { clean: 'Growth Marketing', chaos: 'Growth Marketing', formulaClean: '=Departments!A5', formulaChaos: 'Departments!A5' },
          { clean: '$95,000', chaos: '#NAME?', formulaClean: '=AdSpend!B4', formulaChaos: '#NAME? Legacy Macro Missing' },
          { clean: '$142,000', chaos: '$142,000', formulaClean: '=AdSpend!F12', formulaChaos: '=AdSpend!F12' },
          { clean: '+$47,000', chaos: '#NAME?', formulaClean: '=C5-B5', formulaChaos: '#NAME? Evaluator Abort' },
          { clean: '+49.5% ⚡', chaos: 'OVER-RUN 🔴', formulaClean: '=(C5-B5)/B5', formulaChaos: 'OUT OF BOUNDS' }
        ]
      },
      // Row 5: Consolidated Net Totals
      {
        rowNum: '5',
        isTotal: true,
        cells: [
          { clean: '5', chaos: '5', sub: '', isRowHeader: true },
          { clean: 'Consolidated Net', chaos: 'CORRUPT TOTAL', formulaClean: '="TOTAL MODEL AUDIT"', formulaChaos: 'SUM RANGE INVALID' },
          { clean: '$1,080,000', chaos: '#REF!', formulaClean: '=SUM(B2:B5)', formulaChaos: '#REF! Missing Range B2:B5' },
          { clean: '$1,166,300', chaos: '#REF!', formulaClean: '=SUM(C2:C5)', formulaChaos: '#REF! Missing Range C2:C5' },
          { clean: '+$86,300', chaos: '#NUM!', formulaClean: '=C6-B6', formulaChaos: '#NUM! Calc Overflow' },
          { clean: 'AUDITED 🟢', chaos: 'FATAL 🔴', formulaClean: '=IF(AND(ISNUMBER(C6),C6>0),"PASS","FAIL")', formulaChaos: 'MODEL INTEGRITY COMPROMISED' }
        ]
      }
    ];

    // Calculate Grid Positioning
    const totalW = colsDef.reduce((acc, c) => acc + c.width, 0);
    const rowDepth = 0.72;
    const headerDepth = 0.55;
    const totalD = headerDepth + (rowsDef.length - 1) * rowDepth;
    const cellThickness = 0.16;

    // Excel Workbook Base Foundation Plate (Dark Gunmetal with subtle green rim)
    const baseGeo = new THREE.BoxGeometry(totalW + 0.35, 0.12, totalD + 0.35);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f141c,
      roughness: 0.4,
      metalness: 0.6
    });
    this.sheetBase = new THREE.Mesh(baseGeo, baseMat);
    this.sheetBase.position.set(0, -0.07, 0);
    this.sheetGroup.add(this.sheetBase);

    // Accent Rim around workbook plate
    const rimGeo = new THREE.EdgesGeometry(baseGeo);
    const rimMat = new THREE.LineBasicMaterial({ color: 0x107c41, linewidth: 2 });
    const rim = new THREE.LineSegments(rimGeo, rimMat);
    this.sheetBase.add(rim);

    // Build Individual 3D Excel Cells
    let currentZ = -(totalD / 2) + headerDepth / 2;

    rowsDef.forEach((row, rIdx) => {
      const isHeaderRow = rIdx === 0;
      const isTotalRow = row.isTotal || false;
      const hD = isHeaderRow ? headerDepth : rowDepth;

      let currentX = -(totalW / 2);

      colsDef.forEach((col, cIdx) => {
        const cellData = row.cells[cIdx];
        const cellW = col.width;
        const cX = currentX + cellW / 2;
        const cZ = currentZ;

        // Cell Geometry
        const cellGeo = new THREE.BoxGeometry(cellW - 0.04, cellThickness, hD - 0.04);

        // Generate Clean & Chaos Textures
        const cleanTex = this.createCellCanvasTexture(cellData.clean, cellData.sub, {
          isHeader: isHeaderRow,
          isRowHeader: col.isRowHeader,
          isTotal: isTotalRow,
          align: col.align,
          isError: false
        });

        const isCellError = (cellData.chaos.includes('#') || cellData.chaos.includes('ERR') || cellData.chaos.includes('CIRCULAR') || cellData.chaos.includes('FATAL') || cellData.chaos.includes('CORRUPT'));

        const chaosTex = this.createCellCanvasTexture(cellData.chaos, cellData.sub, {
          isHeader: isHeaderRow,
          isRowHeader: col.isRowHeader,
          isTotal: isTotalRow,
          align: col.align,
          isError: isCellError
        });

        // Box Materials (Top face has dynamic canvas texture; sides are dark beveled metal)
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.5, metalness: 0.3 });
        const topMatClean = new THREE.MeshStandardMaterial({
          map: cleanTex,
          roughness: 0.3,
          metalness: 0.1,
          emissive: new THREE.Color(0x000000)
        });

        // 6 faces: [right, left, top, bottom, front, back]
        const matsClean = [sideMat, sideMat, topMatClean, sideMat, sideMat, sideMat];
        const cellMesh = new THREE.Mesh(cellGeo, matsClean);
        cellMesh.position.set(cX, 0, cZ);

        // Chaotic shattered coordinates
        const isMovable = !isHeaderRow && !col.isRowHeader;
        const chaosX = cX + (isMovable ? (Math.random() - 0.5) * 0.9 : 0);
        const chaosY = isMovable ? (Math.random() - 0.5) * 0.7 : (isHeaderRow ? 0.05 : 0);
        const chaosZ = cZ + (isMovable ? (Math.random() - 0.5) * 0.9 : 0);

        const chaosRotX = isMovable ? (Math.random() - 0.5) * 0.45 : 0;
        const chaosRotY = isMovable ? (Math.random() - 0.5) * 0.45 : 0;
        const chaosRotZ = isMovable ? (Math.random() - 0.5) * 0.45 : 0;

        // Cell Address (e.g. C3, D5)
        const colLetter = colsDef[cIdx].name;
        const rowNum = row.rowNum;
        const cellAddress = (isHeaderRow || col.isRowHeader) ? (isHeaderRow ? `Col ${colLetter}` : `Row ${rowNum}`) : `${colLetter}${rowNum}`;

        cellMesh.userData = {
          rIdx,
          cIdx,
          cellAddress,
          cleanFormula: cellData.formulaClean || cellData.clean,
          chaosFormula: cellData.formulaChaos || cellData.chaos,
          cleanValue: cellData.clean,
          chaosValue: cellData.chaos,
          cleanPos: new THREE.Vector3(cX, 0, cZ),
          cleanRot: new THREE.Euler(0, 0, 0),
          chaosPos: new THREE.Vector3(chaosX, chaosY, chaosZ),
          chaosRot: new THREE.Euler(chaosRotX, chaosRotY, chaosRotZ),
          cleanTex,
          chaosTex,
          topMatClean,
          isHeaderRow,
          isRowHeader: col.isRowHeader,
          isInteractive: !isHeaderRow && !col.isRowHeader,
          width: cellW,
          depth: hD
        };

        this.sheetGroup.add(cellMesh);
        this.cells.push(cellMesh);

        currentX += cellW;
      });

      currentZ += hD;
    });

    // 3D Active Cell Selection Frame (Iconic Excel Green Border with Drag Handle)
    this.createActiveCellSelectionBox();

    // 3D Financial KPI Bar Chart in Clean Mode (Columns C2-C5 Actuals)
    const chartData = [
      { x: -(totalW / 2) + 0.8 + 2.5 + 1.5 + 0.75, z: -(totalD / 2) + headerDepth + 0.72 * 0.5, h: 1.6, label: '$524k' },
      { x: -(totalW / 2) + 0.8 + 2.5 + 1.5 + 0.75, z: -(totalD / 2) + headerDepth + 0.72 * 1.5, h: 1.1, label: '$192k' },
      { x: -(totalW / 2) + 0.8 + 2.5 + 1.5 + 0.75, z: -(totalD / 2) + headerDepth + 0.72 * 2.5, h: 1.4, label: '$307k' },
      { x: -(totalW / 2) + 0.8 + 2.5 + 1.5 + 0.75, z: -(totalD / 2) + headerDepth + 0.72 * 3.5, h: 0.9, label: '$142k' }
    ];

    chartData.forEach(cd => {
      const colGeo = new THREE.BoxGeometry(0.35, 1, 0.35);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x107c41,
        emissive: 0x0d5c30,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 0.92
      });
      const bar = new THREE.Mesh(colGeo, colMat);
      bar.position.set(cd.x, 0.5, cd.z);
      bar.userData = { targetHeight: cd.h, basePos: new THREE.Vector3(cd.x, 0, cd.z) };

      // Glowing Neon Cap
      const capGeo = new THREE.BoxGeometry(0.37, 0.06, 0.37);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xb6ff2e });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.5;
      bar.add(cap);

      this.sheetGroup.add(bar);
      this.bars.push(bar);
    });

    // Floating Error Tokens for Chaos Mode
    const errors = ['#REF!', '#DIV/0!', '#VALUE!', 'CIRCULAR!'];
    errors.forEach((txt, idx) => {
      const sprite = this.createBadgeSprite(txt, '#EF4444', 'rgba(42, 16, 18, 0.92)');
      const angle = (idx / errors.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 3.5, 2.0 + Math.sin(idx) * 0.4, Math.sin(angle) * 2.2);
      this.sheetGroup.add(sprite);
      this.chaosTokens.push(sprite);
    });

    // Floating Clean Badges for Clean Mode
    const cleanBadges = ['✓ Clean Lambdas', '✓ 0.04s Recalc', '✓ 0 Errors'];
    cleanBadges.forEach((txt, idx) => {
      const sprite = this.createBadgeSprite(txt, '#B6FF2E', 'rgba(16, 24, 32, 0.92)');
      const angle = (idx / cleanBadges.length) * Math.PI * 2 + 0.6;
      sprite.position.set(Math.cos(angle) * 3.6, 2.4, Math.sin(angle) * 2.2);
      this.sheetGroup.add(sprite);
      this.cleanTokens.push(sprite);
    });

    // Set Default Active Cell to C3 (Actual: Cloud Operations)
    const defaultCell = this.cells.find(c => c.userData.cellAddress === 'C3') || this.cells[15];
    if (defaultCell) {
      this.setActiveCell(defaultCell);
    }
  }

  // Active Cell Selection Border with the iconic bottom-right drag fill handle
  createActiveCellSelectionBox() {
    this.selectionGroup = new THREE.Group();
    this.sheetGroup.add(this.selectionGroup);

    // Green selection frame (LineSegments)
    const frameGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -0.5, 0.09, -0.5,   0.5, 0.09, -0.5,
       0.5, 0.09, -0.5,   0.5, 0.09,  0.5,
       0.5, 0.09,  0.5,  -0.5, 0.09,  0.5,
      -0.5, 0.09,  0.5,  -0.5, 0.09, -0.5
    ]);
    frameGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const frameMat = new THREE.LineBasicMaterial({ color: 0x107c41, linewidth: 3 });
    this.selectionLines = new THREE.LineSegments(frameGeo, frameMat);
    this.selectionGroup.add(this.selectionLines);

    // Bottom-right Fill Handle square
    const handleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const handleMat = new THREE.MeshBasicMaterial({ color: 0x107c41 });
    this.fillHandle = new THREE.Mesh(handleGeo, handleMat);
    this.fillHandle.position.set(0.5, 0.09, 0.5);
    this.selectionGroup.add(this.fillHandle);
  }

  setActiveCell(cell) {
    if (!cell || !cell.userData) return;
    this.activeCell = cell;

    const w = cell.userData.width - 0.02;
    const d = cell.userData.depth - 0.02;

    this.selectionGroup.scale.set(w, 1, d);
    this.selectionGroup.position.copy(cell.position);

    // Update HTML Formula Bar & Cell Address
    const addrEl = document.getElementById('excelActiveCellAddr');
    const fxEl = document.getElementById('excelFormulaInput');
    const hud = document.getElementById('sheetHudBadge');

    const isClean = (this.cleanProgress > 0.5);
    const formula = isClean ? cell.userData.cleanFormula : cell.userData.chaosFormula;
    const addr = cell.userData.cellAddress || 'C3';

    if (addrEl) {
      addrEl.textContent = addr;
      if (!isClean) addrEl.classList.add('is-error');
      else addrEl.classList.remove('is-error');
    }

    if (fxEl) {
      fxEl.textContent = formula;
      if (!isClean) fxEl.classList.add('is-error');
      else fxEl.classList.remove('is-error');
    }

    if (hud) {
      hud.textContent = isClean ? `📍 [${addr}]: ${formula}` : `⚠️ [${addr}]: ${formula}`;
      if (!isClean) hud.classList.add('is-error');
      else hud.classList.remove('is-error');
    }
  }

  createBadgeSprite(text, color, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 272, 62, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 26px "Segoe UI", Calibri, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 140, 35);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.1, 0.52, 1);
    return sprite;
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize());

    const dom = this.renderer.domElement;

    // Mouse / Touch Interaction with Inertia Handover
    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.dragVelocity = 0;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      if (this.isDragging && this.viewMode === '3d') {
        const deltaX = e.clientX - this.previousMouseX;
        this.dragVelocity = deltaX * 0.007;
        this.targetRotationY += this.dragVelocity;
        this.previousMouseX = e.clientX;
        this.previousMouseY = e.clientY;
      }
    });

    // Cell Click / Touch
    dom.addEventListener('click', () => {
      if (this.hoveredCell && this.hoveredCell.userData.isInteractive) {
        this.setActiveCell(this.hoveredCell);
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      }
    });

    // Touch Support
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
        this.previousMouseY = e.touches[0].clientY;
        this.dragVelocity = 0;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || !e.touches[0] || this.viewMode !== '3d') return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.dragVelocity = deltaX * 0.007;
      this.targetRotationY += this.dragVelocity;
      this.previousMouseX = e.touches[0].clientX;
    }, { passive: true });
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Switch between 3D Isometric View and Flat Spreadsheet View
  setView(mode) {
    this.viewMode = mode;
    if (mode === 'flat') {
      this.targetCamPos.set(0, 11.2, 0.001);
      this.targetCamLook.set(0, 0, 0);
      this.targetRotationY = 0;
      this.targetRotationX = 0;
    } else {
      this.targetCamPos.set(0, 6.6, 9.4);
      this.targetCamLook.set(0, 0, 0);
      this.targetRotationY = 0.38;
      this.targetRotationX = 0.14;
    }
  }

  // Chaos (Broken / #REF!) vs Clean (Organized)
  setMode(mode) {
    if (mode === 'clean') {
      this.targetClean = 1.0;
      // Switch cell textures to clean
      this.cells.forEach(c => {
        if (c.material[2]) c.material[2].map = c.userData.cleanTex;
      });
      if (this.activeCell) this.setActiveCell(this.activeCell);
      if (window.soundEngine && typeof window.soundEngine.playChime === 'function') {
        window.soundEngine.playChime();
      }
    } else {
      this.targetClean = 0.0;
      // Switch cell textures to chaos
      this.cells.forEach(c => {
        if (c.material[2]) c.material[2].map = c.userData.chaosTex;
      });
      if (this.activeCell) this.setActiveCell(this.activeCell);
      if (window.soundEngine && typeof window.soundEngine.playGlitch === 'function') {
        window.soundEngine.playGlitch();
      }
    }
  }

  setPriceOfferScale(price) {
    const num = parseFloat(price) || 7500000;
    this.priceOfferMultiplier = Math.min(2.8, Math.max(0.35, num / 7500000));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    // Morph Tweening
    this.cleanProgress += (this.targetClean - this.cleanProgress) * 0.09;

    // Camera Interpolation
    this.camPos.lerp(this.targetCamPos, 0.08);
    this.camLook.lerp(this.targetCamLook, 0.08);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Rotation & Inertia
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;

    if (this.isDragging && this.viewMode === '3d') {
      // User driving rotation
    } else if (this.viewMode === '3d') {
      if (Math.abs(this.dragVelocity) > 0.0001) {
        this.targetRotationY += this.dragVelocity;
        this.dragVelocity *= 0.92;
      } else {
        this.targetRotationY += 0.0025; // Gentle idle spin in 3D
      }
    } else {
      this.targetRotationY = 0;
      this.targetRotationX = 0;
    }

    if (this.sheetGroup) {
      this.sheetGroup.rotation.y = this.rotationY;
      this.sheetGroup.rotation.x = this.rotationX;
    }

    // Interactive Raycasting on Cells
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const interactiveMeshes = this.cells.filter(c => c.userData.isInteractive);
    const intersects = this.raycaster.intersectObjects(interactiveMeshes);

    if (intersects.length > 0) {
      const hitCell = intersects[0].object;
      if (this.hoveredCell !== hitCell) {
        if (this.hoveredCell && this.hoveredCell.material[2]) {
          this.hoveredCell.material[2].emissive.setHex(0x000000);
        }
        this.hoveredCell = hitCell;
        this.setActiveCell(hitCell);
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      }

      const isClean = (this.cleanProgress > 0.5);
      const emissiveColor = isClean ? 0x0e5e31 : 0x7f1d1d;
      hitCell.material[2].emissive.setHex(emissiveColor);
    } else {
      if (this.hoveredCell && this.hoveredCell.material[2]) {
        this.hoveredCell.material[2].emissive.setHex(0x000000);
        this.hoveredCell = null;
      }
    }

    // Animate Cells (Interpolate between clean flush grid and broken shattered state)
    this.cells.forEach(cell => {
      cell.position.lerpVectors(cell.userData.chaosPos, cell.userData.cleanPos, this.cleanProgress);
      cell.rotation.x = THREE.MathUtils.lerp(cell.userData.chaosRot.x, cell.userData.cleanRot.x, this.cleanProgress);
      cell.rotation.y = THREE.MathUtils.lerp(cell.userData.chaosRot.y, cell.userData.cleanRot.y, this.cleanProgress);
      cell.rotation.z = THREE.MathUtils.lerp(cell.userData.chaosRot.z, cell.userData.cleanRot.z, this.cleanProgress);
    });

    // Follow active cell with selection box
    if (this.activeCell && this.selectionGroup) {
      this.selectionGroup.position.copy(this.activeCell.position);
      this.selectionGroup.rotation.copy(this.activeCell.rotation);
      this.selectionGroup.position.y += 0.02;
    }

    // Animate 3D Financial KPI Pillars
    const multiplier = this.priceOfferMultiplier || 1.0;
    this.bars.forEach(bar => {
      const h = THREE.MathUtils.lerp(0.04, bar.userData.targetHeight * multiplier, this.cleanProgress);
      bar.scale.y = h;
      bar.position.y = h / 2;
      bar.visible = (this.cleanProgress > 0.05);
    });

    // Floating Tokens
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
      this.redWarningLight.intensity = (1.0 - this.cleanProgress) * 3.8;
    }
    if (this.greenLight) {
      this.greenLight.intensity = this.cleanProgress * 2.6;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.SimpleSpreadsheet3D = SimpleSpreadsheet3D;
