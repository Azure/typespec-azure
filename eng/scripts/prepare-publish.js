// @ts-check
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { runOrExit } from "../../core/packages/internal-build-utils/dist/src/common.js";
import {
  CommandFailedError,
  checkForChangedFiles,
  coreRepoRoot,
  listPackages,
  repoRoot,
} from "./helpers.js";
import { parseArgs } from "util";
import pc from "picocolors";

function log(...args) {
  console.log( ...args);
}

function logSuccess(message) {
  log(pc.green(`✓ ${message}`));
}

const args = parseArgs({
  options: {
    noCommit: { type: "boolean" },
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
  doubleRun("git", "checkout", "-b", branch);
}

// Check that we have a clean slate before starting
if (production) {
  checkPrePublishState();
}

// Update the typespec core submodule
log("Updating typespec core submodule");
typespecRun("git", "fetch", "https://github.com/microsoft/typespec", "main");
if (production) {
  typespecRun("git", "merge", "--ff-only", "FETCH_HEAD");
}
// Stage the typespec core publish
typespecRun("pnpm", "change", "version");
typespecRun("pnpm", "update-latest-docs");
typespecRunWithRetries(3, "pnpm", "install");
if (production) {
  typespecRun("git", "add", "-A");
}
if (checkForChangedFiles(coreRepoRoot, undefined, { silent: true })) {
  if (production) {
    typespecRun("git", "commit", "-m", "Prepare typespec publish");
  }
} else {
  console.log("INFO: No changes to typespec.");
}

if (production && checkForChangedFiles(repoRoot, undefined, { silent: true })) {
  typespecAzureRun("git", "commit", "-a", "-m", "Update core submodule");
}

// Determine project versions including any bumps from typespec publish above
const versions = await getProjectVersions();

// Bump typespec-azure -> typespec dependencies.
await bumpCrossSubmoduleDependencies();

// Stage typespec-azure publish
typespecAzureRun("pnpm", "change", "version");
typespecAzureRun("pnpm", "update-latest-docs");
if (production) {
  typespecAzureRun("git", "add", "-A");
}
if (checkForChangedFiles(repoRoot, undefined, { silent: true })) {
  if (production) {
    typespecAzureRun("git", "commit", "-m", "Prepare typespec-azure publish");
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

function checkPrePublishState() {
  log("Checking repo state is clean");
  if (checkForChangedFiles()) {
    console.error("ERROR: Cannot prepare publish because files above were modified.");
    process.exit(1);
  }

  try {
    if (production) {
      doubleRun("pnpm", "change", "status");
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

function doubleRun(command, ...args) {
  typespecRun(command, ...args);
  typespecAzureRun(command, ...args);
}

function typespecRun(command, ...args) {
  console.log();
  console.log("## typespec ##");
  runOrExit(command, args, { cwd: coreRepoRoot });
}

function typespecAzureRun(command, ...args) {
  console.log();
  console.log("## typespec-azure ##");
  runOrExit(command, args, { cwd: repoRoot });
}

function typespecAzureRunWithOptions(options, command, ...args) {
  console.log();
  console.log("## typespec-azure ##");
  runOrExit(command, args, { cwd: repoRoot, ...options });
}

function typespecRunWithRetries(tries, command, ...args) {
  try {
    console.log();
    console.log("## typespec ##");
    console.log(`remaining tries: ${tries}`);
    runOrExit(command, args, { cwd: coreRepoRoot });
  } catch (err) {
    if (tries-- > 0) {
      typespecRunWithRetries(tries, command, ...args);
    } else throw err;
  }
}

function typespecAzureRunWithRetries(tries, command, ...args) {
  try {
    console.log();
    console.log("## typespec-azure ##");
    console.log(`remaining tries: ${tries}`);
    runOrExit(command, args, { cwd: repoRoot });
  } catch (err) {
    if (tries-- > 0) {
      typespecAzureRunWithRetries(tries, command, ...args);
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

async function bumpCrossSubmoduleDependencies() {
  let changed = false;

  for (const project of await listPackages()) {
    if (project.dir.startsWith(coreRepoRoot)) {
      return;
    }

    const pkgJson = {...project.manifest}

    const change = bumpDependencies(pkgJson);
    if (change == NoChange) {
      return;
    }

    writeFileSync(join(project.dir, "package.json"), JSON.stringify(pkgJson, undefined, 2) + "\n");

    if (project.manifest.private === false) {
      return;
    }


    const changelog = [
      "---",
      `"${project.manifest.name}": ${change === Major ? "major" : change === Minor ? "minor" : "patch"}`,
      "---",
      "Update dependencies.",
    ].join("\n");

    const changelogDir = join(repoRoot, ".changesets");
    mkdirSync(changelogDir, { recursive: true });

    if (production) {
      writeFileSync(join(changelogDir, branch.replace("/", "-") + ".md"), changelog + "\n");
    }

    changed = true;
  }

  if (changed && production) {
    typespecAzureRun("git", "add", "-A");
    typespecAzureRun("git", "commit", "-m", "Bump cross-submodule dependencies");
  }
}

async function rebuildAndRegenSamplesToBumpTemplateVersions() {
  typespecAzureRunWithRetries(3, "pnpm", "install");
  typespecAzureRunWithOptions(
    { env: { ...process.env, TYPESPEC_SKIP_DOCUSAURUS_BUILD: true } },
    "pnpm",
    "build"
  );
  typespecAzureRun("pnpm", "build");
  typespecAzureRun("pnpm", "regen-samples");

  if (checkForChangedFiles(repoRoot, undefined, { silent: true }) && production) {
    typespecAzureRun("git", "add", "-A");
    typespecAzureRun("git", "commit", "-m", "Rebuild and regen samples to bump template versions");
  }
}

function bumpDependencies(project) {
  const dependencyGroups = [
    [project.dependencies, true],
    [project.peerDependencies, true],
    [project.devDependencies, true],
  ];
  let change = NoChange;
  for (const [dependencies, includeWorkspace] of dependencyGroups.filter(
    ([x]) => x !== undefined
  )) {
    for (const [dependency, oldVersion] of Object.entries(dependencies)) {
      const newVersion = versions.get(dependency);
      if (newVersion && `~${newVersion}` !== oldVersion) {
        if (includeWorkspace) {
          dependencies[dependency] = `workspace:~${newVersion}`;
        } else {
          dependencies[dependency] = `~${newVersion}`;
        }
        change = Math.max(change, getChangeType(oldVersion, newVersion));
      }
    }
  }
  return change;
}

function getChangeType(oldVersion, newVersion) {
  if (oldVersion.includes("*") || newVersion.includes("*")) {
    return Patch;
  }
  const oldParts = getVersionParts(oldVersion);
  const newParts = getVersionParts(newVersion);

  if (newParts.major > oldParts.major) {
    return Major;
  }
  if (newParts.major < oldParts.major) {
    throw new Error("version downgrade");
  }
  if (newParts.minor > oldParts.minor) {
    return Minor;
  }
  if (newParts.minor < oldParts.minor) {
    throw new Error("version downgrade");
  }
  if (newParts.patch > oldParts.patch) {
    return Patch;
  }
  if (newParts.patch < oldParts.patch) {
    throw new Error("version downgrade");
  }
  return NoChange;
}

function getVersionParts(version) {
  const parts = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!parts) {
    throw new Error(`Invalid version: ${version}`);
  }
  return {
    major: Number(parts[1]),
    minor: Number(parts[2]),
    patch: Number(parts[3]),
  };
}
