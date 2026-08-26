import { describe, expect, it } from "vitest";
import { formatProgressHeartbeat } from "./progress.js";

describe("TypeSpec progress heartbeat", () => {
  it("reports elapsed time, completion state, active projects, and main-process memory", () => {
    expect(
      formatProgressHeartbeat({
        phase: "compile",
        completed: 12,
        total: 20,
        activeProjects: ["project-b", "project-a"],
        elapsedMs: 125_000,
        memoryUsage: {
          rss: 512 * 1024 * 1024,
          heapUsed: 128 * 1024 * 1024,
        },
      }),
    ).toBe(
      "[heartbeat] phase=compile elapsed=2m 5s completed=12/20 active=2 remaining=6 " +
        "rss=512 MiB heapUsed=128 MiB projects=project-b, project-a",
    );
  });
});
