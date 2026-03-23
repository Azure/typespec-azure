/**
 * Prompt loading and building for each pipeline phase.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DocUpdateConfig } from "./config.js";
import { getKnowledgeRelativePath, readKnowledge, type HumanFeedback } from "./state.js";

/** Directory containing per-package prompt files, relative to this source file. */
const PROMPTS_DIR = resolve(import.meta.dirname ?? ".", "../prompts");

/** Load a prompt file for a given config and phase. */
export async function loadPromptFile(configName: string, promptName: string): Promise<string> {
  const filePath = resolve(PROMPTS_DIR, configName, `${promptName}.md`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    throw new Error(
      `Prompt file not found: prompts/${configName}/${promptName}.md. ` +
        `Create this file to define the ${promptName} phase for the "${configName}" config.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Feedback prompt
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for a feedback-driven knowledge update.
 *
 * When humans modify a doc-updater PR before merging, their changes
 * represent corrections or improvements the knowledge base should learn from.
 */
export function buildFeedbackPrompt(
  config: DocUpdateConfig,
  feedback: HumanFeedback,
  existingKnowledge: string,
  docUpdatePrompt: string,
): string {
  const knowledgePath = getKnowledgeRelativePath(config.name);

  let feedbackSection = `## Human Feedback from PR #${feedback.prNumber}\n\n`;

  if (feedback.commits.length > 0) {
    feedbackSection += `### Commits added by reviewers\n\n`;
    for (const c of feedback.commits) {
      feedbackSection += `- \`${c.sha}\` — ${c.message}\n`;
    }
    feedbackSection += `\nUse GitHub MCP tools to inspect these commits and understand what the reviewers changed and why.\n\n`;
  }

  if (feedback.reviewComments.length > 0) {
    feedbackSection += `### Review comments\n\n`;
    for (const comment of feedback.reviewComments) {
      feedbackSection += `> ${comment}\n\n`;
    }
  }

  return `You are updating the knowledge base for **${config.displayName}** based on human feedback.

${config.description}

A previous automated doc-update PR was reviewed and modified by humans before being merged. Their changes indicate corrections, preferences, or additional context that the knowledge base should capture so future updates don't repeat the same mistakes.

The doc-update agent that produced the PR followed these instructions. Use them to understand the agent's intent and judge what kind of correction each human change represents:

<doc-update-instructions>
${docUpdatePrompt}
</doc-update-instructions>

${feedbackSection}

## Instructions

Review the human changes and comments. Update the knowledge base to reflect what you learn:
- If humans corrected a factual error, fix the corresponding knowledge
- If humans added context or clarification, incorporate that information
- If humans changed formatting or conventions, update the conventions section
- If humans rejected a change, note what should NOT be done

## Output

Write the updated knowledge base to: \`${knowledgePath}\`

After writing, run \`pnpm format:dir ${knowledgePath}\` to format the file.

Preserve sections not affected by the feedback. Only update what the human corrections inform.

## Current Knowledge Base

${existingKnowledge}`;
}

// ---------------------------------------------------------------------------
// Doc-update prompt
// ---------------------------------------------------------------------------

/**
 * Build the prompt for the doc-update session.
 *
 * The agent updates documentation and records useful knowledge it discovers
 * along the way into the knowledge file.
 *
 * When changedCommits are provided (incremental mode), the agent only
 * focuses on documentation affected by those changes.
 */
export async function buildDocUpdatePrompt(
  config: DocUpdateConfig,
  changedCommits?: string[],
): Promise<string> {
  const knowledgePath = getKnowledgeRelativePath(config.name);
  const existingKnowledge = await readKnowledge(config.name);
  const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
  const date = new Date().toISOString().split("T")[0];

  let prompt = docUpdatePrompt;

  prompt += `\n\n## Runtime Context\n\n`;
  prompt += `**Date:** ${date}\n`;

  if (changedCommits && changedCommits.length > 0) {
    const commits = changedCommits.map((h) => `- \`${h}\``).join("\n");
    prompt += `\n## Incremental Update Mode\n\n`;
    prompt += `This is an incremental run. Only the following commits have changed the source code since the last update:\n\n`;
    prompt += `${commits}\n\n`;
    prompt += `**Repository:** \`Azure/typespec-azure\`\n\n`;
    prompt += `Use GitHub MCP tools to inspect these commits and determine which documentation areas are affected. `;
    prompt += `Only update documentation that is impacted by these changes — do not re-review unaffected areas.\n`;
  }

  prompt += `\n## Knowledge Base\n\n`;
  prompt += `As you work, record discoveries into: \`${knowledgePath}\`\n\n`;
  prompt += `Record ONLY information that directly helps with documentation maintenance:\n\n`;
  prompt += `### What to Record\n\n`;
  prompt += `- **API signatures & behaviors** — exact parameter types, default values, edge cases you verified\n`;
  prompt += `- **Feature → doc mapping** — which source features map to which doc pages/sections, so future incremental runs know what to update\n`;
  prompt += `- **Doc conventions** — formatting patterns, heading hierarchy, admonition styles observed in existing docs\n`;
  prompt += `- **Cross-references** — relationships between doc pages and source types that should stay in sync\n\n`;
  prompt += `### What NOT to Record\n\n`;
  prompt += `- Environment/tooling setup details (Node versions, build commands)\n`;
  prompt += `- Transient state (current commit hashes, timestamps, PR numbers)\n`;
  prompt += `- Full source code copies — record signatures and behaviors, not code dumps\n`;
  prompt += `- General knowledge unrelated to the package being documented\n\n`;
  prompt += `Update the knowledge file incrementally as you go. After updating, run \`pnpm format:dir ${knowledgePath}\` to format it.\n`;

  if (existingKnowledge) {
    prompt += `\n### Current Knowledge\n\n${existingKnowledge}\n`;
  }

  return prompt;
}
