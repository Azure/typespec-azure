import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-client-generator-core",
  diagnostics: {
    "client-name": {
      severity: "warning",
      messages: {
        default: paramMessage`Client name "${"name"}" must end with Client. Use @client({name: "...Client"}`,
      },
    },
    "client-service": {
      severity: "warning",
      messages: {
        default: paramMessage`Client "${"name"}" is not inside a service namespace. Use @client({service: MyServiceNS}`,
      },
    },
    "unknown-client-format": {
      severity: "error",
      messages: {
        default: paramMessage`Client format "${"format"}" is unknown. Known values are "${"knownValues"}"`,
      },
    },
    "incorrect-client-format": {
      severity: "error",
      messages: {
        default: paramMessage`Format "${"format"}" can only apply to "${"expectedTargetTypes"}"`,
      },
    },
    "union-null": {
      severity: "error",
      messages: {
        default: "Cannot have a union containing only null types.",
      },
    },
    "union-unsupported": {
      severity: "error",
      messages: {
        default:
          "Unions cannot be emitted by our language generators unless all options are literals of the same type.",
        null: "Unions containing multiple model types cannot be emitted unless the union is between one model type and 'null'.",
      },
    },
    "use-enum-instead": {
      severity: "warning",
      messages: {
        default:
          "Use enum instead of union of string or number literals. Falling back to the literal type.",
      },
    },
    access: {
      severity: "error",
      messages: {
        default: `Access decorator value must be "public" or "internal".`,
      },
    },
    "invalid-usage": {
      severity: "error",
      messages: {
        default: `Usage decorator value must be 2 ("input") or 4 ("output").`,
      },
    },
    "invalid-encode": {
      severity: "error",
      messages: {
        default: "Invalid encoding",
        wrongType: paramMessage`Encoding '${"encoding"}' cannot be used on type '${"type"}'`,
      },
    },
    "conflicting-multipart-model-usage": {
      severity: "error",
      messages: {
        default: "Invalid encoding",
        wrongType: paramMessage`Model '${"modelName"}' cannot be used as both multipart/form-data input and regular body input. You can create a separate model with name 'model ${"modelName"}FormData' extends ${"modelName"} {}`,
      },
    },
    "discriminator-not-constant": {
      severity: "error",
      messages: {
        default: paramMessage`Discriminator ${"discriminator"} has to be constant`,
      },
    },
    "discriminator-not-string": {
      severity: "warning",
      messages: {
        default: paramMessage`Value of discriminator ${"discriminator"} has to be a string, not ${"discriminatorValue"}`,
      },
    },
    "wrong-client-decorator": {
      severity: "warning",
      messages: {
        default: "@client or @operationGroup should decorate namespace or interface in client.tsp",
      },
    },
    "encoding-multipart-bytes": {
      severity: "error",
      messages: {
        default:
          "Encoding should not be applied to bytes content in a multipart request. This is semi-incompatible with how multipart works in HTTP.",
      },
    },
    "unsupported-kind": {
      severity: "warning",
      messages: {
        default: paramMessage`Unsupported kind ${"kind"}`,
      },
    },
  },
});

const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;

export { createDiagnostic, createStateSymbol, reportDiagnostic };
