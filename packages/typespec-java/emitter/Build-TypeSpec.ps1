# Build the @azure-tools/typespec-java package, mirroring autorest.java's
# Build-TypeSpec.ps1. The Java emitter.jar is built from the core generator at
# core/packages/http-client-java/generator, after applying the Azure
# customization patch (core.patch) so the jar uses Azure's
# com.azure.tools:azure-autorest-customization instead of the unbranded one.
#
# Requires JDK 11+ and Apache Maven on PATH.
#
# WARNING: this script runs `git checkout .` inside the ./core submodule before
# applying the patch. Stage/commit any local changes there first.

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $packageRoot ".." ".." "..")
$coreRoot = Join-Path $repoRoot "core"
$generatorRoot = Join-Path $coreRoot "packages" "http-client-java" "generator"
$generatorPom = Join-Path $generatorRoot "pom.xml"
$patchFile = Join-Path $packageRoot "core.patch"

if (-not (Test-Path $generatorPom)) {
    Write-Error "core/ generator not found at: $generatorPom`nMake sure the 'core' submodule is checked out (git submodule update --init --recursive)."
}

Write-Host "Apply Azure customization patch to core"
Push-Location $coreRoot
try {
    git checkout .
    git apply $patchFile --ignore-whitespace
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
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

# `pnpm build` copies the emitter sources from core (excluding options.ts) and
# runs tsc. This is a pnpm workspace (workspace:^ / catalog: deps), so npm cannot
# be used here. `pnpm pack` then produces a tarball with catalog:/workspace:
# protocols resolved to real versions, which the standalone emitter-tests project
# consumes via a file: path.
Write-Host "Build and pack typespec-java (copy sources + tsc + pack)"
Push-Location $packageRoot
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
    pnpm pack --pack-destination .
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
