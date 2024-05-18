import { resolvePath } from "@typespec/compiler";
import { findTestPackageRoot } from "@typespec/compiler/testing";
import { defineSampleSnaphotTests } from "@typespec/samples";
import { describe } from "vitest";

const excludedSamples = [
  // fails compilation by design to demo language server
  "local-typespec",
  "providerhub/cognitive",
  "multiple-types-union",
];

const pkgRoot = await findTestPackageRoot(import.meta.url);

const rootOutputDir = resolvePath(pkgRoot, "test/output");

const azureSamplesPath = resolvePath(pkgRoot, "specs");
const coreSamplesPath = resolvePath(pkgRoot, "../../core/packages/samples/specs");

describe("TypeSpec Samples (With autorest emitter)", () => {
  defineSampleSnaphotTests({
    sampleDir: coreSamplesPath,
    outputDir: resolvePath(rootOutputDir, "core"),
    exclude: [...excludedSamples, "authentication", "multipart"],
    emit: [resolvePath(pkgRoot, "node_modules/@azure-tools/typespec-autorest").replace(/\\/g, "/")],
  });
});

describe("TypeSpec Azure Samples", () => {
  describe("Data plane", () => {
    defineSampleSnaphotTests({
      sampleDir: azureSamplesPath,
      outputDir: resolvePath(rootOutputDir, "azure/core"),
      exclude: [
        ...excludedSamples,
        // ARM specs depend on functionality in typespec-autorest
        "resource-manager",
      ],
    });
  });

  describe("Azure Resource Manager", () => {
    defineSampleSnaphotTests({
      sampleDir: resolvePath(azureSamplesPath, "resource-manager"),
      outputDir: resolvePath(rootOutputDir, "azure/resource-manager"),
      exclude: excludedSamples,
    });
  });
});
