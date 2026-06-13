// @ts-check
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { uploadStandalonePackageAssets } from "../../core/packages/bundle-uploader/dist/src/index.js";

/**
 * Upload the pygen wheel from the installed @typespec/http-client-python package.
 * The wheel is fetched at runtime in the browser by the inlined http-client-python code.
 *
 * @param {string} repoRoot
 */
export async function uploadPythonEmitterAssets(repoRoot) {
  const typespecPythonRequire = createRequire(
    resolve(repoRoot, "packages/typespec-python/package.json"),
  );
  const httpClientPythonEntry = typespecPythonRequire.resolve("@typespec/http-client-python");
  const httpClientPythonPath = resolve(dirname(httpClientPythonEntry), "../..");

  await uploadStandalonePackageAssets({
    packagePath: httpClientPythonPath,
    assets: [
      {
        path: "generator/dist/pygen-*.whl",
        contentType: "application/zip",
      },
    ],
  });
}
