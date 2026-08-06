# B4 Output Formats

## 1. Overview

`@azure-tools/typespec-breaking-change` produces three primary report shapes:

- **JSON** via `formatJsonReport()` or `--format json`
- **Markdown** via `renderMarkdownSummary()` or `--markdown-output`
- **Console** via `formatConsoleReport()` or `--format console`

These formats all represent the same `AnalysisResult`, but they serve different consumers:

- **JSON** is the machine-readable CI contract.
- **Markdown** is the human-friendly PR/report artifact.
- **Console** is the terminal summary shown during CLI runs.

> Note: the CLI also has a `--format github` mode, but the structured outputs documented here are the JSON, Markdown, and console reporters used by the current B4 workflow.

## 2. JSON Output Format

### Top-level schema

The JSON reporter serializes the following shape:

```ts
interface JsonReport {
  specPaths: string[];
  baseRevision?: string;
  headRevision?: string;
  requiresAction: boolean;
  counts: {
    errors: number;
    suppressed: number;
    ignored: number;
    totalFindings: number;
    servicesAnalyzed: number;
    comparisonsPerformed: number;
  };
  summary: AnalysisSummary;
  noComparisonReason?: string;
  findings: JsonFinding[];
  timing: TimingInfo;
}

interface JsonFinding {
  kind: string;
  severity: string;
  rule: string;
  phase: string;
  suppressed: boolean;
  suppressionReason?: string;
  message: string;
  operation?: { method: string; path: string };
  element?: string;
  component?: string;
  statusCode?: string;
  versionPair: { baseVersion: string; headVersion: string };
  location?: { file: string; line: number };
  suppression?: {
    decorator: string;
    placement: string;
    file?: string;
    example: string;
  };
}
```

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `specPaths` | `string[]` | Paths passed into the report options. CLI JSON output sets this to `[options.entry]`. |
| `baseRevision` | `string \| undefined` | Base label/path when a base program is provided. |
| `headRevision` | `string \| undefined` | Head label/path. |
| `requiresAction` | `boolean` | `true` when at least one finding has `severity === "error"` and `suppressed === false`. |
| `counts` | object | Aggregate counts for CI gating. |
| `summary` | `AnalysisSummary` | What was analyzed. |
| `noComparisonReason` | `string \| undefined` | Copied from `result.summary.noComparisonReason`. |
| `findings` | `JsonFinding[]` | One entry per classified finding. |
| `timing` | `TimingInfo` | Raw timing data from analysis. |

### `counts` object

| Field | Type | Description |
|---|---|---|
| `errors` | `number` | Unsuppressed error findings only. |
| `suppressed` | `number` | All suppressed findings, regardless of original severity. |
| `ignored` | `number` | Findings with `severity === "ignore"` and `suppressed === false`. |
| `totalFindings` | `number` | Total number of findings in `result.findings`. |
| `servicesAnalyzed` | `number` | Copied from `summary.servicesAnalyzed`. |
| `comparisonsPerformed` | `number` | Copied from `summary.comparisonsPerformed`. |

For CI, `counts.errors` and `requiresAction` are the quickest checks for unsuppressed breaking changes.

### `summary` object

`summary` is serialized directly from `AnalysisSummary`:

| Field | Type | Description |
|---|---|---|
| `servicesAnalyzed` | `number` | Number of services analyzed. |
| `comparisonsPerformed` | `number` | Number of version pairs compared. |
| `phase` | `"same-version" \| "cross-version" \| undefined` | Optional phase filter applied to the analysis. |
| `versionComparisons` | `VersionComparisonSummary[]` | Per-version comparison rollup. |
| `noComparisonReason` | `string \| undefined` | Explanation when no version pairs were compared. |

Each `versionComparisons` entry has:

| Field | Type |
|---|---|
| `serviceName` | `string` |
| `baseVersion` | `string` |
| `headVersion` | `string` |
| `phase` | `"same-version" \| "cross-version"` |
| `findingCount` | `number` |

### `timing` object

`timing` is serialized directly from `TimingInfo`:

| Field | Type | Description |
|---|---|---|
| `compileBaseMs` | `number` | Base compilation time in milliseconds. |
| `compileHeadMs` | `number` | Head compilation time in milliseconds. |
| `versionMutatorsMs` | `number` | Version mutator stage time. |
| `canonicalizeMs` | `number` | Canonicalization stage time. |
| `identityMatchingMs` | `number` | Operation identity matching time. |
| `diffEngineMs` | `number` | Diff engine time. |
| `classifyMs` | `number` | Policy classification time. |
| `suppressMs` | `number` | Suppression matching time. |
| `reportMs` | `number` | Report formatting time. |
| `totalMs` | `number` | Total analysis time. |

### `JsonFinding` fields

| Field | Type | Description |
|---|---|---|
| `kind` | `string` | Diff kind, for example `ResourcePropertyRemoved`. |
| `severity` | `string` | Current values come from `Finding.severity` (`"error"` or `"ignore"`). |
| `rule` | `string` | Policy rule name that classified the diff. |
| `phase` | `string` | `"same-version"` or `"cross-version"`. |
| `suppressed` | `boolean` | Whether a suppression decorator matched the finding. |
| `suppressionReason` | `string \| undefined` | Reason string from the suppression decorator. |
| `message` | `string` | Human-readable finding message. |
| `operation` | `{ method: string; path: string } \| undefined` | Present only for operation-scoped identities. |
| `element` | `string \| undefined` | Diff element path such as `body.properties.city`. |
| `component` | `string \| undefined` | Present for operation identities; currently `"request"` or `"response"`. |
| `statusCode` | `string \| undefined` | Present for response findings when the identity includes a status code. |
| `versionPair` | `{ baseVersion: string; headVersion: string }` | Version pair that produced the finding. |
| `location` | `{ file: string; line: number } \| undefined` | Resolved source location. `line` is 1-based. |
| `suppression` | object \| `undefined` | Present only on unsuppressed error findings. |

### `suppression` guidance object

The `suppression` object is included only when:

- `severity === "error"`, and
- `suppressed === false`

It has the following fields:

| Field | Type | Description |
|---|---|---|
| `decorator` | `string` | Exact decorator text to add. |
| `placement` | `string` | Human-readable placement instruction. |
| `file` | `string \| undefined` | Target file path when resolvable from source locations. |
| `example` | `string` | Full TypeSpec example showing the decorator in context. |

For Phase B findings, the decorator uses `@approvedBreakingChange(...)`.  
For Phase A findings, it uses `@approvedUnversionedChange(...)`.

### Complete example: report with findings

```jsonc
{
  "specPaths": ["specification/contoso/Contoso.Management/main.tsp"],
  "baseRevision": "origin/main",
  "headRevision": "HEAD",
  "requiresAction": true, // unsuppressed errors exist
  "counts": {
    "errors": 1,
    "suppressed": 1,
    "ignored": 0,
    "totalFindings": 2,
    "servicesAnalyzed": 1,
    "comparisonsPerformed": 1
  },
  "summary": {
    "servicesAnalyzed": 1,
    "comparisonsPerformed": 1,
    "phase": "cross-version",
    "versionComparisons": [
      {
        "serviceName": "Contoso.WidgetManager",
        "baseVersion": "2021-11-01",
        "headVersion": "2025-01-01",
        "phase": "cross-version",
        "findingCount": 2
      }
    ]
  },
  "findings": [
    {
      "kind": "ResourcePropertyRemoved",
      "severity": "error",
      "rule": "resource-contract-change",
      "phase": "cross-version",
      "suppressed": false,
      "message": "Resource property 'city' was removed",
      "operation": {
        "method": "GET",
        "path": "/employees/{}"
      },
      "element": "body.properties.city",
      "component": "response",
      "statusCode": "200",
      "versionPair": {
        "baseVersion": "2021-11-01",
        "headVersion": "2025-01-01"
      },
      "location": {
        "file": "specification/contoso/Contoso.Management/models.tsp",
        "line": 42
      },
      "suppression": {
        "decorator": "@approvedBreakingChange(\"your reason here\", #{ kind: \"ResourcePropertyRemoved\" })",
        "placement": "On the declaration: Contoso.WidgetManager.EmployeeProperties.city",
        "file": "specification/contoso/Contoso.Management/models.tsp",
        "example": "model EmployeeProperties {\n  @approvedBreakingChange(\"your reason here\", #{ kind: \"ResourcePropertyRemoved\" })\n  city: ...;\n}"
      }
    },
    {
      "kind": "ResourcePropertyRemoved",
      "severity": "error",
      "rule": "resource-contract-change",
      "phase": "cross-version",
      "suppressed": true,
      "suppressionReason": "Moved to FleetHub resource.",
      "message": "Resource property 'legacyRegion' was removed",
      "operation": {
        "method": "PUT",
        "path": "/employees/{}"
      },
      "element": "body.properties.legacyRegion",
      "component": "request",
      "versionPair": {
        "baseVersion": "2021-11-01",
        "headVersion": "2025-01-01"
      },
      "location": {
        "file": "specification/contoso/Contoso.Management/models.tsp",
        "line": 55
      }
    }
  ],
  "timing": {
    "compileBaseMs": 118,
    "compileHeadMs": 0,
    "versionMutatorsMs": 24,
    "canonicalizeMs": 17,
    "identityMatchingMs": 6,
    "diffEngineMs": 12,
    "classifyMs": 4,
    "suppressMs": 2,
    "reportMs": 1,
    "totalMs": 184
  }
}
```

### Complete example: clean run

```json
{
  "specPaths": ["specification/contoso/Contoso.Management/main.tsp"],
  "headRevision": "HEAD",
  "requiresAction": false,
  "counts": {
    "errors": 0,
    "suppressed": 0,
    "ignored": 0,
    "totalFindings": 0,
    "servicesAnalyzed": 1,
    "comparisonsPerformed": 2
  },
  "summary": {
    "servicesAnalyzed": 1,
    "comparisonsPerformed": 2,
    "phase": "cross-version",
    "versionComparisons": [
      {
        "serviceName": "Contoso.WidgetManager",
        "baseVersion": "2021-11-01",
        "headVersion": "2025-01-01",
        "phase": "cross-version",
        "findingCount": 0
      },
      {
        "serviceName": "Contoso.WidgetManager",
        "baseVersion": "2025-01-01",
        "headVersion": "2026-01-01",
        "phase": "cross-version",
        "findingCount": 0
      }
    ]
  },
  "findings": [],
  "timing": {
    "compileBaseMs": 0,
    "compileHeadMs": 91,
    "versionMutatorsMs": 21,
    "canonicalizeMs": 12,
    "identityMatchingMs": 4,
    "diffEngineMs": 9,
    "classifyMs": 3,
    "suppressMs": 1,
    "reportMs": 1,
    "totalMs": 142
  }
}
```

## 3. Markdown Output Format

The Markdown reporter is generated by `renderMarkdownSummary()` and is intended for PR comments or saved report artifacts.

### Overall structure

In order, the reporter may emit:

1. `## {title}` heading (`Breaking Change Analysis` by default)
2. Zero or more `**Spec:** \`...\`` lines
3. A no-comparison info message and early return, **or**
4. A status line
5. A one-line summary (`x unsuppressed · y suppressed · z version pairs compared`)
6. `### Unsuppressed Breaking Changes`
7. One `####` heading per version pair
8. A suppression examples `<details>` block
9. `### New Suppressed Breaking Changes`
10. A `Version Comparisons` `<details>` block
11. An optional `Performance` `<details>` block

### Status messages

The top status line is one of:

- `✅ **No breaking changes found (N version pairs compared)**`
- `✅ **No unversioned changes found (N version pairs compared)**`
- `✅ **No cross-version breaking changes found (N version pairs compared)**`
- `⚠️ **{N} new suppressed breaking change(s)** — review required`
- `❌ **{N} unsuppressed breaking change(s) detected**`

If `summary.noComparisonReason` is set, the report becomes:

```md
## Breaking Change Analysis

ℹ️ All versions are preview
```

### Version comparison headings

The `####` subheading format depends on phase:

- **Phase A (`same-version`)**: `{headVersion} (base → head)`
- **Phase B (`cross-version`)**: `{baseVersion} → {headVersion}`

Examples:

```md
#### 2025-01-01 (base → head)
#### 2021-11-01 → 2025-01-01
```

### Unsuppressed findings table

Each version pair gets this table:

```md
| Kind | Identity | Suppression |
|------|----------|-------------|
| [`ResourcePropertyRemoved`](...) | [`body.properties.city`](...) | `@approvedBreakingChange("your reason here", #{ kind: "ResourcePropertyRemoved" })` |
```

Notes:

- `Kind` links to the violations reference document.
- `Identity` links to source when GitHub link options are available; otherwise it is plain code text.
- `Suppression` is the inline one-line decorator hint from `formatSuppressionHint()`.

### Suppression diff blocks

Below the unsuppressed tables, the reporter emits a collapsible section:

````md
<details>
<summary>Suppression examples</summary>

**ResourcePropertyRemoved (city):**
```diff
+ @approvedBreakingChange("reason", #{ kind: "ResourcePropertyRemoved" })
  city: string;
```

</details>
````

For Phase A removed properties, the diff uses `@approvedUnversionedChange(...)` and may include a `path` option:

````md
```diff
+ @approvedUnversionedChange("reason", #{ kind: "ResourcePropertyRemoved", path: "city" })
  model EmployeeProperties {
```
````

### Suppressed findings section

Suppressed findings are rendered in a normal section, not a collapsible block:

```md
### New Suppressed Breaking Changes

The following breaking changes have suppression decorators.
Reviewers should verify these changes are intentional and properly justified.

#### 2021-11-01 → 2025-01-01

| Kind | Identity | Reason |
|------|----------|--------|
| [`ResourcePropertyRemoved`](...) | [`body.properties.city`](...) | Moved to FleetHub resource. |
```

### Phase A example

```md
## Breaking Change Analysis

❌ **1 unsuppressed breaking change detected**

1 unsuppressed · 1 version pair compared

### Unsuppressed Breaking Changes

#### 2025-01-01 (base → head)

| Kind | Identity | Suppression |
|------|----------|-------------|
| [`ResourcePropertyRemoved`](...) | [`body.properties.city`](...) | `@approvedUnversionedChange("your reason here", #{ kind: "ResourcePropertyRemoved", path: "city" })` |
```

### Phase B example

```md
## Breaking Change Analysis

❌ **1 unsuppressed breaking change detected**

1 unsuppressed · 1 suppressed · 1 version pair compared

### Unsuppressed Breaking Changes

#### 2021-11-01 → 2025-01-01

| Kind | Identity | Suppression |
|------|----------|-------------|
| [`ResourcePropertyRemoved`](...) | [`body.properties.city`](...) | `@approvedBreakingChange("your reason here", #{ kind: "ResourcePropertyRemoved" })` |

### New Suppressed Breaking Changes

#### 2021-11-01 → 2025-01-01

| Kind | Identity | Reason |
|------|----------|--------|
| [`ResourcePropertyRemoved`](...) | [`body.properties.legacyRegion`](...) | Moved to FleetHub resource. |
```

### "No findings" output

Clean runs do not emit finding tables:

```md
## Breaking Change Analysis

✅ **No cross-version breaking changes found (2 version pairs compared)**

2 version pairs compared

<details>
<summary>Version Comparisons</summary>

| Service | Version Pair | Phase | Result |
|---------|-------------|-------|--------|
| Contoso.WidgetManager | 2021-11-01 → 2025-01-01 | cross-version | ✅ No changes |
| Contoso.WidgetManager | 2025-01-01 → 2026-01-01 | cross-version | ✅ No changes |

</details>
```

### Collapsible sections

The reporter can emit these `<details>` blocks:

- `Suppression examples`
- `Version Comparisons`
- `Performance` (only when `showTiming` is true)

## 4. Console Output Format

`formatConsoleReport()` emits plain text. The current implementation does **not** insert ANSI color escape codes, so the output is safe for raw logs and text capture.

### Per-finding structure

For each visible finding:

```text
{SEVERITY}  {kind}
  {message}
  Operation: {method} {path}            // operation identities only
  Element: {element}
  Phase: {phase} ({baseVersion} → {headVersion})
  Location: {file}:{line}               // or "unknown"
  Suppress: {decorator hint}            // unsuppressed errors only
  Reason: {suppression reason}          // suppressed findings only
```

Severity labels are:

- `ERROR`
- `SUPPRESSED`
- `IGNORED`

### Summary block

The report ends with:

```text
─────────────────────────────
Results: {errors} errors, {suppressed} suppressed, {ignored} ignored ({phase})
Timing: {total}s total (compile: {compile}s, diff: {diff}s, classify: {classify}s)
```

If there are no unsuppressed errors, the summary line becomes:

- `✅ No breaking changes found (...)`
- `✅ No unversioned changes found (...)`
- `✅ No cross-version breaking changes found (...)`

### Example output

```text
ERROR  ResourcePropertyRemoved
  Resource property 'city' was removed
  Operation: GET /employees/{}
  Element: body.properties.city
  Phase: cross-version (2021-11-01 → 2025-01-01)
  Location: specification/contoso/Contoso.Management/models.tsp:42
  Suppress: @approvedBreakingChange("your reason here", #{ kind: "ResourcePropertyRemoved" })

─────────────────────────────
Results: 1 errors, 1 suppressed, 0 ignored (cross-version)
Timing: 0.2s total (compile: 0.1s, diff: 0.1s, classify: 0.0s)
```

### Visibility rules

By default:

- unsuppressed errors are shown
- suppressed findings are hidden
- ignored findings are hidden
- timing is shown

Options:

- `showSuppressed?: boolean` — include suppressed findings
- `showIgnored?: boolean` — include ignored findings
- `showTiming?: boolean` — defaults to `true`

## 5. CI Integration Contract

### Exit codes

Actual CLI behavior in `src/cli/cli.ts` is:

| Exit code | Meaning |
|---|---|
| `0` | No unsuppressed errors, and either `--fail-on-breaking` is not set or there are no suppressed findings. |
| `1` | Any unsuppressed error finding exists. Also returned when `--fail-on-breaking` is set and there are suppressed findings, even if there are no unsuppressed errors. |
| `2` | CLI/analysis failure, such as missing entry path, invalid args usage, or compilation/runtime failure. |

In code:

- `hasErrors = any finding where severity === "error" && !suppressed`
- `hasNewSuppressions = any finding where suppressed === true`
- if `--fail-on-breaking` and `(hasErrors || hasNewSuppressions)`, return `1`
- otherwise return `1` when `hasErrors`, else `0`

This means:

- unsuppressed breaking changes always fail the process
- `--fail-on-breaking` makes **new suppressions** fail the process too

### Output destinations

| Output | Destination |
|---|---|
| Console report | Always written to stdout with `console.log(output)` |
| JSON report | Written to `--json-output <path>` if provided |
| Markdown report | Written to `--markdown-output <path>` if provided |
| GitHub annotations | Written to stdout as workflow command lines when `--github-annotations` is set |

When writing JSON or Markdown files, the CLI creates the parent directory first with `mkdir(dirname(path), { recursive: true })`.

### CLI switches

| Switch | Effect |
|---|---|
| `--format console` | Print console report to stdout |
| `--format json` | Print JSON report to stdout |
| `--markdown-output <path>` | Save Markdown summary to a file |
| `--json-output <path>` | Save JSON report to a file |
| `--show-suppressed` | Affects console output only |
| `--show-ignored` | Affects console output only |
| `--report-title <title>` | Overrides Markdown `##` heading |

### Environment variables

The Markdown reporter uses these environment variables when the CLI writes `--markdown-output`:

| Variable | Purpose |
|---|---|
| `GITHUB_SERVER_URL` | Base GitHub host for source links |
| `GITHUB_REPOSITORY` | `owner/repo` for source links |
| `GITHUB_SHA` | Commit SHA used in source permalinks |
| `GITHUB_WORKSPACE` | Workspace prefix stripped from file paths |
| `VIOLATIONS_REFERENCE_URL` | Override for the violation reference document link |

If these are absent, Markdown source links degrade gracefully to plain code spans.

### GitHub Actions annotations

With `--github-annotations`, the CLI emits one workflow command per unsuppressed error:

```text
::error file=path/to/file.tsp,line=42::Breaking change: ResourcePropertyRemoved - Resource property 'city' was removed
```

If no source location can be resolved, the CLI omits `file=` and `line=`.

### Azure DevOps

There is currently **no Azure DevOps-specific annotation emitter** in `src/cli/cli.ts`. The implemented annotation integration is GitHub Actions workflow commands only.

## 6. Programmatic API

These reporter APIs are exported from the package root:

```ts
export function formatJsonReport(
  result: AnalysisResult,
  options?: JsonReportOptions,
): string;

export function renderMarkdownSummary(
  result: AnalysisResult,
  options?: MarkdownReportOptions,
): string;

export function formatConsoleReport(
  result: AnalysisResult,
  options?: ConsoleReporterOptions,
): string;
```

### Markdown naming note

The current exported Markdown function is `renderMarkdownSummary()`. There is **no** `formatMarkdownReport()` export in the current source tree.

### Reporter option types

```ts
interface JsonReportOptions {
  specPaths?: string[];
  baseRevision?: string;
  headRevision?: string;
}

interface MarkdownReportOptions {
  baseRevision?: string;
  headRevision?: string;
  specPaths?: string[];
  showTiming?: boolean;
  githubServerUrl?: string;
  githubRepository?: string;
  githubSha?: string;
  workspacePath?: string;
  violationsReferenceUrl?: string;
  reportTitle?: string;
}

interface ConsoleReporterOptions {
  showIgnored?: boolean;
  showSuppressed?: boolean;
  showTiming?: boolean;
}
```

### Library usage example

```ts
import {
  analyzeProgram,
  compileService,
  formatConsoleReport,
  formatJsonReport,
  renderMarkdownSummary,
} from "@azure-tools/typespec-breaking-change";

const program = await compileService("specification/contoso/Contoso.Management/main.tsp");
const result = analyzeProgram(program, { phase: "cross-version" });

const consoleText = formatConsoleReport(result, {
  showSuppressed: true,
});

const jsonText = formatJsonReport(result, {
  specPaths: ["specification/contoso/Contoso.Management/main.tsp"],
  headRevision: "HEAD",
});

const markdownText = renderMarkdownSummary(result, {
  specPaths: ["specification/contoso/Contoso.Management/main.tsp"],
  reportTitle: "Breaking Change Analysis",
  githubRepository: "Azure/typespec-azure",
  githubSha: process.env.GITHUB_SHA,
  githubServerUrl: process.env.GITHUB_SERVER_URL,
  workspacePath: process.env.GITHUB_WORKSPACE,
});
```

### CLI helper API

If you want CLI-equivalent formatting selection in-process, `formatResult(result, cliOptions)` from `src/cli/cli.ts` dispatches between console, JSON, and GitHub reporter output. File writing and exit code handling are implemented by `main()`, not by the reporter functions.
