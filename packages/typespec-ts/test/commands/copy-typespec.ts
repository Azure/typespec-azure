/* eslint-disable no-console */
import { cp, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Cross-platform replacement for the previous shell-based `copy:typespec` script
// (rm -rf / mkdirp / cp -r). Stages every TypeSpec spec source the integration
// tests compile into temp/specs, plus the shared assets into temp/assets.
const commandsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(commandsDir, "..", "..");

const tempDir = join(packageRoot, "temp");
const specsDir = join(tempDir, "specs");
const assetsDir = join(tempDir, "assets");

const httpSpecs = join(packageRoot, "node_modules", "@typespec", "http-specs");
const azureHttpSpecs = join(packageRoot, "node_modules", "@azure-tools", "azure-http-specs");
const localSpecs = join(packageRoot, "test", "integration", "typespec");

async function copyTypespec(): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(specsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  // Merge each source's contents into temp/specs (equivalent to `cp -r <src>/* temp/specs`).
  // Sources are copied in order, so the local specs win on any path collision.
  await cp(join(httpSpecs, "specs"), specsDir, { recursive: true });
  await cp(join(azureHttpSpecs, "specs"), specsDir, { recursive: true });
  await cp(localSpecs, specsDir, { recursive: true });
  await cp(join(httpSpecs, "assets"), assetsDir, { recursive: true });
}

copyTypespec().catch((error) => {
  console.error(error);
  process.exit(1);
});
