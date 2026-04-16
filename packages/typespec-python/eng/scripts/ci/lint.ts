/* eslint-disable no-console */
import { spawn } from "child_process";
import fs from "fs";
import { dirname, join } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../");

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx lint.ts [options]

${pc.bold("Description:")}
  Run Python linting checks (pylint) on generated code.
  TypeScript linting (eslint) is handled by the root workspace.

${pc.bold("Options:")}
  ${pc.cyan("-h, --help")}
      Show this help message.
`);
  process.exit(0);
}

function getVenvPython(): string {
  const venvPath = join(root, "venv");
  if (fs.existsSync(join(venvPath, "bin"))) {
    return join(venvPath, "bin", "python");
  } else if (fs.existsSync(join(venvPath, "Scripts"))) {
    return join(venvPath, "Scripts", "python.exe");
  }
  throw new Error("Virtual environment not found. Run 'pnpm run install' first.");
}

function runCommand(command: string, args: string[], displayName?: string): Promise<boolean> {
  const name = displayName || `${command} ${args.join(" ")}`;

  return new Promise((resolve) => {
    console.log(`${pc.cyan("[RUN]")} ${name}`);
    const proc = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`${pc.green("[PASS]")} ${name} completed successfully`);
        resolve(true);
      } else {
        console.log(`${pc.red("[FAIL]")} ${name} failed with code ${code}`);
        resolve(false);
      }
    });

    proc.on("error", (err) => {
      console.log(`${pc.red("[ERROR]")} ${name}: ${err.message}`);
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  console.log(`\n${pc.bold("=== Linting Python (pylint) ===")}\n`);

  let pythonPath: string;
  try {
    pythonPath = getVenvPython();
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exit(1);
  }

  // Run pylint via the CI helper script
  const pylintScript = join(root, "eng", "scripts", "ci", "run_pylint.py");
  const success = await runCommand(pythonPath, [pylintScript], "pylint");

  if (!success) {
    process.exit(1);
  }

  console.log(`\n${pc.green(pc.bold("All linting checks passed!"))}\n`);
}

main().catch((error) => {
  console.error(`${pc.red("Unexpected error:")}`, error);
  process.exit(1);
});
