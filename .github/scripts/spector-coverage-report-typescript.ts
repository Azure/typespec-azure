import type { Octokit } from "@octokit/rest";
import fs from "node:fs";
import path from "node:path";

type GitHub = InstanceType<typeof Octokit>;
type Issue = Awaited<ReturnType<GitHub["rest"]["issues"]["listForRepo"]>>["data"][number];

type Context = {
  repo: {
    owner: string;
    repo: string;
  };
};

type Core = {
  info: (message: string) => void;
  setFailed: (message: string) => void;
  setOutput: (name: string, value: string | number) => void;
};

type ScriptContext = {
  github: GitHub;
  context: Context;
  core: Core;
};

type CoverageStatus = "pass" | "fail" | "not-implemented";

type PreviousGroup = {
  skipped: boolean;
  scenarios: Set<string>;
  comment: string;
};

type ScenarioSource = {
  root: string;
  url: string;
  mockApis: Array<{
    content: string;
    directory: string;
  }>;
};

type CoverageCounts = Record<CoverageStatus, number>;

type CoverageSummary = {
  packageName: string;
  version: string;
  total: number;
  counts: CoverageCounts;
  percentage: string;
};

type ActionableGroups = Record<string, Record<string, string[]>>;

type NotImplementedByPackage = Map<string, Map<string, string[]>>;

type TaskGroup = {
  packageName: string;
  group: string;
  scenarios: string[];
};

type GroupStateResolver = (
  packageName: string,
  group: string,
  scenarios: string[],
) => { skipped: boolean; comment: string };

type ClosingPullRequestsResult = {
  repository: {
    issue: {
      closedByPullRequestsReferences: {
        nodes: Array<{
          number: number;
          state: "OPEN" | "CLOSED" | "MERGED";
        }>;
      };
    };
  };
};

/**
 * Publish the latest Spector results while preserving manual skip decisions from the current
 * report. Outputs the report issue number and actionable scenarios for the task job.
 */
export async function updateCoverageReport({
  github,
  context,
  core,
}: ScriptContext): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace) {
    core.setFailed("GITHUB_WORKSPACE is not defined.");
    return;
  }

  const reportTitle = "[typespec-ts] Spector Coverage Report";
  const coverage = readCoverage(workspace, core);
  const backlogMatchers = readBacklogMatchers(workspace, core);
  if (!coverage || !backlogMatchers) {
    return;
  }
  const isBacklogScenario = (scenarioName: string): boolean =>
    backlogMatchers.some((matcher) => matcher.test(scenarioName));
  const { owner, repo } = context.repo;
  const openIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  const reportIssue = openIssues.find(
    (issue) => issue.title === reportTitle && issue.pull_request === undefined,
  );

  const previousGroups = parsePreviousGroups(reportIssue?.body);
  const coverageState = summarizeCoverage(coverage, core);
  if (!coverageState) {
    return;
  }
  const { summaries, notImplementedByPackage } = coverageState;
  const getGroupState = createGroupStateResolver(previousGroups, isBacklogScenario);
  const issueBody = renderCoverageReport({
    reportTitle,
    summaries,
    notImplementedByPackage,
    previousGroups,
    getGroupState,
    getGroupUrl: createGroupUrlResolver(loadScenarioSources(workspace)),
  });
  let issueNumber: number;
  if (reportIssue) {
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: reportIssue.number,
      body: issueBody,
    });
    issueNumber = reportIssue.number;
    core.info(`Updated issue #${reportIssue.number} in ${owner}/${repo}.`);
  } else {
    const created = await github.rest.issues.create({
      owner,
      repo,
      title: reportTitle,
      body: issueBody,
    });
    issueNumber = created.data.number;
    core.info(`Created issue #${created.data.number} in ${owner}/${repo}.`);
  }

  const actionableGroups = buildActionableGroups(
    notImplementedByPackage,
    getGroupState,
    isBacklogScenario,
  );

  core.setOutput("issue_number", issueNumber);
  core.setOutput("not_implemented", JSON.stringify(actionableGroups));
}

/**
 * Reuse an inactive implementation task or create one for actionable scenarios. Active Copilot
 * tasks and tasks with open implementation PRs are left untouched.
 */
export async function createOrUpdateImplementationTask({
  github,
  context,
  core,
}: ScriptContext): Promise<void> {
  const coverageIssueNumber = Number(process.env.COVERAGE_ISSUE_NUMBER);
  const notImplemented = parseActionableGroups(process.env.NOT_IMPLEMENTED, core);
  if (!notImplemented) {
    return;
  }

  const { owner, repo } = context.repo;
  const groups = flattenActionableGroups(notImplemented);
  if (groups.length === 0) {
    core.info("No actionable not-implemented scenario groups were found.");
    return;
  }

  const taskMarker = "<!-- typespec-ts-spector-implementation-task -->";
  const legacyTaskTitlePrefix = "[Copilot] Verify and implement Spector tests for ";
  // cspell:ignore Jialin kazrael
  const taskAssignees = ["JialinHuang803", "kazrael2119"];
  const openIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    labels: "emitter:typescript",
    per_page: 100,
  });
  const taskIssues = findTaskIssues(openIssues, taskMarker, legacyTaskTitlePrefix);

  for (const issue of taskIssues) {
    const activeReason = await getActiveTaskReason(github, owner, repo, issue);
    if (activeReason) {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: coverageIssueNumber,
        body: `🤖 Task issue #${issue.number} is already active because ${activeReason}; no task issue was created or updated.`,
      });
      core.info(
        `Task issue #${issue.number} is active because ${activeReason}; no task issue will be created or updated.`,
      );
      return;
    }
  }

  const taskBody = renderImplementationTaskBody(
    taskMarker,
    groups,
    owner,
    repo,
    coverageIssueNumber,
  );

  const title = `[Copilot] Verify and implement Spector tests for ${groups.length} scenario groups`;
  const existingTask = taskIssues[0];
  let taskIssue: Issue;
  let action: "created" | "updated";
  if (existingTask) {
    const updated = await github.rest.issues.update({
      owner,
      repo,
      issue_number: existingTask.number,
      title,
      body: taskBody,
      assignees: taskAssignees,
    });
    taskIssue = updated.data;
    action = "updated";
  } else {
    const created = await github.rest.issues.create({
      owner,
      repo,
      title,
      body: taskBody,
      labels: ["emitter:typescript"],
      assignees: taskAssignees,
    });
    taskIssue = created.data;
    action = "created";
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: coverageIssueNumber,
    body: `🤖 Task issue #${taskIssue.number} has been ${action} for ${groups.length} not-implemented scenario groups.`,
  });

  core.info(
    `${action === "created" ? "Created" : "Updated"} task issue #${taskIssue.number} in ${owner}/${repo}.`,
  );
}

function readCoverage(workspace: string, core: Core): unknown[] | undefined {
  const coveragePath = path.join(
    workspace,
    "packages/typespec-ts/coverage/spector-coverage-typescript-azure.json",
  );
  if (!fs.existsSync(coveragePath)) {
    core.setFailed(`Spector coverage file was not generated: ${coveragePath}`);
    return undefined;
  }

  const coverage: unknown = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
  if (!Array.isArray(coverage)) {
    core.setFailed("Spector coverage file must contain an array of coverage reports.");
    return undefined;
  }
  return coverage;
}

function readBacklogMatchers(workspace: string, core: Core): RegExp[] | undefined {
  const scenarioTiersPath = path.join(workspace, "website/src/pages/can-i-use/scenario-tiers.ts");
  const scenarioTiers = fs.readFileSync(scenarioTiersPath, "utf8");
  const backlogBlock = scenarioTiers.match(/Backlog:\s*\[([\s\S]*?)\n\s*\],/);
  if (!backlogBlock) {
    core.setFailed(`Could not read the Backlog tier from ${scenarioTiersPath}.`);
    return undefined;
  }

  return [...backlogBlock[1].matchAll(/^\s*"([^"]+)",\s*$/gm)].map(([, pattern]) => {
    const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${regexPattern}$`);
  });
}

function loadScenarioSources(workspace: string): Map<string, ScenarioSource> {
  const sources = new Map<string, ScenarioSource>([
    [
      "@azure-tools/azure-http-specs",
      {
        root: path.join(workspace, "packages/azure-http-specs/specs"),
        url: "https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs/specs",
        mockApis: [],
      },
    ],
    [
      "@typespec/http-specs",
      {
        root: path.join(workspace, "core/packages/http-specs/specs"),
        url: "https://github.com/microsoft/typespec/tree/main/packages/http-specs/specs",
        mockApis: [],
      },
    ],
  ]);

  for (const source of sources.values()) {
    source.mockApis = findMockApiFiles(source.root).map((file) => ({
      content: fs.readFileSync(file, "utf8"),
      directory: path.relative(source.root, path.dirname(file)).split(path.sep).join("/"),
    }));
  }
  return sources;
}

function createGroupUrlResolver(
  sources: Map<string, ScenarioSource>,
): (packageName: string, group: string) => string | undefined {
  return (packageName, group) => {
    const source = sources.get(packageName);
    if (!source) {
      return undefined;
    }

    const registration = `Scenarios.${group}_`;
    const match = source.mockApis.find(({ content }) => content.includes(registration));
    return match ? `${source.url}/${match.directory}` : undefined;
  };
}

function createGroupStateResolver(
  previousGroups: Map<string, PreviousGroup>,
  isBacklogScenario: (scenarioName: string) => boolean,
): GroupStateResolver {
  return (packageName, group, scenarios) => {
    const previous = previousGroups.get(`${packageName}\0${group}`);
    const backlogScenarios = scenarios.filter((scenario) =>
      isBacklogScenario(`${group}_${scenario}`),
    );
    const allBacklog = scenarios.length > 0 && backlogScenarios.length === scenarios.length;
    const previousComment = previous?.comment ?? "";
    const backlogManagedComment = /^Backlog(?:$| scenarios:)/i.test(previousComment);
    let skipped = previous?.skipped ?? false;
    let comment = previousComment;

    if (allBacklog) {
      skipped = true;
      if (backlogManagedComment || comment.length === 0) {
        comment = "Backlog";
      } else if (!/\bBacklog\b/i.test(comment)) {
        comment = `${comment}; Backlog`;
      }
    } else if (backlogScenarios.length > 0) {
      const backlogComment = `Backlog scenarios: ${backlogScenarios.join(", ")}`;
      if (backlogManagedComment || comment.length === 0) {
        skipped = false;
        comment = backlogComment;
      } else if (!/\bBacklog\b/i.test(comment)) {
        comment = `${comment}; ${backlogComment}`;
      }
    } else if (backlogManagedComment) {
      skipped = false;
      comment = "";
    }

    return { skipped, comment };
  };
}

function summarizeCoverage(
  coverage: unknown[],
  core: Core,
): { summaries: CoverageSummary[]; notImplementedByPackage: NotImplementedByPackage } | undefined {
  const validStatuses = new Set<CoverageStatus>(["pass", "fail", "not-implemented"]);
  const notImplementedByPackage: NotImplementedByPackage = new Map();
  const summaries: CoverageSummary[] = [];

  for (const entry of coverage) {
    if (!isRecord(entry)) {
      core.setFailed("Spector coverage file contains an invalid report entry.");
      return undefined;
    }

    const metadata = entry.scenariosMetadata;
    const results = entry.results;
    if (
      !isRecord(metadata) ||
      typeof metadata.packageName !== "string" ||
      typeof metadata.version !== "string" ||
      !isRecord(results)
    ) {
      core.setFailed("Spector coverage file contains an invalid report entry.");
      return undefined;
    }

    const counts: CoverageCounts = {
      pass: 0,
      fail: 0,
      "not-implemented": 0,
    };
    const groups = new Map<string, string[]>();
    for (const [scenarioName, status] of Object.entries(results)) {
      if (typeof status !== "string" || !validStatuses.has(status as CoverageStatus)) {
        core.setFailed(`Scenario "${scenarioName}" has an unknown coverage status: ${status}`);
        return undefined;
      }

      const coverageStatus = status as CoverageStatus;
      counts[coverageStatus]++;
      if (coverageStatus === "not-implemented") {
        const separator = scenarioName.lastIndexOf("_");
        const group = separator === -1 ? scenarioName : scenarioName.slice(0, separator);
        const scenario = separator === -1 ? scenarioName : scenarioName.slice(separator + 1);
        const scenarios = groups.get(group) ?? [];
        scenarios.push(scenario);
        groups.set(group, scenarios);
      }
    }

    const applicable = counts.pass + counts.fail + counts["not-implemented"];
    summaries.push({
      packageName: metadata.packageName,
      version: metadata.version,
      total: Object.keys(results).length,
      counts,
      percentage: applicable === 0 ? "100.0" : ((counts.pass / applicable) * 100).toFixed(1),
    });
    notImplementedByPackage.set(metadata.packageName, groups);
  }

  return { summaries, notImplementedByPackage };
}

function renderCoverageReport({
  reportTitle,
  summaries,
  notImplementedByPackage,
  previousGroups,
  getGroupState,
  getGroupUrl,
}: {
  reportTitle: string;
  summaries: CoverageSummary[];
  notImplementedByPackage: NotImplementedByPackage;
  previousGroups: Map<string, PreviousGroup>;
  getGroupState: GroupStateResolver;
  getGroupUrl: (packageName: string, group: string) => string | undefined;
}): string {
  const totalNotImplemented = summaries.reduce(
    (total, summary) => total + summary.counts["not-implemented"],
    0,
  );
  const body = [
    `# ${reportTitle} — ${new Date().toISOString().slice(0, 10)}`,
    "",
    "> Auto-generated by the **typespec-ts / Spector Coverage Report** workflow.",
    "",
    "## Summary",
    "",
    "| Package | Version | Total | ✅ Pass | ❌ Fail | 🔲 Not Implemented | Coverage |",
    "|---------|---------|------:|--------:|--------:|--------------------:|---------:|",
  ];

  for (const summary of summaries) {
    body.push(
      `| \`${summary.packageName}\` | ${summary.version} | ${summary.total} | ${summary.counts.pass} | ${summary.counts.fail} | ${summary.counts["not-implemented"]} | ${summary.percentage}% |`,
    );
  }
  body.push("", `## Not-Implemented Scenarios (${totalNotImplemented})`, "");

  if (totalNotImplemented === 0) {
    body.push("🎉 All applicable scenarios are implemented!", "");
    return body.join("\n");
  }

  for (const summary of summaries) {
    const groups = notImplementedByPackage.get(summary.packageName);
    if (!groups || groups.size === 0) {
      continue;
    }

    body.push(
      `### \`${summary.packageName}\` (${summary.counts["not-implemented"]} not implemented)`,
      "",
      "| Group | Count | Skip Implement | Scenarios | Comments |",
      "|-------|------:|:--------------:|-----------|----------|",
    );

    for (const [group, scenarios] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      scenarios.sort((a, b) => a.localeCompare(b));
      const previous = previousGroups.get(`${summary.packageName}\0${group}`);
      const groupState = getGroupState(summary.packageName, group, scenarios);
      const groupUrl = getGroupUrl(summary.packageName, group);
      const linkedGroup = groupUrl ? `[${group}](${groupUrl})` : group;
      const groupLabel =
        previousGroups.size > 0 && previous === undefined ? `🆕 ${linkedGroup}` : linkedGroup;
      const scenarioLabels = scenarios.map((scenario) =>
        previousGroups.size > 0 && previous && !previous.scenarios.has(scenario)
          ? `🆕 ${scenario}`
          : scenario,
      );
      body.push(
        `| ${groupLabel} | ${scenarios.length} | ${groupState.skipped ? "[x]" : "[ ]"} | ${scenarioLabels.join(", ")} | ${groupState.comment} |`,
      );
    }
    body.push("");
  }

  body.push(
    "---",
    "> **Skip Implement:** Check `[x]` for a scenario group that should not be selected for automatic implementation. The workflow preserves checkbox state and comments on future updates.",
    "",
  );
  return body.join("\n");
}

function buildActionableGroups(
  notImplementedByPackage: NotImplementedByPackage,
  getGroupState: GroupStateResolver,
  isBacklogScenario: (scenarioName: string) => boolean,
): ActionableGroups {
  const actionableGroups: ActionableGroups = {};
  for (const [packageName, groups] of notImplementedByPackage) {
    for (const [group, scenarios] of groups) {
      if (getGroupState(packageName, group, scenarios).skipped) {
        continue;
      }
      const actionableScenarios = scenarios.filter(
        (scenario) => !isBacklogScenario(`${group}_${scenario}`),
      );
      if (actionableScenarios.length > 0) {
        actionableGroups[packageName] ??= {};
        actionableGroups[packageName][group] = actionableScenarios;
      }
    }
  }
  return actionableGroups;
}

function flattenActionableGroups(notImplemented: ActionableGroups): TaskGroup[] {
  return Object.entries(notImplemented).flatMap(([packageName, packageGroups]) =>
    Object.entries(packageGroups).map(([group, scenarios]) => ({
      packageName,
      group,
      scenarios,
    })),
  );
}

function findTaskIssues(
  issues: Issue[],
  taskMarker: string,
  legacyTaskTitlePrefix: string,
): Issue[] {
  return issues
    .filter(
      (issue) =>
        !issue.pull_request &&
        (issue.body?.includes(taskMarker) || issue.title.startsWith(legacyTaskTitlePrefix)),
    )
    .sort((a, b) => b.number - a.number);
}

async function getActiveTaskReason(
  github: GitHub,
  owner: string,
  repo: string,
  issue: Issue,
): Promise<string | undefined> {
  const reasons: string[] = [];
  if (issue.assignees?.some(({ login }) => login.toLowerCase() === "copilot")) {
    reasons.push("it is assigned to Copilot");
  }

  const result = await github.graphql<ClosingPullRequestsResult>(
    `query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          closedByPullRequestsReferences(first: 20) {
            nodes {
              number
              state
            }
          }
        }
      }
    }`,
    { owner, repo, issueNumber: issue.number },
  );
  const openPullRequest = result.repository.issue.closedByPullRequestsReferences.nodes.find(
    ({ state }) => state === "OPEN",
  );
  if (openPullRequest) {
    reasons.push(`it has open implementation PR #${openPullRequest.number}`);
  }
  return reasons.length > 0 ? reasons.join(" and ") : undefined;
}

function renderImplementationTaskBody(
  taskMarker: string,
  groups: TaskGroup[],
  owner: string,
  repo: string,
  coverageIssueNumber: number,
): string {
  const groupList = groups
    .map(
      ({ group, scenarios }) =>
        `- \`${group}\` (${scenarios.length} scenarios: ${scenarios.join(", ")})`,
    )
    .join("\n");
  return [
    taskMarker,
    "",
    "## Task: Verify and Implement Spector Integration Tests",
    "",
    "Use the `typespec-ts-add-spector-test` skill to attempt every scenario listed below.",
    "",
    "**Not-implemented scenario groups:**",
    "",
    groupList,
    "",
    "**Instructions:**",
    "",
    "1. Process every listed scenario; do not stop after the first failure.",
    "2. This task is limited to adding tests for behavior already supported by the TypeScript emitter. Do not modify emitter production code, shared runtime code, TypeSpec definitions, or Spector mock APIs.",
    "3. If a scenario cannot be implemented using the generated client, record a concise failure reason. Do not work around unsupported behavior or commit incomplete, failing, or newly skipped tests.",
    "4. Include only passing tests and their required configuration and generated declaration baselines in the pull request.",
    "5. Create one pull request when at least one scenario is implemented successfully. If none succeeds, report the blockers on this issue instead of creating an empty pull request.",
    "",
    "**PR description format:**",
    "",
    "## Spector test results",
    "",
    "Group every requested scenario by scenario group. Include the test filename in the heading only when that file exists:",
    "",
    "### `Scenario_Group_Name` — `scenario-group.test.ts`",
    "",
    "- ✅ Added: `scenarioName1`",
    "- ✅ Added: `scenarioName2`",
    "- ❌ Failed: `scenarioName3` — reason",
    "",
    "For a scenario group with no test file, omit the filename:",
    "",
    "### `Scenario_Group_Name`",
    "",
    "- ❌ Failed: `scenarioName1` — reason",
    "",
    "List every requested scenario exactly once under its scenario group.",
    "",
    `Results should be commented on issue ${owner}/${repo}#${coverageIssueNumber}.`,
  ].join("\n");
}

function parsePreviousGroups(body: string | null | undefined): Map<string, PreviousGroup> {
  const previousGroups = new Map<string, PreviousGroup>();
  if (!body) {
    return previousGroups;
  }

  let currentPackage: string | undefined;
  for (const line of body.split(/\r?\n/)) {
    const packageMatch = line.match(/^### `(.+?)` \(\d+ not implemented\)$/);
    if (packageMatch) {
      currentPackage = packageMatch[1];
      continue;
    }

    if (!currentPackage) {
      continue;
    }

    const rowMatch = line.match(
      /^\|\s*(?:🆕\s*)?(?:\[`([^`]+)`\]\([^)]+\)|\[([^\]]+)\]\([^)]+\)|`([^`]+)`|([^|]+?))\s*\|\s*(\d+)\s*\|\s*(\[[ xX]\])\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/,
    );
    if (!rowMatch) {
      continue;
    }

    const [
      ,
      linkedCodeGroup,
      linkedTextGroup,
      codeGroup,
      textGroup,
      ,
      checkbox,
      scenarioList,
      comment,
    ] = rowMatch;
    const group = linkedCodeGroup ?? linkedTextGroup ?? codeGroup ?? textGroup?.trim();
    if (!group || !checkbox || scenarioList === undefined || comment === undefined) {
      continue;
    }

    previousGroups.set(`${currentPackage}\0${group}`, {
      skipped: checkbox.toLowerCase() === "[x]",
      scenarios: new Set(
        scenarioList
          .split(",")
          .map((scenario) => scenario.replace(/^🆕\s*/, "").trim())
          .filter(Boolean),
      ),
      comment: comment.trim(),
    });
  }

  return previousGroups;
}

function findMockApiFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMockApiFiles(entryPath));
    } else if (entry.name === "mockapi.ts") {
      files.push(entryPath);
    }
  }
  return files;
}

function parseActionableGroups(
  value: string | undefined,
  core: Core,
): ActionableGroups | undefined {
  if (!value) {
    core.setFailed("NOT_IMPLEMENTED is not defined.");
    return undefined;
  }

  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    core.setFailed("NOT_IMPLEMENTED must contain an object.");
    return undefined;
  }

  const groups: ActionableGroups = {};
  for (const [packageName, packageGroups] of Object.entries(parsed)) {
    if (!isRecord(packageGroups)) {
      core.setFailed(`NOT_IMPLEMENTED contains invalid groups for "${packageName}".`);
      return undefined;
    }
    groups[packageName] = {};
    for (const [group, scenarios] of Object.entries(packageGroups)) {
      if (!Array.isArray(scenarios) || scenarios.some((scenario) => typeof scenario !== "string")) {
        core.setFailed(`NOT_IMPLEMENTED contains invalid scenarios for "${group}".`);
        return undefined;
      }
      groups[packageName][group] = scenarios;
    }
  }
  return groups;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
