# Build the @azure-tools/typespec-java package, mirroring the relevant steps of
# autorest.java's Build-TypeSpec.ps1 -- but WITHOUT the Azure customization patch.
# The Java emitter.jar is built directly from the unbranded core generator at
# core/packages/http-client-java/generator.
#
# Requires JDK 17+ and Apache Maven on PATH.

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $packageRoot ".." "..")
$generatorRoot = Join-Path $repoRoot "core" "packages" "http-client-java" "generator"
$generatorPom = Join-Path $generatorRoot "pom.xml"

if (-not (Test-Path $generatorPom)) {
    Write-Error "core/ generator not found at: $generatorPom`nMake sure the 'core' submodule is checked out (git submodule update --init --recursive)."
}

Write-Host "Build JAR"
mvn clean install -DskipTests --define spotless:skip --no-transfer-progress -T 1C -f $generatorPom
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Copy JAR to package 'generator' directory"
$sourceTargetDir = Join-Path $generatorRoot "http-client-generator" "target"
$destTargetDir = Join-Path $packageRoot "generator" "http-client-generator" "target"
New-Item -ItemType Directory -Path (Join-Path $destTargetDir "classes") -Force | Out-Null
Copy-Item (Join-Path $sourceTargetDir "emitter.jar") (Join-Path $destTargetDir "emitter.jar") -Force
Copy-Item (Join-Path $sourceTargetDir "classes" "PerfAutomation.jfc") (Join-Path $destTargetDir "classes" "PerfAutomation.jfc") -Force

Write-Host "Copy TypeScript code from core (excluding options.ts)"
& (Join-Path $packageRoot "eng" "scripts" "Copy-Sources.ps1")

Write-Host "Build and Pack typespec-java"
Push-Location $packageRoot
try {
    npm run build
    npm pack
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
