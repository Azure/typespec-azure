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
# file is present and its commit differs from the submodule's current checkout,
# Get-CoreSourceRoot extracts that commit's `packages/http-client-java` subtree into
# a temporary directory via `git archive`. The pin is authoritative: it is used
# whether it is newer or older than the current checkout (no ancestry check, which a
# shallow CI clone cannot reliably evaluate). It never checks out a different SHA or
# otherwise touches the submodule's working tree, so it is safe to run while a
# parallel monorepo build (`pnpm build`, `regen-all-packages-docs`, ...) reads the
# core/ submodule concurrently, and `git status` on core always stays clean.
#
# When core-commit.json is absent, or its commit equals the current checkout, the
# sources are read straight from the submodule's current working tree.

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

    # Never let any git invocation below block on an interactive credential or
    # host-key prompt. During a parallel `pnpm build` the emitter build runs
    # headless (turbo captures its stdio / attaches a pseudo-terminal), so a git
    # prompt has nowhere to read from and would hang the whole build forever --
    # observed as an intermittent, Java-only build hang. Make git fail fast instead.
    $env:GIT_TERMINAL_PROMPT = "0"

    # Silence progress: a cmdlet rendering Write-Progress (e.g. the archive
    # extraction below) touches the controlling terminal, and under turbo's
    # background process group that stops this process with SIGTTIN/SIGTTOU and
    # hangs the build. Scoped to this function so callers are unaffected.
    $ProgressPreference = "SilentlyContinue"

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

    # Make sure the pinned commit is available locally (the pin may be newer than
    # what has been fetched, or may live on a different line of history than the
    # submodule's current checkout). Only hit the network when the commit is
    # genuinely missing: this code runs on EVERY emitter build and doc regen, and a
    # `git fetch` on core/ is the only per-build network operation in the whole repo
    # build, so doing it unconditionally turns any transient network/credential
    # stall into a Java-only build hang. `git cat-file -e <sha>^{commit}` is a cheap,
    # offline existence check.
    git -C $CoreRoot cat-file -e "${targetSha}^{commit}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        git -C $CoreRoot fetch --quiet origin $targetSha 2>$null
        git -C $CoreRoot cat-file -e "${targetSha}^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "core-commit.json pins commit $targetSha but it could not be found or fetched in the 'core' submodule at $CoreRoot."
        }
    }

    # The pin in core-commit.json is authoritative: always build from exactly that
    # commit, regardless of whether it is an ancestor or descendant of the
    # submodule's current checkout. We deliberately do NOT gate on
    # `merge-base --is-ancestor`: a shallow submodule clone (as on CI) often lacks the
    # connecting history and cannot prove ancestry, which previously caused a silent
    # fallback to the submodule checkout and built the emitter from the wrong sources.
    # Extract only the packages/http-client-java subtree into a temp directory with
    # `git archive`. This never modifies the submodule's working tree, so it stays
    # safe under a parallel monorepo build that reads core/.
    Write-Host "Reading core sources from pinned commit $targetSha (submodule at $originSha) without checking it out"
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("typespec-java-core-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    $zipPath = Join-Path $tempDir "core.zip"
    $extractDir = Join-Path $tempDir "src"
    try {
        # Produce a zip (not tar) and expand it with .NET's ZipFile.ExtractToDirectory:
        # this keeps the whole flow inside PowerShell/.NET and avoids depending on an
        # external `tar`, whose behavior varies by platform (notably Git for Windows'
        # GNU tar treats a drive-letter path like C:\...\core.tar as a remote host).
        #
        # ExtractToDirectory is used instead of Expand-Archive on purpose: the archived
        # subtree holds several thousand files, and Expand-Archive emits a per-entry
        # Write-Progress that makes it pathologically slow on that many files (worse when
        # its output is captured by a parallel `pnpm build`), to the point the emitter
        # build looks hung. ZipFile.ExtractToDirectory has no such overhead.
        git -C $CoreRoot archive --format=zip -o $zipPath "${targetSha}:$script:CoreJavaSubtree"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to archive core commit ${targetSha}:$script:CoreJavaSubtree."
        }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractDir)
    }
    catch {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        throw
    }
    Remove-Item $zipPath -Force
    return @{ Root = $extractDir; TempDir = $tempDir }
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
