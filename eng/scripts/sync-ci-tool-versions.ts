import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const actionPath = ".github/actions/setup-python/action.yml";
const tools = [
  { tool: "python", action: "actions/setup-python", input: "python-version" },
  { tool: "uv", action: "astral-sh/setup-uv", input: "version" },
];

interface ToolVersionMismatch {
  tool: string;
  currentVersion: string;
  expectedVersion: string;
}

export function syncCiToolVersions(root: string, mode: "check" | "fix"): ToolVersionMismatch[] {
  const mise = readFileSync(resolve(root, "mise.toml"), "utf8");
  const toolsSection = mise.match(
    /^\[tools\][ \t]*(?:#.*)?\r?\n([\s\S]*?)(?=^\[|(?![\s\S]))/m,
  )?.[1];
  if (toolsSection === undefined) {
    throw new Error("Missing [tools] section in mise.toml.");
  }

  const file = resolve(root, actionPath);
  const content = readFileSync(file, "utf8");
  // Edit only the matching step's input, preserving action SHAs, comments and formatting.
  const steps = content.split(/(?=^ *- )/m);
  const mismatches: ToolVersionMismatch[] = [];

  for (const { tool, action, input } of tools) {
    const expectedVersion = toolsSection.match(
      new RegExp(`^${tool}[ \\t]*=[ \\t]*(["'])([^"'\\r\\n]+)\\1[ \\t]*(?:#.*)?\\r?$`, "m"),
    )?.[2];
    if (expectedVersion === undefined) {
      throw new Error(`Expected a quoted ${tool} version in mise.toml [tools].`);
    }

    const matchingSteps = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) =>
        new RegExp(`^[ \\t]*(?:- )?uses:[ \\t]*["']?${action}@`, "m").test(step),
      );
    if (matchingSteps.length !== 1) {
      throw new Error(`Expected exactly one ${action} step in ${actionPath}.`);
    }

    const { step, index } = matchingSteps[0];
    const versionPattern = new RegExp(
      `^([ \\t]+${input}:[ \\t]*)(?:"([^"\\r\\n]+)"|'([^'\\r\\n]+)'|([^\\s#]+))([ \\t]*(?:#.*)?\\r?)$`,
      "m",
    );
    const match = step.match(versionPattern);
    if (!match) {
      throw new Error(`Missing or unsupported ${input} input for ${action} in ${actionPath}.`);
    }
    const currentVersion = match[2] ?? match[3] ?? match[4];
    if (currentVersion !== expectedVersion) {
      mismatches.push({ tool, currentVersion, expectedVersion });
      steps[index] = step.replace(
        versionPattern,
        () => `${match[1]}"${expectedVersion}"${match[5]}`,
      );
    }
  }

  if (mode === "fix" && mismatches.length > 0) {
    writeFileSync(file, steps.join(""));
  }
  return mismatches;
}
