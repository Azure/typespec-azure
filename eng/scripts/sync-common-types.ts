// @ts-check
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import pc from "picocolors";

const versions = ["v3", "v4", "v5", "v6"];

for (const version of versions) {
  console.group("Syncing version:", pc.cyan(version));
  const githubApiUrl = `https://api.github.com/repos/Azure/azure-rest-api-specs/contents/specification/common-types/resource-management/${version}`;
  const localDirs = [
    `packages/samples/common-types/existing/${version}`,
    `packages/samples/specs/resource-manager/common-types/${version}`,
  ];

  console.log("Downloading common types:", {
    version,
    githubApiUrl,
    localDirs,
  });

  // Create the local directories if they don't exist
  for (const localDir of localDirs) {
    if (!existsSync(localDir)) {
      mkdirSync(localDir, { recursive: true });
    }
  }

  // Fetch the directory listing from GitHub API
  const res = await fetch(githubApiUrl, { headers: { "User-Agent": "Node.js" } });

  if (!res.ok) {
    throw new Error(`Failed to fetch directory listing: ${res.statusText}`);
  }

  const files = await res.json();

  if (!Array.isArray(files)) {
    throw new Error("Unexpected API response format");
  }

  // Filter for files only (not directories)
  const fileEntries = files.filter((entry) => entry.type === "file");

  console.log(`Found ${fileEntries.length} files to download`);

  // Download each file
  for (const fileEntry of fileEntries) {
    const remoteUrl = fileEntry.download_url;
    const name = `${version}/${fileEntry.name}`;
    console.log(`${pc.gray("-")} Downloading ${pc.cyan(name)}...`);

    const fileRes = await fetch(remoteUrl);
    if (fileRes.ok) {
      const content = await fileRes.text();
      for (const localDir of localDirs) {
        writeFileSync(join(localDir, fileEntry.name), content);
      }
      console.log(`${pc.green("✓")} Downloaded ${pc.cyan(name)}`);
    } else {
      throw new Error(`Failed to download ${fileEntry.name}: ${fileRes.statusText}`);
    }
  }
  console.groupEnd();
}
