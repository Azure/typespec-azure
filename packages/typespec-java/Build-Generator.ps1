# Build the Java emitter.jar from the core generator at
# core/packages/http-client-java/generator, after applying the Azure customization
# patch (core.patch) so the jar uses Azure's com.azure.tools:azure-autorest-customization
# instead of the unbranded one. This is the "build:generator" half of the package
# build (the "build:emitter" half is Copy-Sources.ps1 + tsc).
#
# Requires JDK 11+ and Apache Maven on PATH.
#
# WARNING: this script runs `git checkout .` inside the ./core submodule to apply
# and later revert the patch. Stage/commit any local changes there first.

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $packageRoot ".." "..")
$coreRoot = Join-Path $repoRoot "core"
$generatorRoot = Join-Path $coreRoot "packages" "http-client-java" "generator"
$generatorPom = Join-Path $generatorRoot "pom.xml"
$patchFile = Join-Path $packageRoot "core.patch"

if (-not (Test-Path $generatorPom)) {
    Write-Error "core/ generator not found at: $generatorPom`nMake sure the 'core' submodule is checked out (git submodule update --init --recursive)."
}

try {
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
}
finally {
    # Revert the transient core.patch so the working tree (and the core submodule)
    # is left clean -- repo-wide `pnpm build` runs this and CI checks git status.
    git -C $coreRoot checkout .
}
