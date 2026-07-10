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

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$testRoot = Resolve-Path (Join-Path ".." ".." ".." "core" "packages" "http-client-java" "generator" "http-client-generator-test")

Remove-Item ./src -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item ./tsp -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $testRoot "src") -Destination ./src -Recurse -Force
Copy-Item -Path (Join-Path $testRoot "tsp") -Destination ./tsp -Recurse -Force

Write-Host "Synced src and tsp from $testRoot"
