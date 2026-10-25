/* eslint-disable no-console */
import { writeFileSync } from "node:fs";
import { compileInProcess } from "./compiler.js";
import type { BenchmarkPlan, Workload } from "./types.js";
import { measureWorkload } from "./workloads.js";

async function main() {
  const [specDir, request] = process.argv.slice(2);
  if (!specDir || !request) throw new Error("Missing compiler workload");
  const { plan, workload }: { plan: BenchmarkPlan; workload: Workload } = JSON.parse(request);
  if (workload.kind !== "compiler") throw new Error("Expected a compiler workload");
  const collect = global.gc;
  if (!collect) throw new Error("Compiler measurements require Node --expose-gc");
  const shard = await measureWorkload(plan, workload, async () => {
    // Collect the previous Program before timing the next fresh compilation.
    collect();
    return compileInProcess(specDir, { kind: "compiler" });
  });
  writeFileSync(3, JSON.stringify(shard));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
