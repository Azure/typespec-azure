import type { SourceLocation } from "@typespec/compiler";
import type { AnalysisResult, Finding } from "./types.js";
import { isOperationIdentity } from "./types.js";
import { formatSuppressionDiff, formatSuppressionHint } from "./suppression-guidance.js";
import { resolveFindingLocation } from "./resolve-location.js";

export interface MarkdownReportOptions {
  /** Base revision/path label. */
  baseRevision?: string;
  /** Head revision/path label. */
  headRevision?: string;
  /** Spec folder paths analyzed. */
  specPaths?: string[];
  /** Include timing details. */
  showTiming?: boolean;
  /** GitHub server URL for source links (defaults to https://github.com). */
  githubServerUrl?: string;
  /** GitHub repository (e.g., "owner/repo") for source links. */
  githubRepository?: string;
  /** Git SHA for permalink source links. Uses "HEAD" as fallback. */
  githubSha?: string;
  /** Workspace root path — stripped from source locations to make relative paths. */
  workspacePath?: string;
  /** URL to the violations reference documentation. */
  violationsReferenceUrl?: string;
  /** Custom report title (defaults to "Breaking Change Analysis"). */
  reportTitle?: string;
}

/** Default URL for the violations reference docs in the typespec-azure repo. */
const DEFAULT_VIOLATIONS_REF_URL =
  "https://github.com/markcowl/typespec-azure/blob/prototype/breaking-change-tool/packages/typespec-breaking-change/docs/violations-reference.md";

/**
 * Render a Markdown summary suitable for PR comments.
 */
export function renderMarkdownSummary(
  result: AnalysisResult,
  options?: MarkdownReportOptions,
): string {
  const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
  const suppressed = result.findings.filter((f) => f.suppressed);
  const lines: string[] = [];

  const title = options?.reportTitle ?? "Breaking Change Analysis";

  // Header
  lines.push(`## ${title}`);
  lines.push("");

  // Spec path context
  if (options?.specPaths && options.specPaths.length > 0) {
    for (const sp of options.specPaths) {
      lines.push(`**Spec:** \`${sp}\``);
    }
    lines.push("");
  }

  // No comparison reason
  if (result.summary.noComparisonReason) {
    lines.push(`ℹ️ ${result.summary.noComparisonReason}`);
    lines.push("");
    return lines.join("\n");
  }

  // Status badge
  if (errors.length === 0 && suppressed.length === 0) {
    lines.push(`✅ **${formatNoFindingsMessage(result.summary.phase, result.summary.comparisonsPerformed)}**`);
  } else if (errors.length === 0) {
    lines.push(
      `⚠️ **${suppressed.length} new suppressed breaking change${suppressed.length === 1 ? "" : "s"}** — review required`,
    );
  } else {
    lines.push(
      `❌ **${errors.length} unsuppressed breaking change${errors.length === 1 ? "" : "s"} detected**`,
    );
  }

  // Summary stats
  const parts: string[] = [];
  if (errors.length > 0)
    parts.push(`${errors.length} unsuppressed`);
  if (suppressed.length > 0)
    parts.push(`${suppressed.length} suppressed`);
  parts.push(
    `${result.summary.comparisonsPerformed} version pair${result.summary.comparisonsPerformed === 1 ? "" : "s"} compared`,
  );
  lines.push("");
  lines.push(parts.join(" · "));

  // Unsuppressed breaking changes — grouped by version pair
  if (errors.length > 0) {
    lines.push("");
    lines.push("### Unsuppressed Breaking Changes");

    const grouped = groupByVersionPair(errors);
    let suppressionIndex = 0;
    const suppressionBlocks: { index: number; diff: string; label: string }[] = [];

    for (const [versionLabel, findings] of grouped) {
      lines.push("");
      lines.push(`#### ${versionLabel}`);
      lines.push("");
      lines.push("| Kind | Identity | Suppression |");
      lines.push("|------|----------|-------------|");
      for (const finding of findings) {
        suppressionIndex++;
        const kind = fmtKindLink(finding.diff.kind, finding.phase, options);
        const identity = fmtIdentityLink(finding, options);
        const hint = formatSuppressionHint(finding);
        lines.push(`| ${kind} | ${identity} | \`${esc(hint)}\` |`);
        const diffSnippet = formatSuppressionDiff(finding);
        const element = finding.diff.identity.element;
        const shortElement = element.split(".").pop() ?? element;
        suppressionBlocks.push({
          index: suppressionIndex,
          diff: diffSnippet,
          label: `${finding.diff.kind} (${shortElement})`,
        });
      }
    }

    // Render diff blocks below the tables
    if (suppressionBlocks.length > 0) {
      lines.push("");
      lines.push("<details>");
      lines.push("<summary>Suppression examples</summary>");
      lines.push("");
      for (const block of suppressionBlocks) {
        lines.push(`**${block.label}:**`);
        lines.push("```diff");
        lines.push(block.diff);
        lines.push("```");
        lines.push("");
      }
      lines.push("</details>");
    }
  }

  // New suppressed breaking changes — grouped by version pair
  if (suppressed.length > 0) {
    lines.push("");
    lines.push("### New Suppressed Breaking Changes");
    lines.push("");
    lines.push(
      "The following breaking changes have suppression decorators.",
    );
    lines.push("Reviewers should verify these changes are intentional and properly justified.");

    const grouped = groupByVersionPair(suppressed);
    for (const [versionLabel, findings] of grouped) {
      lines.push("");
      lines.push(`#### ${versionLabel}`);
      lines.push("");
      lines.push("| Kind | Identity | Reason |");
      lines.push("|------|----------|--------|");
      for (const finding of findings) {
        const kind = fmtKindLink(finding.diff.kind, finding.phase, options);
        const identity = fmtIdentityLink(finding, options);
        const reason = esc(finding.suppressionReason ?? "—");
        lines.push(`| ${kind} | ${identity} | ${reason} |`);
      }
    }
  }

  if (result.summary.versionComparisons.length > 0) {
    lines.push("");
    lines.push("<details>");
    lines.push("<summary>Version Comparisons</summary>");
    lines.push("");
    lines.push("| Service | Version Pair | Phase | Result |");
    lines.push("|---------|-------------|-------|--------|");
    for (const comparison of result.summary.versionComparisons) {
      lines.push(
        `| ${esc(comparison.serviceName)} | ${esc(formatComparisonPair(comparison.phase, comparison.baseVersion, comparison.headVersion))} | ${esc(comparison.phase)} | ${formatComparisonResult(comparison.findingCount)} |`,
      );
    }
    lines.push("");
    lines.push("</details>");
  }

  // Timing (collapsed)
  if (options?.showTiming) {
    lines.push("");
    lines.push("<details>");
    lines.push("<summary>Performance</summary>");
    lines.push("");
    lines.push(
      `Total: ${fmtMs(result.timing.totalMs)} · Version mutators: ${fmtMs(result.timing.versionMutatorsMs)} · Diff engine: ${fmtMs(result.timing.diffEngineMs)} · Classify: ${fmtMs(result.timing.classifyMs)}`,
    );
    lines.push("");
    lines.push("</details>");
  }

  lines.push("");
  return lines.join("\n");
}

/** Format a DiffKind as a link to the violations reference docs. */
function fmtKindLink(kind: string, phase: string | undefined, options?: MarkdownReportOptions): string {
  const baseUrl = options?.violationsReferenceUrl ?? DEFAULT_VIOLATIONS_REF_URL;
  const anchor = phase === "same-version"
    ? "#phase-a-same-version-findings-are-projection-bugs-not-breaking-change-classifications"
    : "#phase-b-detailed-reference";
  return `[\`${esc(kind)}\`](${baseUrl}${anchor})`;
}

/** Format the identity as a link to the source file, or plain text if no link available. */
function fmtIdentityLink(finding: Finding, options?: MarkdownReportOptions): string {
  const element = finding.diff.identity.element;
  const location = resolveFindingLocation(finding);
  const url = buildSourceUrl(location, options);

  if (url) {
    return `[\`${esc(element)}\`](${url})`;
  }
  return `\`${esc(element)}\``;
}

/** Build a GitHub source URL from a SourceLocation. */
function buildSourceUrl(
  location: SourceLocation | undefined,
  options?: MarkdownReportOptions,
): string | undefined {
  if (!location?.file?.path) return undefined;
  if (!options?.githubRepository) return undefined;

  const server = options.githubServerUrl ?? "https://github.com";
  const sha = options.githubSha ?? "HEAD";

  let filePath = location.file.path;
  // Make path relative to workspace
  if (options.workspacePath) {
    const prefix = options.workspacePath.endsWith("/")
      ? options.workspacePath
      : options.workspacePath + "/";
    if (filePath.startsWith(prefix)) {
      filePath = filePath.substring(prefix.length);
    }
  }

  // Skip non-workspace files (node_modules, intrinsics, etc.)
  if (filePath.includes("node_modules/") || filePath.startsWith("/")) {
    return undefined;
  }

  // Strip ".base" suffix from directory names (artifact of Phase A in-place compilation)
  filePath = filePath.replace(/\.base([/\\])/g, "$1");

  const line = getLineNumber(location);
  const lineAnchor = line > 0 ? `#L${line}` : "";
  return `${server}/${options.githubRepository}/blob/${sha}/${filePath}${lineAnchor}`;
}

function getLineNumber(location: SourceLocation): number {
  if (!location.file?.text || location.pos === undefined) return 0;
  const text = location.file.text.substring(0, location.pos);
  return text.split("\n").length;
}

function fmtVer(finding: Finding): string {
  return `${finding.versionPair.baseVersion} → ${finding.versionPair.headVersion}`;
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function esc(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Group findings by version pair, returning label → findings entries. */
function groupByVersionPair(findings: Finding[]): [string, Finding[]][] {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const label = f.phase === "same-version"
      ? `${f.versionPair.headVersion} (base → head)`
      : `${f.versionPair.baseVersion} → ${f.versionPair.headVersion}`;
    let list = groups.get(label);
    if (!list) {
      list = [];
      groups.set(label, list);
    }
    list.push(f);
  }
  return [...groups.entries()];
}

function formatNoFindingsMessage(phase: string | undefined, comparisonsPerformed: number): string {
  const pairLabel = `${comparisonsPerformed} version pair${comparisonsPerformed === 1 ? "" : "s"} compared`;
  switch (phase) {
    case "same-version":
      return `No unversioned changes found (${pairLabel})`;
    case "cross-version":
      return `No cross-version breaking changes found (${pairLabel})`;
    default:
      return `No breaking changes found (${pairLabel})`;
  }
}

function formatComparisonPair(phase: string, baseVersion: string, headVersion: string): string {
  if (phase === "same-version") {
    return `${headVersion} (base → head)`;
  }

  return `${baseVersion} → ${headVersion}`;
}

function formatComparisonResult(findingCount: number): string {
  return findingCount === 0
    ? "✅ No changes"
    : `❌ ${findingCount} finding${findingCount === 1 ? "" : "s"}`;
}
