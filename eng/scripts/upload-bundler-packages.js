// @ts-check
import {
  bundleAndUploadPackages,
  getPackageVersion,
} from "../../core/packages/bundle-uploader/dist/src/index.js";
import { repoRoot } from "./helpers.js";

await bundleAndUploadPackages({
  repoRoot: repoRoot,
  indexName: "azure",
  indexVersion: await getPackageVersion(repoRoot, "@azure-tools/typespec-azure-core"),
  packages: [
    "@typespec/compiler",
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@typespec/openapi3",
    "@typespec/json-schema",
    "@typespec/protobuf",
    "@azure-tools/typespec-autorest",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-azure-rulesets",
  ],
});
