# Sync the hand-written tests (src) and TypeSpec specs (tsp) from the upstream
# http-client-generator-test in the core/ submodule, the source of truth for the
# Java test suite.
#
# NOTE: customization/ is intentionally NOT synced -- those classes are the
# Azure-specific port (com.azure.autorest.customization) maintained in this repo,
# whereas core's customization uses the unbranded base.
#
# Generated output (src/main, **/generated/**) is gitignored; only the
# hand-written tests and specs synced here are committed.
#
# The desired core commit is pinned in ../core-commit.json; CoreCommit.ps1's
# Get-CoreSourceRoot returns a directory to read the test sources from (extracted
# from the pinned commit via `git archive` when it is newer than the submodule's
# current checkout), without mutating the core/ submodule working tree.
# Remove-CoreSourceRoot cleans up any temporary extraction afterwards.

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$packageRoot = Resolve-Path (Join-Path $scriptRoot "..")
$coreRoot = Resolve-Path (Join-Path $scriptRoot ".." ".." ".." "core")

. (Join-Path $packageRoot "CoreCommit.ps1")
$core = Get-CoreSourceRoot -CoreRoot $coreRoot -PackageRoot $packageRoot
try {
    $testRoot = Join-Path $core.Root "generator" "http-client-generator-test"

    $localSrc = Join-Path $scriptRoot "src"
    $localTsp = Join-Path $scriptRoot "tsp"
    Remove-Item $localSrc -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $localTsp -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $testRoot "src") -Destination $localSrc -Recurse -Force
    Copy-Item -Path (Join-Path $testRoot "tsp") -Destination $localTsp -Recurse -Force

    Write-Host "Synced src and tsp from $testRoot"

    # Sync the versions of shared "dependencies" and "overrides" entries from the
    # upstream package.json so this Azure test project stays aligned with the source
    # of truth. For each package that exists in BOTH package.json files, only its
    # version is updated to match core. Entries that exist here but NOT in core (e.g.
    # @azure-tools/typespec-java, @azure-tools/typespec-liftr-base) are preserved
    # as-is -- they are never removed and their versions are left untouched. Entries
    # that exist only in core are not added. Key order and 2-space indentation are
    # preserved by ConvertTo-Json's round-trip.
    $corePackageJsonPath = Join-Path $testRoot "package.json"
    $localPackageJsonPath = Join-Path $scriptRoot "package.json"

    $corePackage = Get-Content $corePackageJsonPath -Raw | ConvertFrom-Json
    $localPackage = Get-Content $localPackageJsonPath -Raw | ConvertFrom-Json

    foreach ($section in @("dependencies", "overrides")) {
        if (-not $corePackage.$section -or -not $localPackage.$section) { continue }
        $localNames = $localPackage.$section.PSObject.Properties.Name
        foreach ($prop in $corePackage.$section.PSObject.Properties) {
            # Only touch packages that already exist locally: overwrite the version
            # with core's. Missing (core-only) packages are skipped, and local-only
            # packages are left untouched since we never iterate over them.
            if ($localNames -contains $prop.Name) {
                $localPackage.$section.$($prop.Name) = $prop.Value
            }
        }
    }

    # Re-serialize and write back. Normalize CRLF -> LF and add a single trailing
    # newline so the output matches the repo's LF convention regardless of platform.
    $json = ($localPackage | ConvertTo-Json -Depth 20).Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($localPackageJsonPath, $json + "`n")
    Write-Host "Synced dependency and override versions from $corePackageJsonPath"
}
finally {
    Remove-CoreSourceRoot $core
}

# Point the local @azure-tools/typespec-java dependency at the .tgz produced by
# this repo's emitter (Build-TypeSpec.ps1 runs `npm pack`, which names the file
# azure-tools-typespec-java-<version>.tgz). Keep both this test project's own
# version and that dependency in sync with packages/typespec-java/package.json so
# a version bump there propagates here. This depends only on the local repo, not
# on core, so it runs outside the core-commit checkout as its own read-modify-write.
$localPackageJsonPath = Join-Path $scriptRoot "package.json"
$emitterVersion = (Get-Content (Join-Path $packageRoot "package.json") -Raw | ConvertFrom-Json).version
$localPackage = Get-Content $localPackageJsonPath -Raw | ConvertFrom-Json
$localPackage.version = $emitterVersion
if ($localPackage.dependencies.PSObject.Properties.Name -contains "@azure-tools/typespec-java") {
    $localPackage.dependencies.'@azure-tools/typespec-java' = "file:../azure-tools-typespec-java-$emitterVersion.tgz"
}
$json = ($localPackage | ConvertTo-Json -Depth 20).Replace("`r`n", "`n")
[System.IO.File]::WriteAllText($localPackageJsonPath, $json + "`n")
Write-Host "Synced @azure-tools/typespec-java version to $emitterVersion"
