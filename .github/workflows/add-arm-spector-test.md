---
description: On-demand agent that adds ARM spector test cases for an existing GitHub issue.

on:
  issues:
    types: [labeled]
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number to process (used for manual / feature-branch runs)."
        required: true
        type: string

if: |
  github.event_name == 'workflow_dispatch' ||
  (github.event_name == 'issues' &&
   github.event.label.name == 'lib:azure-http-specs') ||
  (github.event_name == 'issue_comment' &&
   github.event.issue.pull_request == null &&
   contains(github.event.comment.body, '/add-arm-spec'))

engine:
  id: copilot
  model: claude-opus-4.6

timeout-minutes: 90

permissions:
  contents: read
  issues: read
  pull-requests: read

runtimes:
  node:
    version: "22"

steps:
  - name: Setup pnpm
    uses: pnpm/action-setup@v4

  - name: Install repo dependencies
    run: pnpm install

tools:
  github:
    toolsets: [default]
  edit:
  bash: true

network:
  allowed:
    - defaults
    - node

safe-outputs:
  create-pull-request:
    draft: true
    title-prefix: "[arm-spector] "
    labels: [lib:azure-http-specs]
    if-no-changes: ignore
    max: 1
  noop:
    report-as-issue: false

post-steps:
  - name: Validate file scope
    run: |
      ALLOWED_PREFIXES=(
        "packages/azure-http-specs/specs/azure/resource-manager/"
        "packages/azure-http-specs/spec-summary.md"
        "cspell.yaml"
        ".chronus/changes/"
      )

      CHANGED=$(git diff --name-only HEAD 2>/dev/null || echo "")
      if [ -z "$CHANGED" ]; then
        echo "No files changed."
        exit 0
      fi

      VIOLATIONS=""
      while IFS= read -r file; do
        [ -z "$file" ] && continue
        ALLOWED=false
        for prefix in "${ALLOWED_PREFIXES[@]}"; do
          case "$file" in
            "$prefix"*) ALLOWED=true; break ;;
          esac
        done
        if [ "$ALLOWED" = false ]; then
          VIOLATIONS="${VIOLATIONS}  - ${file}\n"
        fi
      done <<< "$CHANGED"

      if [ -n "$VIOLATIONS" ]; then
        echo "::error::Agent modified files outside the ARM spector scope:"
        echo -e "$VIOLATIONS"
        exit 1
      fi

      echo "All modified files are within the allowed ARM spector scope."
---

# ARM Spector Test Agent

You add **ARM (Azure Resource Manager) spector test cases** to
`packages/azure-http-specs/specs/azure/resource-manager/` based on the
triggering GitHub issue. You **only** act when the issue is genuinely an
ARM spector test request — anything else exits silently.

## Triggering Context

The workflow is triggered by **one** of:

- An issue gets the `lib:azure-http-specs` label applied,
- An issue comment contains the slash command `/add-arm-spec`, or
- A maintainer dispatches the workflow manually via `workflow_dispatch`
  with an `issue_number` input (used for feature-branch validation
  runs).

Determine the issue number as follows:

- For `workflow_dispatch`: use
  `${{ github.event.inputs.issue_number }}`.
- For `issues` / `issue_comment`: use
  `${{ github.event.issue.number }}`.

Read the triggering issue from the GitHub event payload using the
GitHub tools (`get_issue` with that number). Also read all existing
comments on the issue (`list_issue_comments`) — the actual request
details are often there.

## Decision Gate 1 — Is this a spector-test request?

Read the issue title, body, and comments. Classify the intent:

- **Bug report**, **regression**, **question**, **feature request for an
  emitter / generator / library**, **doc fix**, or anything that is not
  "please add a spector test case" → emit a single `noop` safe-output
  with a short message ("Issue is not a spector test request — taking no
  action.") and **stop immediately**. Do not edit any files. Do not call
  `create-pull-request`.
- The issue (or a comment on it) clearly asks for a **new spector test
  case** or **scenario** to be added to the spec suite → continue to
  Gate 2.

When in doubt, stop. False negatives are preferable to spurious PRs.

## Decision Gate 2 — Is it scoped to ARM?

The repo contains many spec suites. You only handle ARM. Check whether
the requested scenario clearly belongs under
`packages/azure-http-specs/specs/azure/resource-manager/`:

- The issue mentions ARM, Azure Resource Manager, the
  `Azure.ResourceManager` namespace, ARM templates, `armProviderNamespace`,
  resource providers, tracked / proxy / extension / singleton resources,
  or the `azure-resource-manager` TypeSpec library.
- The requested URL paths look like ARM
  (`/subscriptions/{}/resourceGroups/{}/providers/...`).

If any of:

- The request targets `packages/http-specs/` (non-Azure specs),
- The request targets another `packages/azure-http-specs/specs/azure/`
  area such as `client-generator-core`, `core`, `encode`, `example`,
  `payload`, or
- The scope is unclear,

→ emit `noop` ("Issue is not scoped to ARM spector tests — taking no
action.") and stop.

## Decision Gate 3 — New folder or extend an existing one?

If you have reached this point, inventory the existing ARM scenario
folders under
`packages/azure-http-specs/specs/azure/resource-manager/`:

- `common-properties`
- `large-header`
- `method-subscription-id`
- `multi-service`
- `multi-service-shared-models`
- `non-resource`
- `operation-templates`
- `resources`

For each folder, briefly read its `main.tsp` (and `client.tsp` if
present) to understand its theme and existing scenarios.

Then choose **one** of:

- **Extend an existing folder** when the requested scenario is a
  natural extension of an existing theme (for example, "add a new
  scenario testing a singleton resource with X" naturally extends
  `resources/singleton.tsp`). Add new operations / scenarios to the
  existing `main.tsp` (or appropriate sub-file) and update the
  matching `mockapi.ts`.
- **Create a new sibling folder** when the scenario represents a
  genuinely new ARM concept that does not fit anywhere existing. Use a
  short, kebab-case folder name that describes the feature area
  (e.g. `resources`, `non-resource`). Inside, create `main.tsp` and
  `mockapi.ts` following the conventions used by the existing folders.

Briefly state your choice and reasoning before editing.

## Implementation Rules

Follow the existing repo prompt at
`.github/prompts/testserver-generation.md` **verbatim**. Key
non-negotiables:

- **Only modify** files under
  `packages/azure-http-specs/specs/azure/resource-manager/`,
  `packages/azure-http-specs/spec-summary.md` (auto-regenerated), and
  `cspell.yaml` (only if a new word needs allow-listing). The
  `post-steps` block enforces this and will fail the run otherwise.
- Every scenario gets a `@scenario` and an explicit `@scenarioDoc` that
  describes the input values and the expected output.
- Every scenario has a matching `mockapi.ts` entry.
- Scenario names follow the namespace-path convention described in
  `testserver-generation.md` (e.g.
  `Azure.ResourceManager.Resources.SingletonTrackedResources.createOrUpdate`).
- Do **not** edit `spec-summary.md` by hand — `pnpm regen-docs`
  rewrites it.
- Do **not** modify code in any other package.
- When searching for examples, restrict to
  `packages/azure-http-specs/specs/azure/resource-manager/`.

## Validation Chain (MANDATORY — all must pass)

After implementation, run these commands from
`packages/azure-http-specs/` in this exact order. If any command fails,
fix the errors and re-run the **entire** chain from the top. Only call
`create-pull-request` once every command passes:

```bash
cd packages/azure-http-specs
pnpm build              # Verify build and scenarios pass
pnpm validate-mock-apis # Verify mockapi implementations
pnpm cspell             # Check spelling
pnpm format             # Clean up formatting
pnpm lint               # Fix linting issues
pnpm regen-docs         # Regenerate spec-summary.md
```

For cspell failures: prefer fixing the spelling; if the word is valid
and project-specific, add it to `cspell.yaml`.

## Add a Changeset

From the repo root, the changeset is normally added via `pnpm change
add`. Because that command is interactive, **manually create** the
changeset file under `.chronus/changes/` instead:

- File name: `add-arm-spector-issue-<NN>-YYYY-MM-DD.md` (use the issue
  number and today's UTC date).
- Frontmatter:
  ```yaml
  ---
  # Change versioning this change affects
  changeKind: feature
  packages:
    - "@azure-tools/azure-http-specs"
  ---
  ```
- Body: one-line description matching the scenario added, e.g.
  `Add ARM spector test scenario for <feature>`.

(`.chronus/changes/` is allow-listed in the `post-steps` file-scope
check.)

## Output

- **On success**: call `create-pull-request` exactly once. The safe
  output is configured to open a **draft** PR titled
  `[arm-spector] <short description>` with label `lib:azure-http-specs`.
  In the PR body, link to the triggering issue (`Closes #N` if the
  scenario fully satisfies the request, otherwise `Refs #N`) and list
  the scenarios you added.
- **On Gate 1 / Gate 2 stop**: call `noop` exactly once with a short
  explanation. Do not call `create-pull-request`.
- **On validation failure you cannot recover from**: do **not** call
  `create-pull-request`. Instead call `noop` with the error summary so
  the workflow run surfaces it in the logs.

## Usage

To run this workflow manually on an existing issue:

1. **Label trigger**: apply the `lib:azure-http-specs` label to the
   issue. Note: this label is also used for general PR triage, so the
   workflow's Gate 1 / Gate 2 will silently skip non-ARM-spector
   issues.
2. **Slash-command trigger**: post a comment containing
   `/add-arm-spec` on the issue (works regardless of whether the label
   is applied). This is the more deliberate trigger.
3. **Manual / feature-branch trigger**: use `workflow_dispatch` with
   the `issue_number` input. Useful for validating the workflow on a
   feature branch before merging:
   ```bash
   gh workflow run add-arm-spector-test.lock.yml \
     --ref <feature-branch> \
     -f issue_number=2872
   ```

The workflow runs the full validation chain (build, validate-mock-apis,
cspell, format, lint, regen-docs) before opening a draft PR. If
validation fails, no PR is opened and the failure is reported via the
`noop` safe output. If the issue is judged not to be an ARM spector
test request, the workflow exits silently with a `noop` message.
