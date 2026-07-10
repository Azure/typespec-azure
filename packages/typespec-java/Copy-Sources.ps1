# Copy the emitter TypeScript sources (and tests) from the upstream
# @typespec/http-client-java checkout in the core/ submodule into this package,
# so `@azure-tools/typespec-java` builds the same emitter while keeping its own
# Azure-flavored `src/options.ts` (excluded from the copy).
#
# The desired core commit is pinned in core-commit.json. If that commit is newer
# than the submodule's current checkout, this script temporarily checks it out to
# copy the sources from, and always restores the submodule to its original SHA in
# the finally block (repo-wide `pnpm build` runs this and CI checks git status).
#
# Mirrors the "Copy TypeScript code" step of autorest.java's Build-TypeSpec.ps1.

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $packageRoot ".." "..")
$coreRoot = Join-Path $repoRoot "core"

# Capture the submodule's current SHA so we can restore it no matter what.
$originSha = (git -C $coreRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to read the current SHA of the 'core' submodule at: $coreRoot`nMake sure it is checked out (git submodule update --init --recursive)."
}

try {
    $configPath = Join-Path $packageRoot "core-commit.json"
    $targetSha = ((Get-Content -Raw $configPath | ConvertFrom-Json).sha).Trim()

    if ([string]::IsNullOrWhiteSpace($targetSha)) {
        Write-Error "No 'sha' found in $configPath."
    }

    if ($targetSha -ne $originSha) {
        # Make sure the target commit is available locally (it may be newer than
        # what has been fetched); ignore failure if it is already present.
        git -C $coreRoot fetch --quiet origin $targetSha 2>$null

        # Only move forward: check out the target when it is a descendant (newer)
        # of the current checkout. `merge-base --is-ancestor A B` exits 0 when A is
        # an ancestor of B, i.e. B is newer than A.
        git -C $coreRoot merge-base --is-ancestor $originSha $targetSha
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Checking out newer core commit $targetSha (was $originSha)"
            git -C $coreRoot checkout --quiet $targetSha
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to checkout core commit $targetSha."
            }
        }
        else {
            Write-Host "core-commit.json SHA $targetSha is not newer than current $originSha; using current checkout."
        }
    }

    $emitterRoot = Resolve-Path (Join-Path $coreRoot "packages" "http-client-java" "emitter")

    Copy-Item -Path (Join-Path $emitterRoot "src") -Destination $packageRoot -Exclude "options.ts" -Recurse -Force
    Copy-Item -Path (Join-Path $emitterRoot "test") -Destination $packageRoot -Recurse -Force
}
finally {
    # Always restore the submodule to the SHA it was at when this script started.
    git -C $coreRoot checkout --quiet $originSha
}
