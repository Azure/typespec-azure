import { resolvePath } from "@typespec/compiler";

/**
 * Returns the package root directory for the emitter.
 *
 * The compiled output lives at `dist/src/utils/resolve-project-root.js`,
 * so the package root is 3 levels up. This avoids filesystem access,
 * making it compatible with virtual file systems (e.g., the playground).
 */
export function resolveProjectRoot(): string {
  // Use the global URL constructor (works in both Node.js and browsers)
  const currentDir = new URL(".", import.meta.url).pathname;
  // From dist/src/utils/ -> package root (3 levels: utils -> src -> dist -> root)
  return resolvePath(currentDir, "../../..");
}
