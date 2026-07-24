# Sync the hand-written tests (src) and TypeSpec specs (tsp) from the upstream
# http-client-generator-test in the core/ submodule, the source of truth for the
# Java test suite.
#
# NOTE: customization/ is intentionally NOT synced -- those classes are the
# Azure-specific port (com.azure.autorest.customization) maintained in this repo,
# whereas core's customization uses the unbranded base.
#
# After syncing, core.test.patch is applied to the copied test sources to carry the
# Azure-specific edits that must diverge from core (e.g. FileUtils.java resolves the
# http-specs assets under ../node_modules, since here node_modules lives at the
# typespec-java package root rather than in the test project dir). Unlike core.patch
# (applied to a gitignored generator copy), these patched files ARE committed.
#
# Generated output (src/main, **/generated/**) is gitignored; only the
# hand-written tests and specs synced here are committed.
#
# The desired core commit is pinned in core-commit.json; CoreCommit.ps1's
# Get-CoreSourceRoot returns a directory to read the test sources from (extracted
# from the pinned commit via `git archive` when it is newer than the submodule's
# current checkout), without mutating the core/ submodule working tree.
# Remove-CoreSourceRoot cleans up any temporary extraction afterwards.

$ErrorActionPreference = "Stop"

# This script lives at the typespec-java package root. The synced tests/specs live
# under ./emitter-tests; CoreCommit.ps1 and core-commit.json are at the package root.
$packageRoot = $PSScriptRoot
$emitterTestsRoot = Join-Path $packageRoot "emitter-tests"
$coreRoot = Resolve-Path (Join-Path $packageRoot ".." ".." "core")

. (Join-Path $packageRoot "CoreCommit.ps1")
$core = Get-CoreSourceRoot -CoreRoot $coreRoot -PackageRoot $packageRoot
try {
    $testRoot = Join-Path $core.Root "generator" "http-client-generator-test"

    $localSrc = Join-Path $emitterTestsRoot "src"
    $localTsp = Join-Path $emitterTestsRoot "tsp"
    Remove-Item $localSrc -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $localTsp -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $testRoot "src") -Destination $localSrc -Recurse -Force
    Copy-Item -Path (Join-Path $testRoot "tsp") -Destination $localTsp -Recurse -Force

    Write-Host "Synced src and tsp from $testRoot"

    # Apply the Azure-specific test patch to the freshly synced sources. The patch
    # paths are relative to emitter-tests/, so run git apply from the repo root with
    # --directory (mirrors Copy-Sources.ps1's core.patch handling). Unlike core.patch,
    # the result is committed, so re-running this sync keeps the divergence in place.
    $repoRoot = Resolve-Path (Join-Path $packageRoot ".." "..")
    $patchFile = Join-Path $packageRoot "core.test.patch"
    $relEmitterTests = [System.IO.Path]::GetRelativePath($repoRoot, $emitterTestsRoot).Replace('\', '/')
    git -C $repoRoot apply --directory=$relEmitterTests -p1 $patchFile --ignore-whitespace
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to apply core.test.patch to $emitterTestsRoot."
    }
    Write-Host "Applied core.test.patch"
}
finally {
    Remove-CoreSourceRoot $core
}
