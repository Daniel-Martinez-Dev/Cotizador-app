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

// Empaqueta el contenido de dist/ en un zip. Los archivos quedan en la raíz del
// zip (no dentro de una carpeta "dist"), que es como el actualizador OTA espera
// encontrarlos.
//
// Hay dos caminos porque las dos máquinas desde las que se publica son
// distintas: el PC de la oficina (Windows) y el portátil (Mac).
function crearZip(distDir, zipPath) {
  if (existsSync(zipPath)) unlinkSync(zipPath);
  if (process.platform === 'win32') crearZipWindows(distDir, zipPath);
  else crearZipUnix(distDir, zipPath);
}

// En Windows se copia dist/ a una carpeta temporal antes de comprimir: el
// proyecto vive en OneDrive y Compress-Archive falla si OneDrive tiene algún
// archivo tomado mientras sincroniza.
function crearZipWindows(distDir, zipPath) {
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

// En Mac/Linux se comprime directamente desde dist/ con `zip`, que viene con el
// sistema. Se excluye updates/ por si quedó de una publicación anterior: el
// bundle no puede contener una copia de sí mismo.
function crearZipUnix(distDir, zipPath) {
  try {
    execSync(`zip -r -q "${zipPath}" . -x "updates/*"`, { cwd: distDir, stdio: 'pipe' });
  } catch (e) {
    throw new Error(`No se pudo comprimir dist/: ${e.stderr?.toString() || e.message}`);
  }
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
