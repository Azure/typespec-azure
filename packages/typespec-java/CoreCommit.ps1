# Shared helper for reading sources from the desired `core/` submodule commit
# WITHOUT mutating the submodule's working tree.
#
# Dot-source this file to import Get-CoreSourceRoot / Remove-CoreSourceRoot, then
# wrap the work in a try/finally so the temporary extraction (if any) is cleaned up:
#
#     . (Join-Path $packageRoot "CoreCommit.ps1")
#     $core = Get-CoreSourceRoot -CoreRoot $coreRoot -PackageRoot $packageRoot
#     try {
#         # read sources from under $core.Root (e.g. emitter/, generator/)
#     }
#     finally {
#         Remove-CoreSourceRoot $core
#     }
#
# The desired core commit is pinned in <PackageRoot>/core-commit.json. When that
# file is present and its commit is newer than the submodule's current checkout,
# Get-CoreSourceRoot extracts that commit's `packages/http-client-java` subtree into
# a temporary directory via `git archive`. It never checks out a different SHA or
# otherwise touches the submodule's working tree, so it is safe to run while a
# parallel monorepo build (`pnpm build`, `regen-all-packages-docs`, ...) reads the
# core/ submodule concurrently, and `git status` on core always stays clean.
#
# When core-commit.json is absent, or its commit is not newer than the current
# checkout, the sources are read straight from the submodule's current working tree.

# Path (relative to the core repo root) of the subtree the Java package reads from.
$script:CoreJavaSubtree = "packages/http-client-java"

# Resolve where to read the core Java sources from and return a descriptor:
#   @{ Root = <dir containing emitter/, generator/, ...>; TempDir = <temp dir or $null> }
# Pass the descriptor to Remove-CoreSourceRoot in a finally block to clean up.
function Get-CoreSourceRoot {
    param(
        # Path to the `core/` submodule.
        [Parameter(Mandatory = $true)]
        [string] $CoreRoot,

        # Directory that contains the optional core-commit.json pin file.
        [Parameter(Mandatory = $true)]
        [string] $PackageRoot
    )

    $originSha = (git -C $CoreRoot rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to read the current SHA of the 'core' submodule at: $CoreRoot`nMake sure it is checked out (git submodule update --init --recursive)."
    }

    $liveRoot = Join-Path $CoreRoot $script:CoreJavaSubtree

    # core-commit.json is optional: when present it pins the core commit to use;
    # when absent we just use the submodule's current checkout.
    $configPath = Join-Path $PackageRoot "core-commit.json"
    if (-not (Test-Path $configPath)) {
        Write-Host "core-commit.json not found; using current core checkout $originSha."
        return @{ Root = $liveRoot; TempDir = $null }
    }

    $targetSha = ((Get-Content -Raw $configPath | ConvertFrom-Json).sha).Trim()
    if ([string]::IsNullOrWhiteSpace($targetSha)) {
        Write-Error "No 'sha' found in $configPath."
    }

    if ($targetSha -eq $originSha) {
        return @{ Root = $liveRoot; TempDir = $null }
    }

    # Make sure the target commit is available locally (it may be newer than what
    # has been fetched); ignore failure if it is already present.
    git -C $CoreRoot fetch --quiet origin $targetSha 2>$null

    # Only move forward: use the target when it is a descendant (newer) of the
    # current checkout. `merge-base --is-ancestor A B` exits 0 when A is an ancestor
    # of B, i.e. B is newer than A.
    git -C $CoreRoot merge-base --is-ancestor $originSha $targetSha
    if ($LASTEXITCODE -ne 0) {
        Write-Host "core-commit.json SHA $targetSha is not newer than current $originSha; using current checkout."
        return @{ Root = $liveRoot; TempDir = $null }
    }

    # The target is newer: extract only its packages/http-client-java subtree into a
    # temp directory with `git archive`. This never modifies the submodule's working
    # tree, so it stays safe under a parallel monorepo build that reads core/.
    Write-Host "Reading core sources from pinned commit $targetSha (was $originSha) without checking it out"
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("typespec-java-core-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    $tarPath = Join-Path $tempDir "core.tar"
    try {
        git -C $CoreRoot archive -o $tarPath "${targetSha}:$script:CoreJavaSubtree"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to archive core commit ${targetSha}:$script:CoreJavaSubtree."
        }
        tar -x -f $tarPath -C $tempDir
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to extract core archive $tarPath."
        }
    }
    catch {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        throw
    }
    Remove-Item $tarPath -Force
    return @{ Root = $tempDir; TempDir = $tempDir }
}

# Clean up the temporary extraction created by Get-CoreSourceRoot (no-op when the
# submodule's current checkout was read directly).
function Remove-CoreSourceRoot {
    param(
        [Parameter(Mandatory = $true)]
        $CoreSource
    )

    if ($CoreSource.TempDir) {
        Remove-Item $CoreSource.TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
