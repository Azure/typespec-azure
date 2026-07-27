/* eslint-disable no-console */
import pc from "picocolors";

export type TaskStatus = "pass" | "fail" | "skip";

export interface TaskRunnerOptions {
  /**
   * Show the details of every task, not just failures. Defaults to `true` when
   * running in CI (the `CI` environment variable is set), `false` otherwise.
   */
  readonly verbose?: boolean;
}

/**
 * Minimal task reporter shared with `@typespec/tsp-integration` so the two
 * engines can be merged in the future. Prints a one-line status per task and
 * groups details (collapsible in GitHub Actions).
 */
export class TaskRunner {
  #verbose: boolean;

  constructor(options: TaskRunnerOptions = {}) {
    this.#verbose = options.verbose === undefined ? Boolean(process.env.CI) : options.verbose;
  }

  reportTaskWithDetails(status: TaskStatus, name: string, details: string): void {
    const statusStr =
      status === "pass" ? pc.green("pass") : status === "fail" ? pc.red("fail") : pc.gray("skip");
    const message = `${statusStr} ${name}`;
    if ((this.#verbose || status === "fail") && details !== "") {
      this.group(message, details);
    } else {
      console.log(message);
    }
  }

  group(name: string, content: string): void {
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::group::${name}`);
      console.log(content);
      console.log("::endgroup::");
    } else {
      console.group(name);
      console.log(content);
      console.groupEnd();
    }
  }
}
