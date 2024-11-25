import samples from "../samples/dist/samples.js";

export const TypeSpecPlaygroundConfig = {
  defaultEmitter: "@azure-tools/typespec-autorest",
  libraries: [
    "@typespec/compiler",
    "@typespec/events",
    "@typespec/http",
    "@typespec/json-schema",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/openapi3",
    "@typespec/protobuf",
    "@typespec/sse",
    "@typespec/streams",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-autorest",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azure-rulesets",
  ],
  samples,
} as const;
