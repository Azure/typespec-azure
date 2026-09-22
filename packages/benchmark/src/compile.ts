import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Stats } from "./types.js";

const compileOncePath = fileURLToPath(new URL("./compile-once.js", import.meta.url));

export function validateEmitterStats(stats: Stats, emitters: readonly string[]): void {
  for (const name of emitters) {
    const total = stats.runtime.emit.emitters[name]?.total;
    if (total === undefined || !Number.isFinite(total) || total < 0) {
      throw new Error(`Missing or invalid benchmark timing for emitter ${name}`);
    }
  }
}

/** A separate pipe keeps emitter/generator logs out of the structured result. */
export async function compileSpec(specDir: string, workerPath = compileOncePath): Promise<Stats> {
  return new Promise<Stats>((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath, specDir], {
      stdio: ["ignore", "pipe", "pipe", "pipe"],
    });
    let output = "";
    let logs = "";
    child.stdout!.on("data", (chunk) => {
      logs += chunk.toString();
    });
    child.stderr!.on("data", (chunk) => {
      logs += chunk.toString();
    });
    child.stdio[3]!.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(
          new Error(
            `Compilation failed for ${specDir} (exit ${code}, signal ${signal}):\n${logs.trim()}`,
          ),
        );
        return;
      }
      try {
        const stats: Stats = JSON.parse(output);
        if (!Number.isFinite(stats.runtime.total) || !stats.complexity) {
          throw new Error("Missing runtime or complexity metrics");
        }
        validateEmitterStats(stats, Object.keys(stats.runtime.emit.emitters));
        if (logs) process.stderr.write(logs);
        resolve(stats);
      } catch (error) {
        reject(
          new Error(`Invalid benchmark stats for ${specDir}:\n${logs.trim()}`, { cause: error }),
        );
      }
    });
  });
}
