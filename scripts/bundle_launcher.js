import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const LAUNCHER_DIR = '/home/rasaec/launchers/apps';
const LAUNCHER_FILE = path.join(LAUNCHER_DIR, 'excel-3d-ad.html');

console.log('⚡ Building Standalone Windows Launcher for SheetFix 3D...');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssStyle = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const audioJs = fs.readFileSync(path.join(ROOT, 'js/audio.js'), 'utf8');
const threeSceneJs = fs.readFileSync(path.join(ROOT, 'js/three_scene.js'), 'utf8');
const transJs = fs.readFileSync(path.join(ROOT, 'js/translations.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

// Top Launcher Bar
const launcherBar = `
  <!-- Standalone Launcher Header Banner -->
  <div style="background: #030712; border-bottom: 2px solid #10B981; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.85rem; color: #9CA3AF; z-index: 999; position: relative;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981;"></span>
      <strong style="color: #F9FAFB;">SheetFix 3D • The Excel Organizing Service</strong>
      <span style="color: #6B7280;">(Local Port 5426)</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <a href="http://localhost:5426" target="_blank" style="color: #38BDF8; text-decoration: none; font-weight: 700; background: rgba(6, 182, 212, 0.15); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(6, 182, 212, 0.3);">
        🚀 Local Server (Port 5426)
      </a>
      <a href="https://arezoyetoo-dotcom.github.io/excel-3d-ad/" target="_blank" style="color: #A7F3D0; text-decoration: none; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3);">
        🌐 Online Website (GitHub Pages)
      </a>
      <a href="https://github.com/arezoyetoo-dotcom/excel-3d-ad" target="_blank" style="color: #C4B5FD; text-decoration: none; font-weight: 700; background: rgba(139, 92, 246, 0.15); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3);">
        📦 GitHub Repository
      </a>
    </div>
  </div>
`;

// Three.js CDN Fallback for Standalone launcher
const threeJsCdn = `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
`;

let bundled = indexHtml
  .replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${cssStyle}\n</style>`)
  .replace('<header class="site-header">', `${launcherBar}\n<header class="site-header">`)
  .replace('<script src="vendor/three.min.js"></script>', threeJsCdn)
  .replace('<script src="js/audio.js"></script>', `<script>\n${audioJs}\n</script>`)
  .replace('<script src="js/three_scene.js"></script>', `<script>\n${threeSceneJs}\n</script>`)
  .replace('<script src="js/translations.js"></script>', `<script>\n${transJs}\n</script>`)
  .replace('<script src="js/app.js"></script>', `<script>\n${appJs}\n</script>`);

fs.mkdirSync(LAUNCHER_DIR, { recursive: true });
fs.writeFileSync(LAUNCHER_FILE, bundled, 'utf8');

console.log(`✅ Standalone launcher created at: ${LAUNCHER_FILE} (${(bundled.length / 1024).toFixed(1)} KB)`);
