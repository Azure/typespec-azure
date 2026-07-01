# Build the @azure-tools/typespec-java package and pack it into a .tgz.
#
# `pnpm build` runs build:generator (Build-Generator.ps1: apply core.patch, build
# emitter.jar from core, revert patch) then build:emitter (Copy-Sources.ps1 + tsc).
# `pnpm pack` then produces a tarball with the catalog:/workspace: protocols
# resolved to real versions, which the standalone emitter-tests project consumes
# via a file: path.
#
# Requires JDK 11+ and Apache Maven on PATH (for build:generator).

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
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
