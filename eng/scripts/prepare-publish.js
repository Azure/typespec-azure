// @ts-check
import pc from "picocolors";
import { parseArgs } from "util";
import { runOrExit } from "../../core/packages/internal-build-utils/dist/src/common.js";
import {
  CommandFailedError,
  checkForChangedFiles,
  coreRepoRoot,
  listPackages,
  repoRoot,
} from "./helpers.js";

const columns = process.stdout.columns;
function log(...args) {
  console.log(...args);
}

function logSuccess(message) {
  log(pc.green(`✓ ${message}`));
}

function logRegionStart(text) {
  const split = Math.floor((columns - text.length - 4) / 2);
  log();
  log(pc.cyan("-".repeat(split) + "  " + text + "  " + "-".repeat(split)));
}

function logRegionEnd() {
  log(pc.cyan("-".repeat(columns)));
}

const args = parseArgs({
  options: {
    noCommit: { type: "boolean" },
    onlyBumpVersions: { type: "boolean" }, // Only bump version, skip any extra steps like updating the docs and regenerating samples
  },
  args: process.argv.slice(2),
});

const NoChange = 0;
const Patch = 1;
const Minor = 2;
const Major = 3;

/**
 * Set this to false to test this script without creating a new branch, checking for changes etc.
 * DO NOT LEAVE TO FALSE
 */
const production = !args.values.noCommit;

let branch;

if (production) {
  // Create and checkout branches
  branch = `publish/${Date.now().toString(36)}`;
  log("Creating branch in both repos", branch);
  await doubleRun("git", "checkout", "-b", branch);
}

// Check that we have a clean slate before starting
if (production) {
  await checkPrePublishState();
}

// Update the typespec core submodule
log("Updating typespec core submodule");
await typespecRun("git", "fetch", "https://github.com/microsoft/typespec", "main");
if (production) {
  await typespecRun("git", "merge", "--ff-only", "FETCH_HEAD");
}
// Stage the typespec core publish
await typespecRun("pnpm", "change", "version", "--exclude", "standalone");
if (!args.values.onlyBumpVersions) {
  await typespecRun("pnpm", "update-playground-versions");
}
await typespecRunWithRetries(3, "pnpm", "install");

if (await checkForChangedFiles(coreRepoRoot, undefined, { silent: true })) {
  if (production) {
    await typespecRun("git", "add", "-A");
    await typespecRun("git", "commit", "-m", "Prepare typespec publish");
  }
} else {
  console.log("INFO: No changes to typespec.");
}

if (production && (await checkForChangedFiles(repoRoot, undefined, { silent: true }))) {
  await typespecAzureRun("git", "commit", "-a", "-m", "Update core submodule");
}

log("Bumping cross-submodule dependencies");
// Determine project versions including any bumps from typespec publish above
const versions = await getProjectVersions();

// Stage typespec-azure publish
await typespecAzureRun("pnpm", "change", "version");
if (!args.values.onlyBumpVersions) {
  await typespecAzureRun("pnpm", "update-playground-versions");
}
if (await checkForChangedFiles(repoRoot, undefined, { silent: true })) {
  if (production) {
    await typespecAzureRun("git", "add", "-A");
    await typespecAzureRun("git", "commit", "-m", "Prepare typespec-azure publish");
  }
} else {
  console.log("INFO: No changes to typespec-azure.");
}

rebuildAndRegenSamplesToBumpTemplateVersions();

// And we're done
console.log();
if (production) {
  console.log(`Success! Push ${branch} branches and send PRs.`);
} else {
  console.log(`Success! All the files have been updated.`);
  console.log("**DEVELOPMENT** The production flag is set to false");
}

async function checkPrePublishState() {
  log("Checking repo state is clean");
  if (await checkForChangedFiles()) {
    console.error("ERROR: Cannot prepare publish because files above were modified.");
    process.exit(1);
  }

  try {
    if (production) {
      await doubleRun("pnpm", "change", "status");
    }
  } catch (e) {
    if (e instanceof CommandFailedError) {
      console.error("ERROR: Cannot prepare publish because changelogs are missing.");
      process.exit(1);
    }
    throw e;
  }

  logSuccess("Repo state is clean");
}

async function doubleRun(command, ...args) {
  await typespecRun(command, ...args);
  await typespecAzureRun(command, ...args);
}

async function typespecRun(command, ...args) {
  console.log();
  logRegionStart("typespec");
  await runOrExit(command, args, { cwd: coreRepoRoot });
  logRegionEnd();
}

async function typespecAzureRun(command, ...args) {
  console.log();
  logRegionStart("typespec-azure");
  await runOrExit(command, args, { cwd: repoRoot });
  logRegionEnd();
}

async function typespecAzureRunWithOptions(options, command, ...args) {
  console.log();
  logRegionStart("typespec-azure");
  await runOrExit(command, args, { cwd: repoRoot, ...options });
}

async function typespecRunWithRetries(tries, command, ...args) {
  try {
    logRegionStart(`typespec (remaining tries: ${tries})`);
    await runOrExit(command, args, { cwd: coreRepoRoot });
    logRegionEnd();
  } catch (err) {
    logRegionEnd();
    if (tries-- > 0) {
      await typespecRunWithRetries(tries, command, ...args);
    } else throw err;
  }
}

async function typespecAzureRunWithRetries(tries, command, ...args) {
  try {
    logRegionStart(`typespec-azure (remaining tries: ${tries})`);
    await runOrExit(command, args, { cwd: repoRoot });
    logRegionEnd();
  } catch (err) {
    logRegionEnd();
    if (tries-- > 0) {
      await typespecAzureRunWithRetries(tries, command, ...args);
    } else throw err;
  }
}

async function getProjectVersions() {
  const map = new Map();
  for (const project of await listPackages()) {
    map.set(project.manifest.name, project.manifest.version);
  }
  return map;
}

async function rebuildAndRegenSamplesToBumpTemplateVersions() {
  await typespecAzureRunWithRetries(3, "pnpm", "install");
  await typespecAzureRunWithOptions(
    { env: { ...process.env, TYPESPEC_SKIP_DOCUSAURUS_BUILD: true } },
    "pnpm",
    "build",
  );
  if (!args.values.onlyBumpVersions) {
    await typespecAzureRun("pnpm", "build");
    await typespecAzureRun("pnpm", "regen-samples");
  }

  if ((await checkForChangedFiles(coreRepoRoot, undefined, { silent: true })) && production) {
    await typespecRun("git", "add", "-A");
    await typespecRun("git", "commit", "-m", "Rebuild and regen samples to bump template versions");
  }
  if ((await checkForChangedFiles(repoRoot, undefined, { silent: true })) && production) {
    await typespecAzureRun("git", "add", "-A");
    await typespecAzureRun(
      "git",
      "commit",
      "-m",
      "Rebuild and regen samples to bump template versions",
    );
  }
}
