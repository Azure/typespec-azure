/* eslint-disable no-console */
import { execa, type Options } from "execa";
import ora, { type Ora } from "ora";
import { resolve } from "pathe";
import pc from "picocolors";

export const projectRoot = resolve(import.meta.dirname, "..");
export const repoRoot = resolve(projectRoot, "../..");

export async function execWithSpinner(
  spinner: Ora,
  command: string,
  args: string[],
  options: Options = {},
): Promise<void> {
  const subprocess = execa(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });

  // Handle stdout
  subprocess.stdout?.on("data", (data) => {
    spinner.clear();
    console.log(data.toString());
    spinner.render();
  });

  // Handle stderr
  subprocess.stderr?.on("data", (data) => {
    spinner.clear();
    // Ora seems to swallow the stderr output?
    console.error(data.toString());
    spinner.render();
  });

  await subprocess;
}

export async function action<T>(message: string, fn: (spinner: Ora) => Promise<T>): Promise<T> {
  const oldLog = console.log;

  console.log = (...args: any[]) => {
    spinner.clear();
    oldLog(...args);
    spinner.render();
  };
  const spinner = ora(message).start();
  try {
    const result_2 = await fn(spinner);
    spinner.succeed(pc.green(message));
    return result_2;
  } catch (error) {
    spinner.fail(pc.red(message));
    throw error;
  }
}

export function log(...args: any[]) {
  console.log(...args);
}
