/**
 * Copilot SDK session management — creating sessions, streaming output,
 * and MCP server configuration.
 */

import { CopilotClient, approveAll, type MCPServerConfig } from "@github/copilot-sdk";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Visual markers for log output
// ---------------------------------------------------------------------------

const ICONS = {
  tool: "🔧",
  toolFail: "❌",
  read: "📖",
  write: "✏️",
  search: "🔍",
  run: "▶️",
  skill: "⚡",
  subagent: "🤖",
  error: "🚨",
  warn: "⚠️",
  session: "📋",
  summary: "📊",
  compact: "📦",
} as const;

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const sessionStartTime = Date.now();

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function elapsed(): string {
  const sec = ((Date.now() - sessionStartTime) / 1000).toFixed(0);
  const m = Math.floor(Number(sec) / 60);
  const s = Number(sec) % 60;
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

/** Format a token count with commas. */
function fmtTokens(n: number | undefined): string {
  return n != null ? n.toLocaleString() : "?";
}

/** Shorten a file path for display (last 3 segments max). */
function shortPath(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts.length > 3 ? "…/" + parts.slice(-3).join("/") : p;
}

/** Turn a tool call into a human-readable one-liner with an icon. */
function describeToolCall(toolName: string, args: unknown): { icon: string; desc: string } {
  const a = (args ?? {}) as Record<string, unknown>;
  const rawPath = (a.file ?? a.filePath ?? a.path ?? a.pattern ?? "") as string;
  const path = rawPath ? shortPath(rawPath) : "";
  switch (toolName) {
    case "view":
    case "read_file":
    case "read_agent":
      return { icon: ICONS.read, desc: path ? `Reading ${path}` : `Reading file` };
    case "edit":
    case "edit_file":
    case "replace_string_in_file":
    case "multi_replace_string_in_file":
      return { icon: ICONS.write, desc: path ? `Editing ${path}` : `Editing file` };
    case "write":
    case "create":
    case "create_file":
      return { icon: ICONS.write, desc: path ? `Creating ${path}` : `Creating file` };
    case "grep":
    case "grep_search":
    case "semantic_search":
      return {
        icon: ICONS.search,
        desc: `Searching for "${a.regex ?? a.pattern ?? a.query ?? ""}"`,
      };
    case "glob":
    case "file_search":
    case "list_dir":
      return { icon: ICONS.search, desc: path ? `Listing ${path}` : `Listing files` };
    case "bash":
    case "shell":
    case "run_in_terminal":
    case "task": {
      const cmd = ((a.command ?? a.cmd ?? "") as string).slice(0, 120);
      return { icon: ICONS.run, desc: cmd ? `$ ${cmd}` : `Running command` };
    }
    case "get_file_contents":
      return { icon: ICONS.read, desc: path ? `Fetching ${path} (GitHub)` : `Fetching file` };
    case "list_commits":
      return { icon: ICONS.read, desc: `Listing commits` };
    case "get_commit": {
      const sha = ((a.sha ?? a.commit ?? "") as string).slice(0, 8);
      return { icon: ICONS.read, desc: sha ? `Inspecting commit ${sha}` : `Inspecting commit` };
    }
    default:
      return { icon: ICONS.tool, desc: `${toolName}(${path || "…"})` };
  }
}

// ---------------------------------------------------------------------------
// MCP server configuration
// ---------------------------------------------------------------------------

/**
 * Build the GitHub MCP server configuration for the knowledge-build phase.
 *
 * This gives the agent access to git/GitHub tools so it can interactively
 * explore commit history, diffs, and file contents instead of having the
 * full diff injected into the prompt.
 */
export function buildGitHubMcpConfig(): Record<string, MCPServerConfig> {
  const token = process.env.COPILOT_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
  return {
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tools: ["get_file_contents", "list_commits", "get_commit"],
    },
  };
}

// ---------------------------------------------------------------------------
// Agent session runner
// ---------------------------------------------------------------------------

export interface SessionOptions {
  model: string;
  repoRoot: string;
  phaseName: string;
  /** Optional MCP servers to attach to this session */
  mcpServers?: Record<string, MCPServerConfig>;
}

/**
 * Create a Copilot SDK session, attach event handlers, send the prompt,
 * wait for completion, and clean up.
 */
export async function runAgentSession(
  client: CopilotClient,
  prompt: string,
  opts: SessionOptions,
): Promise<void> {
  const phase = opts.phaseName;
  const header = (icon: string, msg: string) => `${icon} [${phase}] ${msg}`;

  log(header(ICONS.session, `Creating session (model: ${opts.model})...`));

  const session = await client.createSession({
    model: opts.model,
    streaming: true,
    onPermissionRequest: approveAll,
    // Keep skill access for doc-update phase (e.g., @doc-example-generator)
    skillDirectories: [resolve(opts.repoRoot, ".github/skills")],
    ...(opts.mcpServers ? { mcpServers: opts.mcpServers } : {}),
  });

  try {
    // ---------------------------------------------------------------
    // Tool calls — shows what the agent is doing
    // ---------------------------------------------------------------

    const pendingTools = new Map<string, { name: string; startMs: number }>();

    session.on("tool.execution_start", (event) => {
      const { toolCallId, toolName, arguments: toolArgs, mcpServerName, mcpToolName } = event.data;
      pendingTools.set(toolCallId, { name: toolName, startMs: Date.now() });

      const { icon, desc } = describeToolCall(toolName, toolArgs);
      const mcpLabel = mcpServerName ? ` [MCP: ${mcpServerName}/${mcpToolName}]` : "";
      log(header(icon, `${desc}${mcpLabel}`));
    });

    session.on("tool.execution_complete", (event) => {
      const { toolCallId, success, error } = event.data;
      const pending = pendingTools.get(toolCallId);
      if (!success) {
        const durationMs = pending ? Date.now() - pending.startMs : 0;
        const durationLabel = durationMs > 0 ? ` (${(durationMs / 1000).toFixed(1)}s)` : "";
        const name = pending?.name ?? "tool";
        const errMsg = error?.message ?? "unknown error";
        log(header(ICONS.toolFail, `${name} failed: ${errMsg}${durationLabel}`));
      }
      pendingTools.delete(toolCallId);
    });

    // ---------------------------------------------------------------
    // Skills & subagents
    // ---------------------------------------------------------------

    session.on("skill.invoked", (event) => {
      log(header(ICONS.skill, `Using skill: ${event.data.name} (${event.data.path})`));
    });

    session.on("subagent.started", (event) => {
      log(header(ICONS.subagent, `Subagent started: ${event.data.agentDisplayName}`));
    });

    session.on("subagent.completed", (event) => {
      log(header(ICONS.subagent, `Subagent completed: ${event.data.agentDisplayName}`));
    });

    session.on("subagent.failed", (event) => {
      log(
        header(
          ICONS.error,
          `Subagent failed: ${event.data.agentDisplayName} — ${event.data.error}`,
        ),
      );
    });

    // ---------------------------------------------------------------
    // Token usage tracking
    // ---------------------------------------------------------------

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let apiCallCount = 0;

    session.on("assistant.usage", (event) => {
      apiCallCount++;
      totalInputTokens += event.data.inputTokens ?? 0;
      totalOutputTokens += event.data.outputTokens ?? 0;
    });

    // ---------------------------------------------------------------
    // Session lifecycle — warnings, errors, compaction
    // ---------------------------------------------------------------

    session.on("session.error", (event) => {
      log(header(ICONS.error, `ERROR [${event.data.errorType}]: ${event.data.message}`));
      if (event.data.stack) {
        // Log first 3 lines of stack for debugging
        const stackLines = event.data.stack.split("\n").slice(0, 3);
        for (const line of stackLines) {
          log(`   ${line}`);
        }
      }
    });

    session.on("session.warning", (event) => {
      const d = event.data as { message?: string };
      if (d.message) log(header(ICONS.warn, d.message));
    });

    session.on("session.truncation", (event) => {
      const { tokensRemovedDuringTruncation, messagesRemovedDuringTruncation } = event.data;
      log(
        header(
          ICONS.compact,
          `Context truncated: ${fmtTokens(tokensRemovedDuringTruncation)} tokens, ${messagesRemovedDuringTruncation} messages removed`,
        ),
      );
    });

    session.on("session.compaction_start", () => {
      log(header(ICONS.compact, `Compacting context…`));
    });

    session.on("session.compaction_complete", (event) => {
      const { success, preCompactionTokens, postCompactionTokens, tokensRemoved } = event.data;
      if (success) {
        log(
          header(
            ICONS.compact,
            `Compaction done: ${fmtTokens(preCompactionTokens)} → ${fmtTokens(postCompactionTokens)} tokens (−${fmtTokens(tokensRemoved)})`,
          ),
        );
      } else {
        log(header(ICONS.error, `Compaction failed: ${event.data.error}`));
      }
    });

    session.on("session.shutdown", (event) => {
      const { totalPremiumRequests, totalApiDurationMs, codeChanges, modelMetrics } = event.data;
      log("");
      log(header(ICONS.summary, `═══ Session Summary ═══════════════════════`));
      log(`   Elapsed:          ${elapsed()}`);
      log(`   API calls:        ${totalPremiumRequests}`);
      log(`   API duration:     ${(totalApiDurationMs / 1000).toFixed(1)}s`);
      log(
        `   Tokens (total):   in: ${fmtTokens(totalInputTokens)} | out: ${fmtTokens(totalOutputTokens)}`,
      );
      if (codeChanges) {
        log(
          `   Code changes:     +${codeChanges.linesAdded} / -${codeChanges.linesRemoved} across ${codeChanges.filesModified.length} files`,
        );
      }
      if (modelMetrics) {
        for (const [model, metrics] of Object.entries(modelMetrics)) {
          const u = metrics.usage;
          log(
            `   Model ${model}: ${metrics.requests.count} requests | in: ${fmtTokens(u.inputTokens)} out: ${fmtTokens(u.outputTokens)}`,
          );
        }
      }
      log(header(ICONS.summary, `═══════════════════════════════════════════`));
    });

    // ---------------------------------------------------------------
    // Send prompt and wait
    // ---------------------------------------------------------------

    // 90-minute timeout per phase
    const TIMEOUT_MS = 90 * 60 * 1000;
    log(header(ICONS.session, `Sending prompt (${(prompt.length / 1024).toFixed(1)}KB)...`));
    const response = await session.sendAndWait({ prompt }, TIMEOUT_MS);

    if (response?.data.content) {
      log("");
      log(header(ICONS.summary, `═══ Phase Result ══════════════════════════`));
      console.log(response.data.content);
      log(header(ICONS.summary, `═══════════════════════════════════════════`));
    }
  } finally {
    await session.destroy();
  }
}
