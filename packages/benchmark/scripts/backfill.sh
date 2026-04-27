#!/usr/bin/env bash
# Backfill benchmark data for the last N commits on main.
#
# Usage:
#   ./packages/benchmark/scripts/backfill.sh [NUM_COMMITS] [ITERATIONS]
#
# Defaults: 100 commits, 3 iterations per benchmark.

set -euo pipefail

NUM_COMMITS="${1:-100}"
ITERATIONS="${2:-3}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RESULTS_DIR="$(mktemp -d)"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SAVED_BENCHMARK="$(mktemp -d)"

echo "=== Benchmark Backfill ==="
echo "Commits: $NUM_COMMITS"
echo "Iterations: $ITERATIONS"
echo "Results dir: $RESULTS_DIR"
echo ""

# Step 1: Build the benchmark package on the current branch
echo "Building benchmark package on current branch..."
pnpm -r --filter "@azure-tools/typespec-benchmark..." build

# Save the built benchmark CLI, specs, and package.json
cp -r "$REPO_ROOT/packages/benchmark/dist" "$SAVED_BENCHMARK/dist"
cp -r "$REPO_ROOT/packages/benchmark/specs" "$SAVED_BENCHMARK/specs"
cp "$REPO_ROOT/packages/benchmark/package.json" "$SAVED_BENCHMARK/package.json"
echo "Saved benchmark CLI to $SAVED_BENCHMARK"
echo ""

# Step 2: Get last N commits from main (oldest first)
COMMITS=()
while IFS= read -r line; do
  COMMITS+=("$line")
done < <(git --no-pager log main --oneline -"$NUM_COMMITS" --format="%H" | awk '{a[NR]=$0} END{for(i=NR;i>=1;i--) print a[i]}')

echo "Found ${#COMMITS[@]} commits to process"
echo ""

# Check which commits already have results on benchmark-data
EXISTING_RESULTS=()
if git rev-parse --verify origin/benchmark-data >/dev/null 2>&1; then
  while IFS= read -r file; do
    sha="${file%.json}"
    sha="${sha#results/}"
    EXISTING_RESULTS+=("$sha")
  done < <(git ls-tree --name-only origin/benchmark-data -- results/ 2>/dev/null | grep -v latest.json || true)
fi

is_already_done() {
  local sha="$1"
  for existing in "${EXISTING_RESULTS[@]+"${EXISTING_RESULTS[@]}"}"; do
    if [ "$existing" = "$sha" ]; then
      return 0
    fi
  done
  return 1
}

# Stash any uncommitted changes
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Stashing uncommitted changes..."
  git stash push -m "backfill-benchmark-stash" --quiet
  STASHED=true
fi

cleanup() {
  echo ""
  echo "Cleaning up..."
  rm -rf "$REPO_ROOT/packages/benchmark" 2>/dev/null || true
  git checkout -- pnpm-lock.yaml 2>/dev/null || true
  git checkout "$CURRENT_BRANCH" --force --quiet 2>/dev/null || true
  git submodule update --init --recursive --quiet 2>/dev/null || true
  if [ "$STASHED" = true ]; then
    git stash pop --quiet 2>/dev/null || true
  fi
  echo "Results saved in: $RESULTS_DIR"
}
trap cleanup EXIT

# Helper: restore the benchmark package and wire up node_modules
restore_benchmark() {
  local bench_dir="$REPO_ROOT/packages/benchmark"
  rm -rf "$bench_dir" 2>/dev/null || true
  mkdir -p "$bench_dir"
  cp -r "$SAVED_BENCHMARK/dist" "$bench_dir/dist"
  cp -r "$SAVED_BENCHMARK/specs" "$bench_dir/specs"
  cp "$SAVED_BENCHMARK/package.json" "$bench_dir/package.json"

  # Create node_modules with symlinks to workspace packages
  mkdir -p "$bench_dir/node_modules/@typespec"
  mkdir -p "$bench_dir/node_modules/@azure-tools"

  # Link compiler and typespec packages
  for pkg in compiler openapi openapi3 http rest versioning xml json-schema events streams sse; do
    if [ -d "$REPO_ROOT/core/packages/$pkg" ]; then
      ln -sf "$REPO_ROOT/core/packages/$pkg" "$bench_dir/node_modules/@typespec/$pkg"
    fi
  done

  # Link azure packages
  for pkg in typespec-azure-core typespec-azure-resource-manager typespec-autorest typespec-client-generator-core typespec-azure-rulesets; do
    if [ -d "$REPO_ROOT/packages/$pkg" ]; then
      ln -sf "$REPO_ROOT/packages/$pkg" "$bench_dir/node_modules/@azure-tools/$pkg"
    fi
  done
}

# Step 3: Process each commit
SUCCEEDED=0
FAILED=0
SKIPPED=0

for i in "${!COMMITS[@]}"; do
  SHA="${COMMITS[$i]}"
  SHORT_SHA="${SHA:0:7}"
  PROGRESS="[$((i + 1))/${#COMMITS[@]}]"

  if is_already_done "$SHA"; then
    echo "$PROGRESS $SHORT_SHA — already has results, skipping"
    ((SKIPPED++))
    continue
  fi

  echo -n "$PROGRESS $SHORT_SHA — "

  # Clean up any benchmark artifacts from previous iteration
  rm -rf "$REPO_ROOT/packages/benchmark" 2>/dev/null || true
  git checkout -- pnpm-lock.yaml 2>/dev/null || true

  # Checkout the commit
  if ! git checkout "$SHA" --force --quiet 2>/dev/null; then
    echo "checkout failed, skipping"
    ((FAILED++))
    continue
  fi

  # Update submodules to match this commit
  if ! git submodule update --init --recursive --quiet 2>/dev/null; then
    echo "submodule update failed, skipping"
    ((FAILED++))
    continue
  fi

  # Install dependencies
  if ! pnpm install --frozen-lockfile --quiet 2>/dev/null; then
    if ! pnpm install --quiet 2>/dev/null; then
      echo "install failed, skipping"
      ((FAILED++))
      continue
    fi
  fi

  # Build compiler + azure libs (everything the benchmark depends on)
  if ! pnpm -r --filter "@typespec/compiler" --filter "@azure-tools/typespec-azure-core" \
       --filter "@azure-tools/typespec-azure-resource-manager" \
       --filter "@azure-tools/typespec-autorest" --filter "@typespec/openapi3" \
       --filter "@azure-tools/typespec-client-generator-core" \
       --filter "@azure-tools/typespec-azure-rulesets" build 2>/dev/null; then
    echo "build failed, skipping"
    ((FAILED++))
    continue
  fi

  # Restore benchmark package with symlinks
  restore_benchmark

  BENCHMARK_CLI="$REPO_ROOT/packages/benchmark/dist/src/cli.js"
  SPECS_DIR="$REPO_ROOT/packages/benchmark/specs"

  # Run benchmarks
  RESULT_FILE="$RESULTS_DIR/${SHA}.json"
  BENCH_LOG="$RESULTS_DIR/${SHA}.log"

  if node "$BENCHMARK_CLI" run --specs-dir "$SPECS_DIR" --iterations "$ITERATIONS" --output "$RESULT_FILE" > "$BENCH_LOG" 2>&1; then
    echo "done ✓"
    ((SUCCEEDED++))
  else
    echo "benchmark failed (see $BENCH_LOG)"
    ((FAILED++))
    rm -f "$RESULT_FILE"
  fi
done

echo ""
echo "=== Backfill Complete ==="
echo "Succeeded: $SUCCEEDED"
echo "Failed: $FAILED"
echo "Skipped: $SKIPPED"

# Step 4: Push results to benchmark-data branch
NEW_RESULTS=()
for f in "$RESULTS_DIR"/*.json; do
  if [ -f "$f" ]; then
    NEW_RESULTS+=("$f")
  fi
done

if [ ${#NEW_RESULTS[@]} -eq 0 ]; then
  echo ""
  echo "No new results to push."
  exit 0
fi

echo ""
echo "Pushing ${#NEW_RESULTS[@]} result(s) to benchmark-data branch..."

# Go back to original branch first
git checkout "$CURRENT_BRANCH" --force --quiet
git submodule update --init --recursive --quiet

# Switch to benchmark-data branch
if git rev-parse --verify origin/benchmark-data >/dev/null 2>&1; then
  git checkout origin/benchmark-data --force --quiet 2>/dev/null || true
  git checkout -B benchmark-data --quiet 2>/dev/null || true
else
  git checkout --orphan benchmark-data --quiet
  git rm -rf . --quiet 2>/dev/null || true
fi

mkdir -p results

for f in "${NEW_RESULTS[@]}"; do
  cp "$f" "results/"
done

# Update latest.json to the most recent result
LATEST_FILE=$(ls -t results/*.json 2>/dev/null | grep -v latest.json | head -1)
if [ -n "$LATEST_FILE" ]; then
  cp "$LATEST_FILE" results/latest.json
fi

git add results/
git commit -m "benchmark: backfill results for $SUCCEEDED commits

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" --quiet 2>/dev/null || echo "Nothing to commit"

echo "Results committed to benchmark-data branch."
echo "Run 'git push origin benchmark-data' to push to remote."
