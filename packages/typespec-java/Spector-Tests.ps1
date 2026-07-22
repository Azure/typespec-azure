#Requires -Version 7.0

# Run the Spector tests for @azure-tools/typespec-java.
#
# Prerequisite: the SDK has been regenerated via Generate.ps1 (which builds the
# emitter and regenerates emitter-tests/src/main/java from the spector specs). This
# starts the Spector mock server, compiles and runs the JUnit tests against the
# generated SDK, then stops the server.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 3.0

# This script lives at the typespec-java package root, so the pnpm spector-* scripts
# (and node_modules) resolve from here directly. The Maven project (pom.xml, generated
# sources, coverage file) is under ./emitter-tests, entered only for `mvn` below.
Set-Location $PSScriptRoot

Write-Host "Starting the Spector server"
pnpm run spector-start

try {
    Write-Host "Compile and run the tests"
    Push-Location (Join-Path $PSScriptRoot "emitter-tests")
    try {
        mvn clean test --no-transfer-progress -T 1C
        if ($LASTEXITCODE -ne 0) {
            throw "Spector tests failed"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Write-Host "Stopping the Spector server"
    pnpm run spector-stop

    # Stage the coverage report where the ADO upload-spector-coverage.yml template
    # expects it: <package>/node_modules/@azure-tools/azure-http-specs/spec-coverage.json.
    $coverageSource = "./emitter-tests/tsp-spector-coverage-java.json"
    $coverageDest = "./node_modules/@azure-tools/azure-http-specs/spec-coverage.json"
    if (Test-Path $coverageSource) {
        Copy-Item $coverageSource $coverageDest -Force
    }
}

Write-Host "Finished running the Spector tests"
