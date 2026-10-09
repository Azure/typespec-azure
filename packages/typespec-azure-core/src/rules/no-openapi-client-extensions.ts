import {
  type DecoratedType,
  type Type,
  createRule,
  fileRef,
  getTypeName,
  paramMessage,
} from "@typespec/compiler";

/**
 * OpenAPI (`x-ms-*` / `x-*`) extensions that alter how clients, SDKs, or the ARM
 * platform interpret an API. Emitting them through the raw `@typespec/openapi`
 * `@extension` decorator only affects the OpenAPI output, so non-OpenAPI emitters
 * (client SDKs, service code, etc.) never see them and produce an incorrect
 * representation of the API. Each of these has a first-class TypeSpec construct
 * that should be used instead.
 */
const clientAlteringExtensions = new Set<string>([
  "x-ms-skip-url-encoding",
  "x-ms-enum",
  "x-ms-parameter-grouping",
  "x-ms-parameter-location",
  "x-ms-client-name",
  "x-ms-discriminator-value",
  "x-ms-client-flatten",
  "x-ms-parameterized-host",
  "x-ms-pageable",
  "x-ms-long-running-operation",
  "x-ms-long-running-operation-options",
  "x-nullable",
  "x-ms-internal",
  "x-ms-azure-resource",
  "x-ms-arm-id-details",
  "x-ms-secret",
]);

export const noOpenapiClientExtensionsRule = createRule({
  name: "no-openapi-client-extensions",
  description:
    "Azure specs should not use @typespec/openapi @extension to emit client-altering x-ms-* extensions",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-openapi-client-extensions",
  docs: fileRef.fromPackageRoot("src/rules/no-openapi-client-extensions.md"),
  messages: {
    default: paramMessage`Do not use the @typespec/openapi @extension decorator to emit the client-altering "${"name"}" extension. It only affects the OpenAPI output, so client SDKs and other emitters will produce an incorrect representation of the API. Use the corresponding TypeSpec construct instead.`,
  },
  create(context) {
    function checkDecorators(type: DecoratedType & Type) {
      for (const dec of type.decorators) {
        if (dec.definition?.name !== "@extension") {
          continue;
        }
        const namespace = getTypeName(dec.definition.namespace);
        if (namespace !== "TypeSpec.OpenAPI") {
          continue;
        }
        const key = dec.args?.[0]?.jsValue;
        if (typeof key === "string" && clientAlteringExtensions.has(key)) {
          context.reportDiagnostic({
            target: dec.node ?? type,
            format: { name: key },
          });
        }
      }
    }
    return {
      model: checkDecorators,
      modelProperty: checkDecorators,
      enum: checkDecorators,
      enumMember: checkDecorators,
      union: checkDecorators,
      unionVariant: checkDecorators,
      operation: checkDecorators,
      interface: checkDecorators,
      namespace: checkDecorators,
    };
  },
});
