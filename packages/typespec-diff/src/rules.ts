import { getSourceLocation, Program, SourceLocation, Type } from "@typespec/compiler";
import { loadConfigFile } from "./config.js";
import { MessageReporter } from "./reporter.js";

export type Severity = "warn" | "error" | "info";

export type DiffContext = {
  direction: "Request" | "Response" | "None";
  oldProgram: Program;
  newProgram: Program;
  isVersionBumped?: boolean;
  versions: { oldVersion: string; newVersion: string };
  caches: Map<Type, Map<Type, DiffMessage[]>>;
  visited: Set<Type>;
  messageReporter: MessageReporter;
};

export interface CallableMessage<T extends string[]> {
  keys: T;
  (dict: Record<T[number], string>): string;
}

export type DiffMessages = {
  readonly [messageId: string]: string | CallableMessage<string[]>;
};

export type SeverityConfig = {
  severityForSingleVersionDiff: Severity;
  severityForCrossVersionDiff: Severity;
};

export type DiffRule<T extends DiffMessages> = {
  readonly messages: T;
  severityConfig: SeverityConfig;
  disabled?: boolean;
};

export type DiffMessage = {
  code: string;
  message: string;
  severity: Severity;
  old?: string;
  new?: string;
  versions: { oldVersion: string; newVersion: string };
};

type MessagesRecord = { readonly [code: string]: DiffMessages };

export type TypeSpecDiffRuleDef<T extends MessagesRecord> = {
  readonly [code in keyof T]: DiffRule<T[code]>;
};

export type MessageParam<
  T extends MessagesRecord,
  C extends keyof T,
  M extends keyof T[C] = "default",
> = T[C][M] extends CallableMessage<infer A>
  ? { params: Record<A[number], string> }
  : Record<string, unknown>;

export type MessageReport<
  T extends MessagesRecord,
  C extends keyof T,
  M extends keyof T[C] = "default",
> = {
  code: C;
  messageId?: M;
  oldType?: Type;
  newType?: Type;
} & MessageParam<T, C, M>;

export type DiffMessageMap<T extends MessagesRecord> = {
  readonly [code in keyof T]: DiffRule<T[code]>;
};

export function paramMessage<T extends string[]>(strings: readonly string[], ...keys: T) {
  const template = (dict: Record<T[number], string>) => {
    const result = [strings[0]];
    keys.forEach((key, i) => {
      const value = (dict as any)[key];
      if (value !== undefined) {
        result.push(value);
      }
      result.push(strings[i + 1]);
    });
    return result.join("");
  };
  template.keys = keys;
  return template;
}

export const ruleDefinition = {
  AddedVersion: {
    messages: {
      default: paramMessage`The version '${"version"}' was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "info", severityForCrossVersionDiff: "info" },
  },
  ProtocolNoLongerSupported: {
    messages: {
      default: paramMessage`The protocol '${"protocol"}' no longer supported.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedVersion: {
    messages: {
      default: paramMessage`The version '${"version"}' was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedNamespace: {
    messages: {
      default: paramMessage`The program was added a namespace '${"namespaceName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "info" },
  },
  RemovedNamespace: {
    messages: {
      default: paramMessage`The program was removed a namespace '${"namespaceName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "info" },
  },
  AddedEnumValue: {
    messages: {
      default: paramMessage`The enum was added a value '${"enumValue"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedEnumValue: {
    messages: {
      default: paramMessage`The enum was removed a value '${"enumValue"}'.}`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DifferentEnumValue: {
    messages: {
      default: paramMessage`The enum value was changed from  '${"oldEnumValue"}' to '${"newEnumValue"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedEnum: {
    messages: {
      default: paramMessage`The enum '${"enumName"}' was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "warn" },
  },
  RemovedEnum: {
    messages: {
      default: paramMessage`The enum '${"enumName"}' was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedModel: {
    messages: {
      default: paramMessage`The model ${"modelName"} was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedModel: {
    messages: {
      default: paramMessage`The model ${"modelName"} was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedUnion: {
    messages: {
      default: paramMessage`The union ${"unionName"} was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedUnion: {
    messages: {
      default: paramMessage`The union ${"unionName"} was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedProperty: {
    messages: {
      default: paramMessage`The property '${"propertyName"}' was removed from the new version '${"version"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedRequiredProperty: {
    messages: {
      default: paramMessage`The required property '${"propertyName"}' was added in the new version '${"version"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedOptionalProperty: {
    messages: {
      default: paramMessage`The optional property '${"propertyName"}' was added in the new version '${"version"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "warn" },
  },
  AddedRequiredParameter: {
    messages: {
      default: paramMessage`The required parameter '${"parameterName"}' was added in the operation '${"operationName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedOptionalParameter: {
    messages: {
      default: paramMessage`The optional parameter '${"parameterName"}' was added in the operation '${"operationName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "warn" },
  },
  RemovedRequiredParameter: {
    messages: {
      default: paramMessage`The required parameter '${"parameterName"}' was removed in the operation '${"operationName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedOptionalParameter: {
    messages: {
      default: paramMessage`The optional parameter '${"parameterName"}' was removed in the operation '${"operationName"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ChangedType: {
    messages: {
      default: paramMessage`The type was removed from ${"oldType"} to ${"newType"}.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ChangedArrayItemType: {
    messages: {
      default: paramMessage`The array item type was removed from ${"oldType"} to ${"newType"}.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ChangedPath: {
    messages: {
      default: paramMessage`The path for operation was changed from  '${"oldPath"}' to '${"newPath"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ChangedPropertyType: {
    messages: {
      default: paramMessage`The type of property '${"propertyName"}' was changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedDecoratorArgument: {
    messages: {
      default: `the decorator argument was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedDecoratorArgument: {
    messages: {
      default: `the decorator argument was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DecoratorArgumentChange: {
    messages: {
      default: paramMessage`The ${"argIndex"} argument of decorator '${"decoratorName"}' has changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedDecorator: {
    messages: {
      default: paramMessage`The decorator '${"decoratorName"}' was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedDecorator: {
    messages: {
      default: paramMessage`The decorator '${"decoratorName"}' was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedDefaultValue: {
    messages: {
      default: paramMessage`The property '${"propertyName"}' was added a default value.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedDefaultValue: {
    messages: {
      default: paramMessage`The property '${"propertyName"}' was removed a default value.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DifferentDefaultValue: {
    messages: {
      default: paramMessage`The default value of property '${"propertyName"}' has changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedInterface: {
    messages: {},
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedInterface: {
    messages: {},
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedOperation: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedOperation: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedBodyContentType: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was added a content type '${"contentType"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "warn" },
  },
  RemovedBodyContentType: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was removed a content type '${"contentType"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedResponseCode: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was added a response code '${"responseCode"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },

  RemovedResponseCode: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was removed a response code '${"responseCode"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedResponseHeader: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was added a response header '${"responseHeader"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedResponseHeader: {
    messages: {
      default: paramMessage`The operation '${"operationName"} was removed a response header '${"responseHeader"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ModifiedOperationId: {
    messages: {
      default: paramMessage`The operationId for operation '${"operationName"} was changed from '${"oldOperationId"}' to '${"newOperationId"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  // no check
  ChangedParameterOrder: {
    messages: {
      default: paramMessage`The parameter order for operation '${"operationName"} was changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },

  AddedLongrunningOperationSupport: {
    messages: {
      default: paramMessage`The operation '${"operationName"} has became a long running operation.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedLongrunningOperationSupport: {
    messages: {
      default: paramMessage`Th operation '${"operationName"} was no longer a long running operation.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },

  AddedPaginationSupport: {
    messages: {
      default: paramMessage`The model '${"modelName"} has supported pagination.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedPaginationSupport: {
    messages: {
      default: paramMessage`The model '${"modelName"} has supported pagination.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedVariant: {
    messages: {
      default: paramMessage`The variant '${"variantName"} was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedVariant: {
    messages: {
      default: paramMessage`The variant '${"variantName"} was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  // changed extends
  DifferentBaseModel: {
    messages: {
      default: paramMessage`The base model for model '${"modelName"} was changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DifferentBooleanLiteral: {
    messages: {
      default: paramMessage`The boolean literal has changed from '${"oldLiteral"} to '${"newLiteral"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DifferentNumericLiteral: {
    messages: {
      default: paramMessage`The numeric literal has changed from '${"oldLiteral"} to '${"newLiteral"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  DifferentStringLiteral: {
    messages: {
      default: paramMessage`The string literal has changed from '${"oldLiteral"} to '${"newLiteral"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  RemovedBaseModel: {
    messages: {
      default: paramMessage`The base model '${"baseModelName"}' of model '${"modelName"}' was removed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  AddedBaseModel: {
    messages: {
      default: paramMessage`The base model '${"baseModelName"}' of model '${"modelName"}' was added.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ChangedFormat: {
    messages: {
      default: paramMessage`The format has changed from '${"oldFormat"}' to '${"newFormat"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },

  // no check
  ConstraintIsStronger: {
    messages: {
      default: paramMessage`The constraint is stronger.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  // no check
  ConstraintIsWeaker: {
    messages: {
      default: paramMessage`The constraint is weaker.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },

  // can be coverred by decorator change
  DifferentDiscriminator: {
    messages: {
      default: paramMessage`The model discriminator has changed from '${"oldDiscriminator"}' to '${"newDiscriminator"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  // deprecated
  ConstantStatusHasChanged: {
    messages: {
      default: paramMessage`The enum constant status changed from '${"oldStatus"}' to '${"newStatus"}' .`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ParameterInHasChanged: {
    messages: {
      default: paramMessage`The parameter '${"parameterName"}' used to be a '${"oldParameterIn"} parameter, but now it's a '${"newParameterIn"}' parameter.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ArrayCollectionFormatChanged: {
    messages: {
      default: paramMessage`The collection format has changed from '${"oldFormat"}' to '${"newFormat"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  VisibilityChanged: {
    messages: {
      default: paramMessage`The visibility of property '${"propertyName"} has changed.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
  ConstraintChanged: {
    messages: {
      default: paramMessage`The constraint '${"constraintName"}' has changed from '${"oldConstraint"}' to '${"newConstraint"}'.`,
    },
    severityConfig: { severityForSingleVersionDiff: "error", severityForCrossVersionDiff: "error" },
  },
} as const;

function getLocationStr(location?: SourceLocation) {
  if (!location) {
    return "";
  }
  const pos = location.file.getLineAndCharacterOfPosition(location.pos);
  const file = location.file.path;
  const line = pos.line + 1;
  const col = pos.character + 1;
  return `${file}:${line}:${col}`;
}

export function createDiffLibs<T extends MessagesRecord>(def: Readonly<TypeSpecDiffRuleDef<T>>) {
  async function applyRuleConfig(configFile?: string) {
    if (configFile) {
      const config = await loadConfigFile(configFile);
      for (const [code, value] of Object.entries(config.rules)) {
        if (def[code]) {
          if (value === "off") {
            def[code].disabled = true;
          }
          if (typeof value === "object") {
            def[code].severityConfig = value;
          }
        }
      }
    }
  }
  function reportMessage<C extends keyof T, M extends keyof T[C]>(
    report: MessageReport<T, C, M>,
    ctx: DiffContext
  ) {
    const DiffRule = def[report.code];
    if (!DiffRule) {
      diffAssert(`Could not find the error message for code ${report.code as string}.`);
    }
    if (DiffRule.disabled) {
      return;
    }
    const oldLocation = report.oldType ? getSourceLocation(report.oldType) : undefined;
    const newLocation = report.newType ? getSourceLocation(report.newType) : undefined;
    const ruleMessage = def[report.code].messages[report.messageId ?? "default"];
    const message =
      typeof ruleMessage === "string" ? ruleMessage : (ruleMessage as any)(report.params);
    const severity = ctx.isVersionBumped
      ? DiffRule.severityConfig.severityForCrossVersionDiff
      : DiffRule.severityConfig.severityForSingleVersionDiff;
    const msg: DiffMessage = {
      severity,
      message,
      code: report.code as string,
      old: getLocationStr(oldLocation),
      new: getLocationStr(newLocation),
      versions: ctx.versions,
    };
    ctx.messageReporter.report(msg);
    return msg;
  }
  return {
    applyRuleConfig,
    reportMessage,
  };
}

export function diffAssert(message: string, oldType?: Type) {
  if (oldType) {
    let location: SourceLocation | undefined;
    try {
      location = getSourceLocation(oldType);
    } catch (err: any) {}

    if (location) {
      message += `\nOccurred while diffing code in ${getLocationStr(location)}`;
    }
  }

  throw new Error(message);
}
export const { applyRuleConfig, reportMessage } = createDiffLibs(ruleDefinition);
