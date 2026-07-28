# Build the Java emitter.jar from the generator sources that Copy-Sources.ps1
# copied out of the core/ submodule into this package's ./generator folder and
# patched with the Azure customization (core.patch). Building the copy means this
# step never touches the core/ submodule.
#
# Run Copy-Sources.ps1 first (the "build:emitter" half of the package build copies
# and patches ./generator); this is the "build:generator" half.
#
# Requires JDK 11+ and Apache Maven on PATH.

$ErrorActionPreference = "Stop"

# See Copy-Sources.ps1: silence progress so no cmdlet touches the controlling
# terminal from turbo's background process group (which would SIGTTIN/SIGTTOU-stop
# this process and hang the parallel build).
$ProgressPreference = "SilentlyContinue"

$packageRoot = $PSScriptRoot
$generatorRoot = Join-Path $packageRoot "generator"
$generatorPom = Join-Path $generatorRoot "pom.xml"
$copySourcesScript = Join-Path $packageRoot "Copy-Sources.ps1"

if (-not (Test-Path $generatorPom)) {
    Write-Error "Copied generator not found at: $generatorPom`nRun $copySourcesScript first (build:emitter) -- it copies and patches ./generator from the 'core' submodule."
}

Write-Host "Build JAR"
mvn clean install -DskipTests --define spotless:skip --no-transfer-progress -T 1C -f $generatorPom
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
