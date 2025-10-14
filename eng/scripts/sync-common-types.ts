// @ts-check
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { get } from "https";
import { join } from "path";

const versions = ["v3", "v4", "v5", "v6"];

for (const version of versions) {
  const githubApiUrl = `https://api.github.com/repos/Azure/azure-rest-api-specs/contents/specification/common-types/resource-management/${version}`;
  const localDir = `packages/samples/common-types/existing/${version}`;

  console.log("Downloading common types:", {
    version,
    githubApiUrl,
    localDir,
  });

  // Create the local directory if it doesn't exist
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  // Fetch the directory listing from GitHub API
  get(githubApiUrl, { headers: { "User-Agent": "Node.js" } }, (res) => {
    if (res.statusCode !== 200) {
      throw new Error(`Failed to fetch directory listing: ${res.statusMessage ?? ""}`);
    }

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      const files = JSON.parse(data);

      if (!Array.isArray(files)) {
        throw new Error("Unexpected API response format");
      }

      // Filter for files only (not directories)
      const fileEntries = files.filter((entry) => entry.type === "file");

      console.log(`Found ${fileEntries.length} files to download`);

      // Download each file
      fileEntries.forEach((fileEntry) => {
        const remoteUrl = fileEntry.download_url;
        const localPath = join(localDir, fileEntry.name);

        console.log(`Downloading ${fileEntry.name}...`);

        const file = createWriteStream(localPath);
        get(remoteUrl, (fileRes) => {
          if (fileRes.statusCode === 200) {
            fileRes.pipe(file);
            file.on("finish", () => {
              file.close();
              console.log(`✓ Downloaded ${fileEntry.name}`);
            });
          } else {
            throw new Error(`Failed to download ${fileEntry.name}: ${fileRes.statusMessage ?? ""}`);
          }
        });
      });
    });
  });
}
