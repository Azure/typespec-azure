# Copy the emitter TypeScript sources (and tests) from the upstream
# @typespec/http-client-java checkout in the core/ submodule into this package,
# so `@azure-tools/typespec-java` builds the same emitter while keeping its own
# Azure-flavored `src/options.ts` (excluded from the copy).
#
# The desired core commit is pinned in core-commit.json; CoreCommit.ps1's
# Get-CoreSourceRoot returns a directory to read the emitter/generator sources from
# (extracted from the pinned commit via `git archive` when it is newer than the
# submodule's current checkout), without ever mutating the core/ submodule working
# tree. Remove-CoreSourceRoot cleans up any temporary extraction afterwards.
#
# Mirrors the "Copy TypeScript code" step of autorest.java's Build-TypeSpec.ps1.

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $packageRoot ".." "..")
$coreRoot = Join-Path $repoRoot "core"

. (Join-Path $packageRoot "CoreCommit.ps1")
$core = Get-CoreSourceRoot -CoreRoot $coreRoot -PackageRoot $packageRoot
try {
    $emitterRoot = Join-Path $core.Root "emitter"

    Copy-Item -Path (Join-Path $emitterRoot "src") -Destination $packageRoot -Exclude "options.ts" -Recurse -Force
    Copy-Item -Path (Join-Path $emitterRoot "test") -Destination $packageRoot -Recurse -Force

    # Copy the Java generator sources out of the submodule and apply the Azure
    # customization patch (core.patch) to the copy, so building emitter.jar
    # (Build-Generator.ps1) never mutates the core/ submodule. The patch paths are
    # relative to this generator folder.
    $srcGenerator = Join-Path $core.Root "generator"
    $destGenerator = Join-Path $packageRoot "generator"
    $patchFile = Join-Path $packageRoot "core.patch"

    Write-Host "Copy generator sources from core"
    if (Test-Path $destGenerator) {
        Remove-Item $destGenerator -Recurse -Force
    }
    Copy-Item -Path $srcGenerator -Destination $destGenerator -Recurse -Force

    Write-Host "Apply Azure customization patch to copied generator"
    # Run from the repo root with --directory so git apply resolves the patch's
    # (generator-relative) paths correctly; running `git apply` from within a
    # subdirectory makes git treat the paths as repo-root-relative and skip them.
    $relGenerator = [System.IO.Path]::GetRelativePath($repoRoot, $destGenerator).Replace('\', '/')
    git -C $repoRoot apply --directory=$relGenerator -p1 $patchFile --ignore-whitespace
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to apply core.patch to $destGenerator."
    }
}
finally {
    Remove-CoreSourceRoot $core
}
