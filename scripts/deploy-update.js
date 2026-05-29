// Script de deploy OTA — empaqueta el dist y lo publica en Firebase Hosting (gratis)
// Uso: npm run deploy:update
// Requiere: haber ejecutado "npx firebase-tools login" al menos una vez

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HOSTING_URL = 'https://cotizadorccs-38398.web.app';

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

function crearZip(distDir, zipPath) {
  if (existsSync(zipPath)) unlinkSync(zipPath);

  // Copiar dist/ a carpeta temporal fuera de OneDrive para evitar bloqueos de archivos
  const tmpDir = join(tmpdir(), `cotizador-deploy-${Date.now()}`);
  // robocopy devuelve códigos 0-7 en éxito — capturar el error solo si código >= 8
  try {
    execSync(`robocopy "${distDir}" "${tmpDir}" /E /NFL /NDL /NJH /NJS /NC /NS /NP`, { stdio: 'pipe' });
  } catch (e) {
    if (e.status >= 8) throw new Error(`robocopy falló con código ${e.status}: ${e.stderr?.toString()}`);
  }

  execSync(
    `powershell -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${zipPath}'"`,
    { stdio: 'pipe' }
  );

  // Limpiar temporal
  try { execSync(`rmdir /S /Q "${tmpDir}"`, { stdio: 'pipe' }); } catch {}
}

async function main() {
  console.log(`\n📦 Publicando actualización v${VERSION}...\n`);

  const distDir = join(ROOT, 'dist');
  const zipTmp  = join(ROOT, `update-${VERSION}.zip`);

  // 1. Crear zip del dist (aún sin carpeta updates/)
  process.stdout.write('  Comprimiendo dist/ ...');
  crearZip(distDir, zipTmp);
  console.log(' ✓');

  // 2. Crear dist/updates/ y mover el zip
  const updatesDir = join(distDir, 'updates');
  mkdirSync(updatesDir, { recursive: true });
  copyFileSync(zipTmp, join(updatesDir, 'bundle.zip'));
  unlinkSync(zipTmp);
  console.log('  ✓ Bundle listo en dist/updates/bundle.zip');

  // 3. Crear latest.json
  writeFileSync(
    join(updatesDir, 'latest.json'),
    JSON.stringify({ version: VERSION, url: `${HOSTING_URL}/updates/bundle.zip` }, null, 2)
  );
  console.log('  ✓ Manifest creado (latest.json)');

  // 4. Deploy a Firebase Hosting
  console.log('\n  Desplegando en Firebase Hosting...\n');
  execSync('npx firebase-tools deploy --only hosting', { cwd: ROOT, stdio: 'inherit' });

  console.log(`\n✅ v${VERSION} publicada en ${HOSTING_URL}`);
  console.log('   Los usuarios recibirán la actualización al abrir la app.\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
