import { createRequire } from "node:module";
import { posix } from "node:path";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

const requireDependency = createRequire(import.meta.url);

export interface GeneratedRuntimeOptions {
  platform?: "node" | "browser";
}

/**
 * Executes real emitted TypeScript modules in memory, resolving external dependencies normally.
 * Browser mode selects emitted browser variants where available.
 */
export function createGeneratedRuntime(
  sources: Iterable<readonly [string, string]>,
  options: GeneratedRuntimeOptions = {},
): { loadModule<T = Record<string, unknown>>(filePath: string): T } {
  const sourceMap = new Map(sources);
  const modules = new Map<string, { exports: Record<string, unknown> }>();

  function loadModule<T = Record<string, unknown>>(filePath: string): T {
    const cached = modules.get(filePath);
    if (cached) {
      return cached.exports as T;
    }
    const browserPath = filePath.replace(/\.ts$/, "-browser.mts");
    const sourcePath =
      options.platform === "browser" && sourceMap.has(browserPath) ? browserPath : filePath;
    const source = sourceMap.get(sourcePath);
    if (source === undefined) {
      throw new Error(`Generated runtime module was not emitted: ${sourcePath}`);
    }
    const module = { exports: {} };
    modules.set(filePath, module);
    const { outputText } = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
      fileName: sourcePath.replace(/\.mts$/, ".ts"),
    });
    const requireGenerated = (specifier: string) =>
      specifier.startsWith(".")
        ? loadModule(
            posix
              .resolve(posix.dirname(filePath), specifier)
              .replace(/\.mjs$/, ".mts")
              .replace(/\.js$/, ".ts"),
          )
        : requireDependency(specifier);
    new Function("require", "module", "exports", outputText)(
      requireGenerated,
      module,
      module.exports,
    );
    return module.exports as T;
  }

  return { loadModule };
}
