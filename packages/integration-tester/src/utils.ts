import { execa } from "execa";
import ora, { type Ora } from "ora";
import pc from "picocolors";

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

export function action(message: string, fn: (spinner: Ora) => Promise<void>): Promise<void> {
  const spinner = ora(message).start();
  return fn(spinner)
    .then(() => {
      spinner.succeed(pc.green(message));
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
