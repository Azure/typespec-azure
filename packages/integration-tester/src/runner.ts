/* eslint-disable no-console */
import pc from "picocolors";

export interface TaskRunnerOptions {
  readonly verbose?: boolean;
}

export class TaskRunner {
  #verbose: boolean;

  constructor(private readonly options: TaskRunnerOptions = {}) {
    this.#verbose = options.verbose === undefined ? Boolean(process.env.CI) : options.verbose;
  }

  reportTaskWithDetails(status: "pass" | "fail", name: string, details: string) {
    const statusStr = status === "pass" ? pc.green("pass") : pc.red("fail");
    const message = `${statusStr} ${name}`;
    if (this.#verbose || status === "fail") {
      console.group(message, details);
    } else {
      console.log(message);
    }
  }

  group(name: string, content: string) {
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
