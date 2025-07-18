import {
  createDiagnosticCollector,
  type DecoratorContext,
  type Diagnostic,
  type DiagnosticCollector,
  type Enum,
  type EnumMember,
  type ModelProperty,
  type Program,
  type Type,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { LroStatusDecorator } from "../../generated-defs/Azure.Core.js";
import { type LongRunningStates } from "../decorators.js";
import { AzureCoreStateKeys, createDiagnostic } from "../lib.js";
import { isLroCanceledState } from "./lro-cancelled.js";
import { isLroFailedState } from "./lro-failed.js";
import { isLroSucceededState } from "./lro-succeeded.js";

const [
  /**
   *  Returns the `LongRunningStates` associated with `entity`.
   */
  getLongRunningStates,
  setLroStatus,
] = useStateMap<Enum | Union | ModelProperty, LongRunningStates>(AzureCoreStateKeys.lroStatus);

export { getLongRunningStates };
export const $lroStatus: LroStatusDecorator = (
  context: DecoratorContext,
  entity: Enum | Union | ModelProperty,
) => {
  const [states, diagnostics] = extractLroStates(context.program, entity);
  if (diagnostics.length > 0) context.program.reportDiagnostics(diagnostics);
  if (states) {
    setLroStatus(context.program, entity, states);
  }
};

export function extractLroStates(
  program: Program,
  entity: Type,
): [LongRunningStates | undefined, readonly Diagnostic[]] {
  const result: PartialLongRunningStates = {
    states: [],
    succeededState: [],
    failedState: [],
    canceledState: [],
  };
  const diagnostics = createDiagnosticCollector();
  if (entity.kind === "ModelProperty") {
    // Call the function recursively on the property type
    return extractLroStates(program, entity.type);
  } else if (entity.kind === "Enum") {
    for (const member of entity.members.values()) {
      storeLroState(program, result, member.name, member);
    }
  } else if (entity.kind === "Union") {
    extractLroStatesFromUnion(program, entity, result, diagnostics);
  } else {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-property-invalid-type",
        target: entity,
        format: {
          type: entity.kind,
        },
      }),
    );

    return diagnostics.wrap(undefined);
  }

  // Make sure all terminal states have been identified
  const missingStates: string[] = [];
  if (result.succeededState.length < 1) {
    missingStates.push("Succeeded");
  }
  if (result.failedState.length < 1) {
    missingStates.push("Failed");
  }

  if (missingStates.length > 0) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-missing",
        target: entity,
        format: {
          states: missingStates.join(", "),
        },
      }),
    );

    return diagnostics.wrap(undefined);
  }

  return diagnostics.wrap(result as LongRunningStates);
}

// Internal use only
type PartialLongRunningStates = Partial<LongRunningStates> &
  Pick<LongRunningStates, "states"> &
  Pick<LongRunningStates, "succeededState"> &
  Pick<LongRunningStates, "failedState"> &
  Pick<LongRunningStates, "canceledState">;

function storeLroState(
  program: Program,
  states: PartialLongRunningStates,
  name: string,
  member?: EnumMember | UnionVariant,
) {
  const expectedStates: [
    string,
    (program: Program, entity: EnumMember | UnionVariant) => boolean,
    () => void,
  ][] = [
    ["Succeeded", isLroSucceededState, () => states.succeededState.push(name)],
    ["Failed", isLroFailedState, () => states.failedState.push(name)],
    ["Canceled", isLroCanceledState, () => states.canceledState.push(name)],
  ];

  states.states.push(name);
  for (const [knownState, stateTest, setter] of expectedStates) {
    if (name === knownState || (member && stateTest(program, member))) {
      setter();
      break;
    }
  }
}

function extractLroStatesFromUnion(
  program: Program,
  entity: Type,
  lroStateResult: PartialLongRunningStates,
  diagnostics: DiagnosticCollector,
) {
  if (entity.kind === "Union") {
    for (const variant of entity.variants.values()) {
      const option = variant.type;
      if (option.kind === "Enum") {
        for (const member of option.members.values()) {
          storeLroState(program, lroStateResult, member.name, member);
        }
      } else if (option.kind === "Union") {
        extractLroStatesFromUnion(program, option, lroStateResult, diagnostics);
      } else if (option.kind === "Scalar" && option.name === "string") {
        // Ignore string marking this union as open.
        continue;
      } else if (option.kind !== "String") {
        diagnostics.add(
          createDiagnostic({
            code: "lro-status-union-non-string",
            target: option,
            format: {
              type: option.kind,
            },
          }),
        );

        return diagnostics.wrap(undefined);
      } else {
        storeLroState(
          program,
          lroStateResult,
          typeof variant.name === "string" ? variant.name : option.value,
          variant,
        );
      }
    }
  }
  return;
}
