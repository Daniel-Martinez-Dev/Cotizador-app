const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// Sin certificado "Developer ID Application", electron-builder se salta la firma
// y deja el binario de Electron con su firma ad-hoc genérica de fábrica. Apple
// mantiene en lista negra el hash de ese binario sin modificar (lo usa mucho
// malware que reempaqueta Electron tal cual), así que Gatekeeper la bloquea
// como "malicious software" / "notarization revoked" apenas se abre.
// Firmar ad-hoc con nuestro propio identifier cambia el hash y evita ese bloqueo.
module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = fs
    .readdirSync(context.appOutDir)
    .find((f) => f.endsWith('.app'))
  if (!appName) return

  const appPath = path.join(context.appOutDir, appName)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  })
}
