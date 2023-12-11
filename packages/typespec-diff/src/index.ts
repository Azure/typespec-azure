import yargs from "yargs";
import { diffSpec } from "./diff.js";
import {
  ConsoleJsonMessageReporter,
  ConsoleTextMessageReporter,
  MessageReporter,
} from "./reporter.js";
import { typespecDiffVersion } from "./utils.js";

async function main() {
  // eslint-disable-next-line no-console
  console.log(`TypeSpec Diff v${typespecDiffVersion}\n`);
  await yargs(process.argv.slice(2))
    .scriptName("typespec")
    .help()
    .strict()
    .parserConfiguration({
      "greedy-arrays": false,
      "boolean-negation": false,
    })
    .option("debug", {
      type: "boolean",
      description: "Output debug log messages.",
      default: false,
    })
    .command(
      "diff",
      "Diff TypeSpec source.",
      (cmd) => {
        return cmd
          .option("o", {
            type: "string",
            alias: "oldSpec",
            describe: "The old spec path.",
          })
          .option("n", {
            type: "string",
            alias: "newSpec",
            string: true,
            describe: "The new spec path.",
          })
          .option("c", {
            type: "string",
            alias: "configPath",
            string: true,
            describe: "The config file path.",
          })
          .option("old-version", {
            type: "string",
            alias: "oldVersion",
            describe: "The old spec version, like '2020-10-10'.",
          })
          .option("new-version", {
            type: "string",
            alias: "newVersion",
            string: true,
            describe: "The new spec version.",
          })
          .option("message-format", {
            type: "string",
            alias: "format",
            string: true,
            default: "text",
            describe: "The new spec version.",
          });
      },
      async (args) => {
        if (args.o && args.n) {
          const MessageReporter: MessageReporter =
            args.format === "json"
              ? new ConsoleJsonMessageReporter()
              : new ConsoleTextMessageReporter();
          await diffSpec(args.o, args.n, MessageReporter, args.c, args.oldVersion, args.newVersion);
        }
      }
    )
    .version(typespecDiffVersion)
    .demandCommand(1, "You must use one of the supported commands.").argv;
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
