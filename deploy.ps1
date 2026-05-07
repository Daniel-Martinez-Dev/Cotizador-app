# deploy.ps1 — Login + Deploy Firebase completo
# Ejecutar desde PowerShell en la raiz del proyecto:
#   .\deploy.ps1

$FIREBASE = "node `"$env:APPDATA\npm\node_modules\firebase-tools\lib\bin\firebase.js`""

Write-Host "`n=== FIREBASE DEPLOY ===" -ForegroundColor Cyan
Write-Host "Proyecto: cotizadorccs-38398" -ForegroundColor Gray

# 1. Login (abre el navegador automaticamente)
Write-Host "`n[1/3] Iniciando sesion en Firebase..." -ForegroundColor Yellow
Invoke-Expression "$FIREBASE login"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en el login. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Desplegando reglas de Firestore (RLS)..." -ForegroundColor Yellow
Invoke-Expression "$FIREBASE deploy --only firestore:rules --project cotizadorccs-38398"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al desplegar reglas de Firestore." -ForegroundColor Red
    exit 1
}
Write-Host "Reglas desplegadas correctamente." -ForegroundColor Green

Write-Host "`n[3/3] Desplegando hosting con security headers..." -ForegroundColor Yellow
Invoke-Expression "$FIREBASE deploy --only hosting --project cotizadorccs-38398"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al desplegar hosting." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== DESPLIEGUE COMPLETO ===" -ForegroundColor Green
Write-Host "Reglas Firestore: activas" -ForegroundColor Green
Write-Host "Hosting + Security Headers: activos" -ForegroundColor Green
