/* eslint-disable no-console */
/**
 * Shared regen-diff CLI. One self-contained tool used by every emitter language
 * to render generated-test diffs against an external assets baseline and to
 * publish a new baseline.
 *
 * Commands:
 *   render        Render the HTML diff (current generated output vs baseline).
 *   push-assets   Publish the current output as a new baseline + bump assets.json.
 *
 * Every command takes `--package <dir>`, the emitter package root that holds the
 * `regen-diff.config.json` and `assets.json`. Run it with `tsx`:
 *
 *   tsx eng/common/scripts/regen-diff/src/cli.ts render --package packages/http-client-python
 *
 * Most consumers wire this up behind package.json scripts (see the README).
 */

import pc from "picocolors";
import { parseArgs } from "util";

import { pushAssets } from "./push-assets.js";
import { render } from "./render-diff.js";

const HELP = `${pc.bold("regen-diff")} — shared generated-test diff tool

${pc.bold("Usage:")}
  regen-diff <command> --package <dir> [options]

${pc.bold("Commands:")}
  render         Render an HTML diff of the current generated output vs the
                 assets baseline.
      --package <dir>    Emitter package root (required).
      --output <dir>     Output directory (default: <package>/temp/diff-site).
      --generated <dir>  Current generated dir (default: from config).
      --title <text>     Title shown on the diff page (default: from config).
      --open             Open the rendered diff in your default browser.
      --vscode           Open each changed file as a native VS Code editor diff.
      --max <n>          Max files to open in VS Code (default 40).

  push-assets    Publish the current generated output as a new baseline and bump
                 assets.json to the new tag (maintainer-run, local).
      --package <dir>    Emitter package root (required).
      --message <msg>    Commit message (default auto-generated).
      --branch <name>    Assets-repo branch to push to (default: main).
      --dry-run          Build the commit/tag locally but do not push.

  -h, --help     Show this help.
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      package: { type: "string", short: "p" },
      output: { type: "string", short: "o" },
      generated: { type: "string", short: "g" },
      title: { type: "string", short: "t" },
      open: { type: "boolean" },
      vscode: { type: "boolean" },
      max: { type: "string" },
      message: { type: "string", short: "m" },
      branch: { type: "string", short: "b" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const packageRoot = values.package;
  if (!packageRoot) {
    console.error(pc.red(`Missing required --package <dir>.`));
    console.log(HELP);
    process.exit(1);
  }

  switch (command) {
    case "render":
      await render({
        packageRoot,
        output: values.output,
        generated: values.generated,
        title: values.title,
        open: values.open,
        vscode: values.vscode,
        max: values.max ? Number(values.max) : undefined,
      });
      break;
    case "push-assets":
      await pushAssets({
        packageRoot,
        message: values.message,
        branch: values.branch,
        dryRun: values["dry-run"],
      });
      break;
    default:
      console.error(pc.red(`Unknown command: ${command}`));
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(pc.red(`Fatal error: ${err?.stack ?? err}`));
  process.exit(1);
});
