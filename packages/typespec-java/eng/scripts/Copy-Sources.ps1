# Copy the emitter TypeScript sources (and tests) from the upstream
# @typespec/http-client-java checkout in the core/ submodule into this package,
# so `@azure-tools/typespec-java` builds the same emitter while keeping its own
# Azure-flavored `src/options.ts` (excluded from the copy).
#
# Mirrors the "Copy TypeScript code" step of autorest.java's Build-TypeSpec.ps1.

$ErrorActionPreference = "Stop"

$packageRoot = Resolve-Path (Join-Path $PSScriptRoot ".." "..")
$emitterRoot = Resolve-Path (Join-Path $packageRoot ".." ".." "core" "packages" "http-client-java" "emitter")

Copy-Item -Path (Join-Path $emitterRoot "src") -Destination $packageRoot -Exclude "options.ts" -Recurse -Force
Copy-Item -Path (Join-Path $emitterRoot "test") -Destination $packageRoot -Recurse -Force
