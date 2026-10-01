import {
  type Type,
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { isCamelCaseNoAcronyms, isPascalCaseWithAcceptedAcronyms, isSnakeCase } from "./utils.js";

const acceptedAzureAcronyms = ["AI", "VM", "OS", "IP", "CPU", "GPU", "LRO"];

export type CasingStyle = "camelCase" | "PascalCase" | "snake_case" | false;

export interface CasingStyleOptions {
  model?: CasingStyle;
  modelProperty?: CasingStyle;
  operation?: CasingStyle;
  operationTemplate?: CasingStyle;
  interface?: CasingStyle;
  namespace?: CasingStyle;
  union?: CasingStyle;
  unionVariant?: CasingStyle;
  enum?: CasingStyle;
  enumMember?: CasingStyle;
  scalar?: CasingStyle;
}

const defaultOptions: Required<CasingStyleOptions> = {
  model: "PascalCase",
  modelProperty: "camelCase",
  operation: "camelCase",
  operationTemplate: "PascalCase",
  interface: "PascalCase",
  namespace: "PascalCase",
  union: false,
  unionVariant: false,
  enum: false,
  enumMember: false,
  scalar: false,
};

const predicates = {
  camelCase: isCamelCaseNoAcronyms,
  PascalCase: (name: string) => isPascalCaseWithAcceptedAcronyms(name, acceptedAzureAcronyms),
  snake_case: isSnakeCase,
};

export const casingRule = createRule({
  name: "casing-style",
  docs: fileRef.fromPackageRoot("src/rules/casing-style.md"),
  description: "Ensure proper casing style.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/casing-style",
  messages: {
    default: paramMessage`The names of ${"type"} types must use ${"casing"}`,
  },
  defaultOptions,
  optionSchema: {
    type: "object",
    properties: Object.fromEntries(
      Object.keys(defaultOptions).map((category) => [
        category,
        { enum: ["camelCase", "PascalCase", "snake_case", false] },
      ]),
    ),
    additionalProperties: false,
  },
  create(context) {
    function check(
      target: Type & { name?: string | symbol },
      category: keyof CasingStyleOptions,
      type: string,
    ) {
      const casing = context.options[category];
      if (casing === false || typeof target.name !== "string" || target.name === "") return;
      if (!predicates[casing](target.name)) {
        context.reportDiagnostic({
          format: { type, casing },
          target,
        });
      }
    }

    return {
      model: (model) => check(model, "model", "Model"),
      modelProperty: (property) => {
        if (context.options.modelProperty === "camelCase" && property.name === "_") return;
        check(property, "modelProperty", "Property");
      },
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation)) {
          check(operation, "operationTemplate", "Operation Template");
        } else {
          check(operation, "operation", "Operation");
        }
      },
      interface: (operationGroup) => check(operationGroup, "interface", "Interface"),
      namespace: (namespace) => check(namespace, "namespace", "Namespace"),
      union: (union) => check(union, "union", "Union"),
      unionVariant: (variant) => check(variant, "unionVariant", "Union Variant"),
      enum: (enumType) => {
        check(enumType, "enum", "Enum");
        // Semantic navigation does not visit enum members.
        for (const member of enumType.members.values()) {
          check(member, "enumMember", "Enum Member");
        }
      },
      scalar: (scalar) => check(scalar, "scalar", "Scalar"),
    };
  },
});
