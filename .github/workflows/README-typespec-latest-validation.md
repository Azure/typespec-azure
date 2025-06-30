# TypeSpec Latest Validation Workflow

This workflow (`typespec-latest-validation.yml`) validates that changes in the `typespec-azure` repository work correctly with the latest development version of the TypeSpec compiler and libraries.

## Purpose

- **Early Detection**: Catch breaking changes in TypeSpec before they affect production
- **Compatibility Testing**: Ensure Azure TypeSpec libraries remain compatible with upcoming TypeSpec releases
- **Integration Validation**: Similar to the external-integration workflow in the TypeSpec repository, but testing in the opposite direction

## When it runs

1. **Pull Requests**: On PRs to `main` or `release/*` branches (excludes documentation-only changes)
2. **Manual Trigger**: Can be manually triggered with optional TypeSpec branch selection
3. **Scheduled**: Daily at 6 AM UTC to catch new changes in TypeSpec main

## How it works

1. Checks out the repository with submodules
2. Updates the `core` submodule to point to the latest TypeSpec main branch (or specified ref)
3. Installs dependencies and builds TypeSpec core packages
4. Attempts to build TypeSpec Azure packages against the updated core
5. Runs basic tests to validate compatibility
6. Generates a compatibility report in the workflow summary

## Configuration

The workflow can be manually triggered with a custom TypeSpec branch/ref:

- Default: `main` (latest TypeSpec development)
- Custom: Any valid branch or commit ref from the `microsoft/typespec` repository

## Expected Behavior

- **Success**: All Azure packages build and tests pass with latest TypeSpec
- **Soft Failures**: Uses `continue-on-error` to provide feedback even when compatibility issues exist
- **Reporting**: Generates a summary report showing which components are compatible

## Relationship to azure-rest-api-specs validation

This workflow complements the TypeSpec validation in `Azure/azure-rest-api-specs` by:

- Testing at the library level rather than spec level
- Validating Azure TypeSpec library changes against TypeSpec development
- Providing early feedback to Azure TypeSpec library maintainers

## Troubleshooting

If this workflow fails:

1. Check if there are recent breaking changes in TypeSpec main
2. Review the build logs for specific compatibility issues
3. Consider if Azure libraries need updates for new TypeSpec features
4. Use manual trigger to test against specific TypeSpec branches for debugging