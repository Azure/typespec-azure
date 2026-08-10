import { runOrExit } from "../../core/packages/internal-build-utils/dist/src/common.js";
import { autorest, scanSwaggers } from "./helpers.js";

const AUTOREST_CORE_VERSION = "3.10.7";

async function generateSDK(lang, swagger) {
  try {
    switch (lang) {
      case "python":
        await runOrExit(autorest, [
          "--debug",
          "--verbose",
          `--version=${AUTOREST_CORE_VERSION}`,
          "--python",
          "--track2",
          "--use=@autorest/python@6.35.0",
          "--python-sdks-folder=sdk/python",
          "--python-mode=update",
          "--input-file=" + swagger,
        ]);

        break;
      case "javascript":
        await runOrExit(autorest, [
          `--version=${AUTOREST_CORE_VERSION}`,
          "--typescript",
          "--use=@autorest/typescript@6.0.42",
          "--azure-arm",
          "--generate-metadata",
          "--output-folder=sdk/javascript",
          "--modelerfour.lenient-model-deduplication",
          "--head-as-boolean=true",
          "--license-header=MICROSOFT_MIT_NO_VERSION",
          "--input-file=" + swagger,
        ]);
        break;
      default:
        throw new Error("Not supported SDK language: " + lang);
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

const ignoreSwagger = [];
async function main() {
  const lang = process.argv[2]; // python/javascript
  const roots = process.argv[3].split(";");
  const paths = roots
    .flatMap((root) => scanSwaggers(root))
    .filter((x) => !ignoreSwagger.some((y) => x.endsWith(y)));
  console.log("Scanned following swaggers:", paths);
  const errorPaths = [];
  for (const p of paths) {
    console.log("Generate SDK for", p);
    const success = await generateSDK(lang, p);
    if (!success) {
      errorPaths.push(p);
    }
    console.log("\n\n\n");
  }
  if (errorPaths.length > 0) {
    console.error("SDK generation errors for following swagger files:");
    console.error(errorPaths);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error", error);
  process.exit(1);
});
