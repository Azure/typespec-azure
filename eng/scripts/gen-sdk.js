import { autorest, run, scanSwaggers } from "./helpers.js";

const AUTOREST_CORE_VERSION = "3.7.2";

function generateSDK(lang, swagger) {
  try {
    switch (lang) {
      case "python":
        run(autorest, [
          "--debug",
          "--verbose",
          `--version=${AUTOREST_CORE_VERSION}`,
          "--python",
          "--track2",
          "--use=@autorest/python@5.16.0",
          "--python-sdks-folder=sdk/python",
          "--python-mode=update",
          "--input-file=" + swagger,
        ]);

        break;
      case "javascript":
        run(autorest, [
          `--version=${AUTOREST_CORE_VERSION}`,
          "--typescript",
          "--use=@autorest/typescript@6.0.0-rc.1",
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

const ignoreSwagger = [
  // BUG https://github.com/Azure/typespec-azure/issues/1750
  "resource-manager/dynatrace/2021-06-13-preview/openapi.json",
  "resource-manager/dynatrace/2022-04-30-preview/openapi.json",
];
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
