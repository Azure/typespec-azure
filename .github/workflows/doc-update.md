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

concurrency:
  group: "gh-aw-${{ github.workflow }}-${{ inputs.config }}"
  job-discriminator: ${{ inputs.config }}
  queue: max

engine:
  id: copilot
  env:
    COPILOT_TASK_WAIT_TIMEOUT_SECONDS: "1800"
    DOTNET_CLI_HOME: "/tmp/gh-aw/agent/cache/dotnet"
    DOTNET_CLI_TELEMETRY_OPTOUT: "1"
    DOTNET_NOLOGO: "1"
    GOCACHE: "/tmp/gh-aw/agent/cache/go-build"
    GOMODCACHE: "/tmp/gh-aw/agent/cache/go-mod"
    MAVEN_OPTS: "-Dmaven.repo.local=/tmp/gh-aw/agent/cache/m2"
    NPM_CONFIG_CACHE: "/tmp/gh-aw/agent/cache/npm"
    NUGET_PACKAGES: "/tmp/gh-aw/agent/cache/nuget"
    PIP_CACHE_DIR: "/tmp/gh-aw/agent/cache/pip"
    PNPM_CONFIG_STORE_DIR: "/tmp/gh-aw/agent/cache/pnpm-store"
    TURBO_CACHE_DIR: "/tmp/gh-aw/agent/cache/turbo"
    UV_CACHE_DIR: "/tmp/gh-aw/agent/cache/uv"
    XDG_CACHE_HOME: "/tmp/gh-aw/agent/cache/xdg"
model: gpt-6.1-sol
timeout-minutes: 120

permissions:
  contents: read
  copilot-requests: write

checkout:
  fetch-depth: 0
  submodules: recursive

runtimes:
  node:
    version: "22"
  python:
    version: "3.12"
  go:
    version: "1.27"
  java:
    version: "21"
  dotnet:
    version: "10.0"

steps:
  - name: Prepare disposable agent caches and local bin
    run: |
      mkdir -p \
        /tmp/gh-aw/agent/cache/dotnet \
        /tmp/gh-aw/agent/cache/go-build \
        /tmp/gh-aw/agent/cache/go-mod \
        /tmp/gh-aw/agent/cache/m2 \
        /tmp/gh-aw/agent/cache/npm \
        /tmp/gh-aw/agent/cache/nuget \
        /tmp/gh-aw/agent/cache/pip \
        /tmp/gh-aw/agent/cache/pnpm-store \
        /tmp/gh-aw/agent/cache/turbo \
        /tmp/gh-aw/agent/cache/uv \
        /tmp/gh-aw/agent/cache/xdg \
        "$HOME/.local/bin" \
        "$HOME/.local/share"
      echo "$HOME/.local/bin" >> "$GITHUB_PATH"

  - name: Setup pnpm
    uses: pnpm/action-setup@v6.1.1
    with:
      dest: ~/.local/share/setup-pnpm

  - name: Expose pnpm in chroot-mounted local bin
    run: |
      ln -sf "$(command -v pnpm)" "$HOME/.local/bin/pnpm"
      if command -v pnpx >/dev/null 2>&1; then
        ln -sf "$(command -v pnpx)" "$HOME/.local/bin/pnpx"
      fi

  - name: Setup Maven
    run: |
      MAVEN_VERSION="3.9.9"
      wget -q "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
      tar -xzf "apache-maven-${MAVEN_VERSION}-bin.tar.gz" -C "$HOME/.local/share"
      rm -f "apache-maven-${MAVEN_VERSION}-bin.tar.gz"
      ln -sf "$HOME/.local/share/apache-maven-${MAVEN_VERSION}/bin/mvn" "$HOME/.local/bin/mvn"
      echo "$HOME/.local/share/apache-maven-${MAVEN_VERSION}/bin" >> "$GITHUB_PATH"

  - name: Install doc-updater dependencies
    working-directory: eng/scripts/doc-updater
    env:
      NPM_CONFIG_CACHE: /tmp/gh-aw/agent/cache/npm
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

      node eng/scripts/doc-updater/src/precompute.ts \
        --config "$CONFIG_INPUT" \
        --output /tmp/gh-aw/agent/context.json \
        ${REBUILD_FLAG:+"$REBUILD_FLAG"}

  - name: Install repo dependencies
    env:
      NPM_CONFIG_CACHE: /tmp/gh-aw/agent/cache/npm
      PNPM_CONFIG_STORE_DIR: /tmp/gh-aw/agent/cache/pnpm-store
      XDG_CACHE_HOME: /tmp/gh-aw/agent/cache/xdg
    run: pnpm install

  - name: Build workspace tooling
    env:
      NPM_CONFIG_CACHE: /tmp/gh-aw/agent/cache/npm
      PNPM_CONFIG_STORE_DIR: /tmp/gh-aw/agent/cache/pnpm-store
      TURBO_CACHE_DIR: /tmp/gh-aw/agent/cache/turbo
      XDG_CACHE_HOME: /tmp/gh-aw/agent/cache/xdg
    run: |
      MODE=$(jq -r '.mode // "full"' /tmp/gh-aw/agent/context.json)
      if [ "$MODE" = "skip" ]; then
        echo "Context mode is skip; skipping workspace package build."
        exit 0
      fi

      pnpm \
        --filter "@typespec/prettier-plugin-typespec..." \
        --filter "@typespec/tspd..." \
        --filter "@azure-tools/typespec-azure-resource-manager..." \
        --filter "@azure-tools/typespec-client-generator-core..." \
        --filter "@azure-tools/azure-http-specs^..." \
        -r build

tools:
  edit:
  bash: true

network:
  allowed:
    - defaults
    - node
    - python
    - dotnet
    - java
    - go

safe-outputs:
  noop:
    report-as-issue: false
  create-pull-request:
    title-prefix: "[Automated][${{ github.event.inputs.config }}][skip chg] "
    labels: [docs, "lib:${{ github.event.inputs.config }}"]
    max: 1

post-steps:
  - name: Validate file scope
    env:
      CONFIG_INPUT: ${{ github.event.inputs.config }}
    run: |
      CONFIG="$CONFIG_INPUT"
      ALLOWED_FILE="eng/scripts/doc-updater/configs/${CONFIG}.yaml"

      # Read allowedPaths using the doc-updater config loader
      ALLOWED_PATHS=$(node eng/scripts/doc-updater/src/print-allowed-paths.ts --config "$CONFIG")

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
   - `checkoutCommit` — the git commit hash at checkout time (pass to update-meta)

2. If `mode` is `"skip"`, report "No source changes detected" and stop.

3. Read the detailed domain-specific instructions from:
   `eng/scripts/doc-updater/prompts/${config.name}.md`

## Important Rules

- **Sandbox tools and disposable caches are pre-provisioned.** `pnpm`, `mvn`, workspace build outputs (`@typespec/prettier-plugin-typespec`, `@typespec/tspd`, library packages, and Spector dependencies), and run-scoped disposable package/build cache directories under `/tmp/gh-aw/agent/cache/` (set via `engine.env`) are already provisioned for this run. Place any temporary scratch projects (such as `@doc-example-generator` workspaces) under `/tmp/gh-aw/agent/` and delete them before finishing.
- **Use sub-agents as much as possible.** Your main context window is limited — offload all reading, investigation, and editing work to sub-agents to prevent context loss. Only keep high-level coordination state in your own context. When in doubt, use a sub-agent.
- **Sub-agents must NEVER call `create_pull_request`.** When delegating work to sub-agents, explicitly instruct them: "Do NOT call create_pull_request. Only read files, edit files, and report results back. The main agent will create the PR." Sub-agents should only use file reading, editing, and local build/validation tools.
- **Only modify files** whose paths start with one of the `allowedPaths` entries.
- **Only add a changelog entry when necessary.** Add a `.chronus/changes/` entry (for example via `pnpm change add`) only if the changes modify non-Markdown files in a versioned package (such as `lib/*.tsp` files or spec files in `packages/azure-http-specs/specs/`). Do NOT add a changelog when only `.md` documentation/knowledge files or `cspell.yaml` are modified.
- **Complete every step in the domain-specific prompt.** Do not stop after finishing one step. After each step, explicitly state which step you just completed and which step you are starting next. Continue until all steps are done.
- **Do not defer work.** Fix every issue you find in this run. Do not leave "remaining gaps" or "future work" in the knowledge base or PR description — the knowledge base is for lessons learned, not a to-do list.
- **Update the knowledge base** at `knowledgePath` as you work (see Knowledge Base Rules below).
- **Create exactly one pull request at the very end.** Only the main agent (you) may call `create_pull_request`, and only once, after ALL steps and ALL file edits are complete. Never delegate PR creation to a sub-agent.
- **Update metadata as your final step before creating the PR.** Run `node eng/scripts/doc-updater/src/update-meta.ts --config <config-name> --commit <checkoutCommit> --context /tmp/gh-aw/agent/context.json` (using the config name and `checkoutCommit` from the context) via the bash tool. This records the checkout commit hash and latest processed PR number locally without any network or `gh` CLI calls so the next incremental run knows where to start. This must be done inside the agent so the metadata file is captured by safe-outputs.

## Knowledge Base Rules

As you work, record any information at `knowledgePath` that would be useful for the next execution — things you had to look up, patterns you discovered, mistakes you corrected, or context that was hard to find. The goal is that a future run can read the knowledge base and work more efficiently.

Do **not** record:

- Transient state such as commit hashes, workflow run IDs, timestamps, or PR numbers
- Full source code copies

After updating the knowledge base, run `pnpm format:dir <knowledgePath>` to format it.

## Incremental Mode

When `mode` is `"incremental"`, the `changes.commits` array contains pre-extracted unified diffs for each commit that changed the source code since the last update. Analyze these diffs to understand what changed, then update only the documentation pages affected by those changes.

## Feedback Processing

When `feedback` is present, humans modified the previous doc-update PR before merging it. The `feedback.humanCommitDiffs` array contains the code diffs from their commits. Study these diffs to understand what they corrected, then update the knowledge base so future runs don't repeat the same mistakes.
