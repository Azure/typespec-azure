/* eslint-disable no-console */
import { spawn, type SpawnOptions } from "child_process";
import logSymbols from "log-symbols";
import ora, { type Ora } from "ora";
import { resolve } from "pathe";
import pc from "picocolors";

export const projectRoot = resolve(import.meta.dirname, "..");
export const repoRoot = resolve(projectRoot, "../..");

export async function execWithSpinner(
  spinner: Ora,
  command: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const subprocess = spawn(command, args, {
      stdio: "pipe",
      ...options,
    });

    // Handle stdout
    subprocess.stdout!.on("data", (data) => {
      spinner.clear();
      console.log(data.toString());
      spinner.render();
    });

    // Handle stderr
    subprocess.stderr!.on("data", (data) => {
      spinner.clear();
      // Ora seems to swallow the stderr output?
      console.error(data.toString());
      spinner.render();
    });

    subprocess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export async function action<T>(message: string, fn: (spinner: Ora) => Promise<T>): Promise<T> {
  if (process.stderr.isTTY) {
    return dynamicAction(message, fn);
  } else {
    return staticAction(message, fn);
  }
}

export async function dynamicAction<T>(
  message: string,
  fn: (spinner: Ora) => Promise<T>,
): Promise<T> {
  const oldLog = console.log;

  console.log = (...args: any[]) => {
    spinner.clear();
    oldLog(...args);
    spinner.render();
  };
  const spinner = ora(message).start();
  try {
    const result = await fn(spinner);
    spinner.succeed(message);
    return result;
  } catch (error) {
    spinner.fail(message);
    throw error;
  } finally {
    console.log = oldLog;
  }
}

export async function staticAction<T>(
  message: string,
  fn: (spinner: Ora) => Promise<T>,
): Promise<T> {
  const spinner = ora(message).start();
  console.log(`- ${message}`);
  try {
    const result = await fn(spinner);
    console.log(`${pc.red(logSymbols.success)} ${message}`);

    return result;
  } catch (error) {
    console.log(`${pc.red(logSymbols.error)} ${message}`);
    throw error;
  }
}

export function log(...args: any[]) {
  console.log(...args);
}
