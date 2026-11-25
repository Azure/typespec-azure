import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { RealSpecCase } from "./real-specs-manifest.js";

const siblingRepository = resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "azure-rest-api-specs",
);

export const realSpecRepository = findRealSpecRepository(
  process.env.AZURE_REST_API_SPECS,
  siblingRepository,
);

export const realSpecBaseRepository = findDistinctBaseRepository(
  process.env.AZURE_REST_API_SPECS_BASE,
  realSpecRepository,
);

export function findRealSpecRepository(
  configuredPath: string | undefined,
  fallbackPath?: string,
): string | undefined {
  if (configuredPath) {
    const resolved = resolve(configuredPath);
    if (!isSpecsRepository(resolved)) {
      throw new Error(
        `AZURE_REST_API_SPECS does not point to an azure-rest-api-specs checkout: ${resolved}`,
      );
    }
    return realpathSync(resolved);
  }

  if (fallbackPath && isSpecsRepository(fallbackPath)) {
    return realpathSync(fallbackPath);
  }

  return undefined;
}

export function getRealSpecEntryPoint(repository: string, specCase: RealSpecCase): string {
  const entryPoint = resolve(repository, specCase.relativePath, "main.tsp");
  if (!existsSync(entryPoint)) {
    throw new Error(`Real-spec entry point does not exist: ${entryPoint}`);
  }
  return entryPoint;
}

function findDistinctBaseRepository(
  configuredPath: string | undefined,
  headRepository: string | undefined,
): string | undefined {
  if (!configuredPath) {
    return undefined;
  }

  const baseRepository = findRealSpecRepository(configuredPath);
  if (headRepository && baseRepository === headRepository) {
    throw new Error(
      "AZURE_REST_API_SPECS_BASE must point to a different checkout than AZURE_REST_API_SPECS.",
    );
  }
  return baseRepository;
}

function isSpecsRepository(path: string): boolean {
  return existsSync(resolve(path, "package.json")) && existsSync(resolve(path, "specification"));
}
