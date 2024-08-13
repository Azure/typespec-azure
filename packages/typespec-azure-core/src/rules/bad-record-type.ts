import {
  DiagnosticMessages,
  LinterRuleContext,
  Model,
  ModelProperty,
  Type,
  createRule,
  paramMessage,
} from "@typespec/compiler";

function validateIsRecordType(
  context: LinterRuleContext<DiagnosticMessages>,
  type: Type,
  target: Model
) {
  if (type.kind === "Intrinsic" && type.name === "unknown") {
    context.reportDiagnostic({
      messageId: "extendUnknown",
      target: target,
      format: { name: target.name, typeName: type.name, keyword: "is" },
    });
  } else if (type.kind === "Scalar" && target.properties.size > 0) {
    context.reportDiagnostic({
      messageId: "recordWithProperties",
      target: target,
      format: { name: target.name, typeName: type.name, keyword: "is" },
    });
  }
}

function validateExtendsRecordType(
  context: LinterRuleContext<DiagnosticMessages>,
  baseModel: Model,
  target: Model
) {
  if (!baseModel.indexer) {
    return;
  }
  const indexerVal = baseModel.indexer.value;
  if (indexerVal.kind === "Intrinsic" && indexerVal.name === "unknown") {
    context.reportDiagnostic({
      messageId: "extendUnknown",
      target: target,
      format: { name: target.name, typeName: indexerVal.name, keyword: "extends" },
    });
  } else if (indexerVal.kind === "Scalar" && target.properties.size > 0) {
    context.reportDiagnostic({
      messageId: "recordWithProperties",
      target: target,
      format: { name: target.name, typeName: indexerVal.name, keyword: "extends" },
    });
  }
}

function validatePropertyRecordType(
  context: LinterRuleContext<DiagnosticMessages>,
  type: Type,
  target: ModelProperty
) {
  if (type.kind === "Model" && type.indexer) {
    const indexerVal = type.indexer.value;
    if (indexerVal.kind === "Intrinsic" && indexerVal.name === "unknown") {
      const displayName = target.model ? `${target.model.name}.${target.name}` : target.name;
      context.reportDiagnostic({
        messageId: "extendUnknown",
        target: target,
        format: {
          name: displayName,
          typeName: indexerVal.name,
          keyword: ":",
        },
      });
    }
  }
}

export const badRecordTypeRule = createRule({
  name: "bad-record-type",
  description: "Identify bad record definitions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/bad-record-type",
  messages: {
    extendUnknown: paramMessage`${"name"} should not use '${"keyword"} Record<${"typeName"}>'. Use '${"keyword"} Record<string>' instead.`,
    recordWithProperties: paramMessage`${"name"} that uses '${"keyword"} Record<${"typeName"}>' should not have properties.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.indexer && model.name !== "Record") {
          validateIsRecordType(context, model.indexer.value, model);
        } else if (model.baseModel) {
          validateExtendsRecordType(context, model.baseModel, model);
        }
      },
      modelProperty: (prop: ModelProperty) => {
        if (prop.type.kind === "Model" && prop.type.indexer) {
          validatePropertyRecordType(context, prop.type, prop);
        }
      },
    };
  },
});
