// @ts-check
import {
  CommandFailedError,
  checkForChangedFiles,
  coreRepoRoot,
  forEachProject,
  repoRoot,
  run,
} from "./helpers.js";

const NoChange = 0;
const Patch = 1;
const Minor = 2;
const Major = 3;

/**
 * Set this to false to test this script without creating a new branch, checking for changes etc.
 * DO NOT LEAVE TO FALSE
 */
const production = true;

let branch;
/*
if (production) {
  // Create and checkout branches
  branch = `publish/${Date.now().toString(36)}`;
  doubleRun("git", "checkout", "-b", branch);
}

// Check that we have a clean slate before starting
if (production) {
  checkPrePublishState();
}

// Update the typespec core submodule
typespecRun("git", "fetch", "https://github.com/microsoft/typespec", "main");
if (production) {
  typespecRun("git", "merge", "--ff-only", "FETCH_HEAD");
}
// Stage the typespec core publish
typespecRun("rush", "version", "--bump");
typespecRun("rush", "update-latest-docs");
typespecRunWithRetries(3, "rush", "update");
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
const versions = getProjectVersions();

// Bump typespec-azure -> typespec dependencies.
bumpCrossSubmoduleDependencies();

// Stage typespec-azure publish
typespecAzureRun("rush", "version", "--bump");
typespecAzureRun("rush", "update-latest-docs");
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
*/
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
  if (checkForChangedFiles()) {
    console.error("ERROR: Cannot prepare publish because files above were modified.");
    process.exit(1);
  }

  try {
    if (production) {
      doubleRun("rush", "change", "--verify");
    }
  } catch (e) {
    if (e instanceof CommandFailedError) {
      console.error("ERROR: Cannot prepare publish because changelogs are missing.");
      process.exit(1);
    }
    throw e;
  }
}

function doubleRun(command, ...args) {
  typespecRun(command, ...args);
  typespecAzureRun(command, ...args);
}

function typespecRun(command, ...args) {
  console.log();
  console.log("## typespec ##");
  run(command, args, { cwd: coreRepoRoot });
}

function typespecAzureRun(command, ...args) {
  console.log();
  console.log("## typespec-azure ##");
  run(command, args, { cwd: repoRoot });
}

function typespecAzureRunWithOptions(options, command, ...args) {
  console.log();
  console.log("## typespec-azure ##");
  run(command, args, { cwd: repoRoot, ...options });
}

function typespecRunWithRetries(tries, command, ...args) {
  try {
    console.log();
    console.log("## typespec ##");
    console.log(`remaining tries: ${tries}`);
    run(command, args, { cwd: coreRepoRoot });
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
    run(command, args, { cwd: repoRoot });
  } catch (err) {
    if (tries-- > 0) {
      typespecAzureRunWithRetries(tries, command, ...args);
    } else throw err;
  }
}

function getProjectVersions() {
  const map = new Map();
  forEachProject((packageName, _, project) => {
    map.set(packageName, project.version);
  });
  return map;
}

/*function bumpCrossSubmoduleDependencies() {
  let changed = false;

  forEachProject((_, projectFolder, project, rushProject) => {
    if (projectFolder.startsWith(coreRepoRoot)) {
      return;
    }

    const change = bumpDependencies(project);
    if (change == NoChange) {
      return;
    }

    writeFileSync(
      join(projectFolder, "package.json"),
      JSON.stringify(project, undefined, 2) + "\n"
    );

    if (rushProject.shouldPublish === false) {
      return;
    }

    const changelog = {
      changes: [
        {
          comment: "Update dependencies.",
          type: change === Major ? "major" : change === Minor ? "minor" : "patch",
          packageName: project.name,
        },
      ],
      packageName: project.name,
      email: "microsoftopensource@users.noreply.github.com",
    };

    const changelogDir = join(repoRoot, "common/changes", project.name);
    mkdirSync(changelogDir, { recursive: true });

    if (production) {
      writeFileSync(
        join(changelogDir, branch.replace("/", "-") + ".json"),
        JSON.stringify(changelog, undefined, 2) + "\n"
      );
    }

    changed = true;
  });

  if (changed && production) {
    typespecAzureRun("git", "add", "-A");
    typespecAzureRun("git", "commit", "-m", "Bump cross-submodule dependencies");
  }
}
*/
async function rebuildAndRegenSamplesToBumpTemplateVersions() {
  //typespecAzureRunWithRetries(3, "rush", "update");
  typespecAzureRunWithOptions(
    { env: { ...process.env, TYPESPEC_WEBSITE_LINK_ACTION: "ignore" } },
    "rush",
    "rebuild"
  );
  typespecAzureRun("rush", "regen-samples");
  //if (checkForChangedFiles(repoRoot, undefined, { silent: true }) && production) {
  //typespecAzureRun("git", "add", "-A");
  //typespecAzureRun("git", "commit", "-m", "Rebuild and regen samples to bump template versions");
  //}
}

/*
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
*/
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
