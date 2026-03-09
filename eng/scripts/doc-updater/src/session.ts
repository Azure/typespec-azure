/**
 * Copilot SDK session management — creating sessions, streaming output,
 * and MCP server configuration.
 */

import { CopilotClient, approveAll, type MCPServerConfig } from "@github/copilot-sdk";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

/** Turn a tool call into a human-readable one-liner. */
function describeToolCall(toolName: string, args: unknown): string | undefined {
  const a = (args ?? {}) as Record<string, unknown>;
  const path = (a.file ?? a.filePath ?? a.path ?? a.pattern ?? "") as string;
  switch (toolName) {
    case "view":
    case "read_file":
    case "read_agent":
      return path ? `Read ${path}` : undefined;
    case "edit":
    case "edit_file":
    case "write":
    case "create":
      return path ? `Edited ${path}` : undefined;
    case "grep":
      return `Searched for "${a.regex ?? a.pattern ?? a.query ?? ""}"`;
    case "glob":
      return `Listed files matching ${path}`;
    case "bash":
    case "shell":
    case "task": {
      const cmd = ((a.command ?? a.cmd ?? "") as string).slice(0, 120);
      return cmd ? `Running: ${cmd}` : undefined;
    }
    default:
      return undefined;
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
  log(`[${opts.phaseName}] Creating session (model: ${opts.model})...`);

  const session = await client.createSession({
    model: opts.model,
    streaming: true,
    onPermissionRequest: approveAll,
    // Keep skill access for doc-update phase (e.g., @doc-example-generator)
    skillDirectories: [resolve(opts.repoRoot, ".github/skills")],
    ...(opts.mcpServers ? { mcpServers: opts.mcpServers } : {}),
  });

  try {
    // --- Stream assistant text and reasoning output ---

    let deltaBuffer = "";
    let reasoningBuffer = "";

    session.on("assistant.message_delta", (event) => {
      deltaBuffer += event.data.deltaContent;
      const lines = deltaBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(`[${opts.phaseName}] ${line}`);
      }
      deltaBuffer = lines[0];
    });

    session.on("assistant.message", () => {
      if (deltaBuffer?.trim()) {
        log(`[${opts.phaseName}] ${deltaBuffer}`);
      }
      deltaBuffer = "";
    });

    session.on("assistant.reasoning_delta", (event) => {
      reasoningBuffer += event.data.deltaContent;
      const lines = reasoningBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(`[${opts.phaseName}] Reasoning: ${line}`);
      }
      reasoningBuffer = lines[0];
    });

    session.on("assistant.reasoning", () => {
      if (reasoningBuffer?.trim()) {
        log(`[${opts.phaseName}] Reasoning: ${reasoningBuffer}`);
      }
      reasoningBuffer = "";
    });

    session.on("tool.execution_start", (event) => {
      const desc = describeToolCall(event.data.toolName, event.data.arguments);
      if (desc) {
        log(`[${opts.phaseName}] ${desc}`);
      }
    });

    session.on("session.error", (event) => {
      log(`[${opts.phaseName}] ERROR [${event.data.errorType}]: ${event.data.message}`);
    });

    session.on("skill.invoked", (event) => {
      log(`[${opts.phaseName}] Using skill: ${event.data.name} (${event.data.path})`);
    });

    session.on("subagent.started", (event) => {
      log(`[${opts.phaseName}] Subagent started: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.completed", (event) => {
      log(`[${opts.phaseName}] Subagent completed: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.failed", (event) => {
      log(
        `[${opts.phaseName}] Subagent failed: ${event.data.agentDisplayName} — ${event.data.error}`,
      );
    });

    // 90-minute timeout per phase
    const TIMEOUT_MS = 90 * 60 * 1000;
    log(`[${opts.phaseName}] Sending prompt...`);
    const response = await session.sendAndWait({ prompt }, TIMEOUT_MS);

    if (response?.data.content) {
      log(`[${opts.phaseName}] === Summary ===`);
      console.log(response.data.content);
    }
  } finally {
    await session.destroy();
  }
}
