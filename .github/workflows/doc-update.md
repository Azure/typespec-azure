---
on:
  workflow_dispatch:
    inputs:
      config:
        description: "Package config to run"
        required: true
        type: string
      full_rebuild:
        description: "Force full knowledge rebuild (ignore incremental cache)"
        required: false
        default: false
        type: boolean

engine:
  id: copilot
  model: claude-opus-4.6
timeout-minutes: 120

permissions:
  contents: read

checkout:
  fetch-depth: 0
  submodules: recursive

runtimes:
  node:
    version: "22"
  python:
    version: "3.12"
  go:
    version: "1.25"
  java:
    version: "21"
  dotnet:
    version: "10.0"

steps:
  - name: Setup pnpm
    uses: pnpm/action-setup@v4

  - name: Setup Maven
    run: |
      MAVEN_VERSION="3.9.9"
      wget -q "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
      tar -xzf "apache-maven-${MAVEN_VERSION}-bin.tar.gz" -C "$HOME"
      rm -f "apache-maven-${MAVEN_VERSION}-bin.tar.gz"
      echo "$HOME/apache-maven-${MAVEN_VERSION}/bin" >> $GITHUB_PATH

  - name: Install repo dependencies
    run: pnpm install

  - name: Install doc-updater dependencies
    working-directory: eng/scripts/doc-updater
    run: npm install

  - name: Pre-compute context
    env:
      CONFIG_INPUT: ${{ github.event.inputs.config }}
      FULL_REBUILD_INPUT: ${{ github.event.inputs.full_rebuild }}
      GH_TOKEN: ${{ github.token }}
    run: |
      REBUILD_FLAG=""
      if [ "$FULL_REBUILD_INPUT" = "true" ]; then
        REBUILD_FLAG="--full-rebuild"
      fi

      npx tsx eng/scripts/doc-updater/src/precompute.ts \
        --config "$CONFIG_INPUT" \
        --output /tmp/gh-aw/agent/context.json \
        $REBUILD_FLAG

tools:
  edit:
  bash: true
  glob: true

network:
  allowed:
    - defaults
    - node
    - python
    - dotnet
    - java
    - go

safe-outputs:
  create-pull-request:
    title-prefix: "[Automated][${{ github.event.inputs.config }}] "
    labels: [documentation, automated]

post-steps:
  - name: Validate file scope
    env:
      CONFIG_INPUT: ${{ github.event.inputs.config }}
    run: |
      CONFIG="$CONFIG_INPUT"
      ALLOWED_FILE="eng/scripts/doc-updater/configs/${CONFIG}.yaml"

      # Read allowedPaths using the doc-updater config loader
      ALLOWED_PATHS=$(npx tsx eng/scripts/doc-updater/src/print-allowed-paths.ts --config "$CONFIG")

      if [ -z "$ALLOWED_PATHS" ]; then
        echo "WARNING: No allowedPaths in config, skipping validation"
        exit 0
      fi

      # Check every changed file against allowedPaths
      CHANGED=$(git diff --name-only HEAD 2>/dev/null || echo "")
      if [ -z "$CHANGED" ]; then
        echo "No files changed."
        exit 0
      fi

      VIOLATIONS=""
      while IFS= read -r file; do
        ALLOWED=false
        while IFS= read -r pattern; do
          if [[ "$file" == "$pattern"* ]]; then
            ALLOWED=true
            break
          fi
        done <<< "$ALLOWED_PATHS"
        if [ "$ALLOWED" = false ]; then
          VIOLATIONS="${VIOLATIONS}  - ${file}\n"
        fi
      done <<< "$CHANGED"

      if [ -n "$VIOLATIONS" ]; then
        echo "::error::Agent modified files outside allowed paths:"
        echo -e "$VIOLATIONS"
        exit 1
      fi

      echo "All modified files are within allowed paths."

  - name: Update metadata
    env:
      CONFIG_INPUT: ${{ github.event.inputs.config }}
    run: npx tsx eng/scripts/doc-updater/src/update-meta.ts --config "$CONFIG_INPUT"
---

# Documentation Update Agent

You are updating documentation for a TypeSpec package. Your task context has
been pre-computed and is available in `/tmp/gh-aw/agent/context.json`.

## Setup

1. Read `/tmp/gh-aw/agent/context.json` to understand:
   - `config` — which package you're updating
   - `mode` — "full", "incremental", or "skip"
   - `changes` — pre-extracted source code diffs (incremental mode)
   - `feedback` — code diffs from human corrections on the last documentation update PR
   - `knowledge` — current knowledge base content
   - `knowledgePath` — where to write knowledge updates
   - `allowedPaths` — which file paths you may modify

2. If `mode` is `"skip"`, report "No source changes detected" and stop.

3. Read the detailed domain-specific instructions from:
   `eng/scripts/doc-updater/prompts/${config.name}/doc-update.md`

## Important Rules

- **Only modify files** whose paths start with one of the `allowedPaths` entries
- **In incremental mode**, analyze the provided diffs in `changes.commits` to determine which documentation is affected. Only update affected pages.
- **When feedback is provided**, study the code diffs in `feedback.humanCommitDiffs` to understand what reviewers corrected for last documentation update. Update the knowledge base to capture these corrections so future runs don't repeat the same mistakes.
- **Update the knowledge base** at `knowledgePath` as you work.

## Knowledge Base Rules

Record only information that directly helps future documentation maintenance:

- **API signatures and behaviors** — exact parameter types, default values, and verified edge cases
- **Feature-to-doc mapping** — which documented feature areas or pages should stay in sync with which source capabilities
- **Doc conventions** — heading hierarchy, admonition usage, formatting patterns, and example style
- **Cross-references** — relationships between documentation sections and important source concepts

Do **not** record:

- Environment or tooling setup details
- Transient state such as commit hashes, workflow run IDs, timestamps, or PR numbers
- Full source code copies
- General knowledge unrelated to the package being documented

After updating the knowledge base, run `pnpm format:dir <knowledgePath>` to format it.

## Incremental Mode

When `mode` is `"incremental"`, the `changes.commits` array contains pre-extracted
unified diffs for each commit that changed the source code since the last update.
Analyze these diffs to understand what changed, then update only the documentation
pages affected by those changes.

## Feedback Processing

When `feedback` is present, humans modified the previous doc-update PR before
merging it. The `feedback.humanCommitDiffs` array contains the code diffs from
their commits. Study these diffs to understand what they corrected — factual
errors, formatting preferences, missing context — and update the knowledge base
accordingly.

When learning from feedback:

- If humans corrected a factual error, fix the corresponding knowledge
- If humans added clarification or context, incorporate it
- If humans changed formatting or conventions, capture that convention
- If humans effectively rejected a prior change, record what should not be done again
