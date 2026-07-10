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
    # core-commit.json is optional: when present it pins the core commit to copy
    # sources from; when absent we just use the submodule's current checkout.
    $configPath = Join-Path $packageRoot "core-commit.json"
    $targetSha = $null
    if (Test-Path $configPath) {
        $targetSha = ((Get-Content -Raw $configPath | ConvertFrom-Json).sha).Trim()
        if ([string]::IsNullOrWhiteSpace($targetSha)) {
            Write-Error "No 'sha' found in $configPath."
        }
    }
    else {
        Write-Host "core-commit.json not found; using current core checkout $originSha."
    }

    if ($targetSha -and $targetSha -ne $originSha) {
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

    # Copy the Java generator sources out of the submodule and apply the Azure
    # customization patch (core.patch) to the copy, so building emitter.jar
    # (Build-Generator.ps1) never mutates the core/ submodule. The patch paths are
    # relative to this generator folder.
    $srcGenerator = Join-Path $coreRoot "packages" "http-client-java" "generator"
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
    # Always restore the submodule to the SHA it was at when this script started.
    git -C $coreRoot checkout --quiet $originSha
}
