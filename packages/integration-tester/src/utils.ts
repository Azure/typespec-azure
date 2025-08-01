import { execa } from "execa";
import ora, { type Ora } from "ora";
import { resolve } from "pathe";
import pc from "picocolors";

export const projectRoot = resolve(import.meta.dirname, "..");
export const repoRoot = resolve(projectRoot, "../..");

export async function execWithSpinner(
  spinner: Ora,
  command: string,
  args: string[],
): Promise<void> {
  const subprocess = execa(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Handle stdout
  subprocess.stdout?.on("data", (data) => {
    spinner.clear();
    // eslint-disable-next-line no-console
    console.log(data.toString());
    spinner.render();
  });

  // Handle stderr
  subprocess.stderr?.on("data", (data) => {
    spinner.clear();
    // Ora seems to swallow the stderr output?
    // eslint-disable-next-line no-console
    console.error(data.toString());
    spinner.render();
  });

  await subprocess;
}

export function action<T>(message: string, fn: (spinner: Ora) => Promise<T>): Promise<T> {
  const spinner = ora(message).start();
  return fn(spinner)
    .then((result) => {
      spinner.succeed(pc.green(message));
      return result;
    })
    .catch((error) => {
      spinner.fail(pc.red(message));
      throw error;
    });
}

export function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}
