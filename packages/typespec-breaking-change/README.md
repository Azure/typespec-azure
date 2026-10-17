# TypeSpec breaking-change prototype

## Baseline dependencies

`--base-ref` checks out baseline source into an isolated worktree. Both baseline
and head source are compiled using the head checkout's installed dependencies,
including the same compiler, HTTP, and versioning libraries. It does not install
the baseline lockfile or reproduce historical compiler output.

This isolates source/API changes from toolchain differences. A dependency upgrade
must retain the original API contract; TypeSpec compatibility is not assumed to
make every historical source compile. Compilation errors on either side fail the
analysis explicitly rather than reporting no changes. Dependency-link failures
also fail the checkout and retain their original error as `cause`.

## Programmatic CLI output

`main(args, { log, error })` accepts an output sink for progress, reports,
annotations, and errors. By default these go to the console. The analysis library
does not require console output.
