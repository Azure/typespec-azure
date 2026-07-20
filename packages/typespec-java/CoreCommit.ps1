# Shared helpers for running work against the desired `core/` submodule commit.
#
# Dot-source this file to import Enter-CoreCommit / Restore-CoreCommit, then wrap
# the work in a try/finally:
#
#     . (Join-Path $packageRoot "CoreCommit.ps1")
#     $originSha = Enter-CoreCommit -CoreRoot $coreRoot -PackageRoot $packageRoot
#     try {
#         # copy/sync from the (possibly pinned) core checkout
#     }
#     finally {
#         Restore-CoreCommit -CoreRoot $coreRoot -OriginSha $originSha
#     }
#
# The desired core commit is pinned in <PackageRoot>/core-commit.json. When that
# file is present and its commit is newer than the submodule's current checkout,
# Enter-CoreCommit temporarily checks it out; Restore-CoreCommit puts the submodule
# back to its original SHA (repo-wide `pnpm build` runs these scripts and CI checks
# git status).

# Check out the pinned core commit (when newer) and return the submodule's original
# SHA so the caller can restore it in a finally block.
function Enter-CoreCommit {
    param(
        # Path to the `core/` submodule.
        [Parameter(Mandatory = $true)]
        [string] $CoreRoot,

        # Directory that contains the optional core-commit.json pin file.
        [Parameter(Mandatory = $true)]
        [string] $PackageRoot
    )

    # Capture the submodule's current SHA so the caller can restore it.
    $originSha = (git -C $CoreRoot rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to read the current SHA of the 'core' submodule at: $CoreRoot`nMake sure it is checked out (git submodule update --init --recursive)."
    }

    # core-commit.json is optional: when present it pins the core commit to use;
    # when absent we just use the submodule's current checkout.
    $configPath = Join-Path $PackageRoot "core-commit.json"
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
        git -C $CoreRoot fetch --quiet origin $targetSha 2>$null

        # Only move forward: check out the target when it is a descendant (newer)
        # of the current checkout. `merge-base --is-ancestor A B` exits 0 when A is
        # an ancestor of B, i.e. B is newer than A.
        git -C $CoreRoot merge-base --is-ancestor $originSha $targetSha
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Checking out newer core commit $targetSha (was $originSha)"
            git -C $CoreRoot checkout --quiet $targetSha
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to checkout core commit $targetSha."
            }
        }
        else {
            Write-Host "core-commit.json SHA $targetSha is not newer than current $originSha; using current checkout."
        }
    }

    return $originSha
}

# Restore the submodule to the SHA captured by Enter-CoreCommit.
function Restore-CoreCommit {
    param(
        [Parameter(Mandatory = $true)]
        [string] $CoreRoot,

        [Parameter(Mandatory = $true)]
        [string] $OriginSha
    )

    git -C $CoreRoot checkout --quiet $OriginSha
}
