param (
  # skip the emitter build and only pack the .tgz; use when the package was
  # already built by a prior step (e.g. the repo-wide `pnpm build` in CI) to
  # avoid a redundant second build. The pack step still runs because the .tgz
  # is not produced by the regular build.
  [switch] $SkipBuild = $false
)

Set-Location $PSScriptRoot

Push-Location ..
try {
  if ($SkipBuild) {
    # Already built; just pack the .tgz that emitter-tests installs.
    pnpm pack --pack-destination .
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } else {
    ./Build-TypeSpec.ps1
  }
} finally {
  Pop-Location
}

if (Test-Path node_modules) {
  Remove-Item node_modules -Recurse -Force
}

if (Test-Path package-lock.json) {
  Remove-Item package-lock.json
}

# typespec-tests references typespec-java via a local file path.
# npm ci will fail when the hash of the package is different from the one in package-lock.json.
# To avoid this, we remove package-lock.json and run npm install instead.
npm install --registry=https://pkgs.dev.azure.com/azure-sdk/public/_packaging/azure-sdk-for-js/npm/registry/

# delete output
if (Test-Path tsp-output) {
  Remove-Item tsp-output -Recurse -Force
}
