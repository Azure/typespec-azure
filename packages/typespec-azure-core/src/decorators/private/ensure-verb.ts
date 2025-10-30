import { type Operation, type Program } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import { getHttpOperation } from "@typespec/http";
import type { EnsureVerbDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../../lib.js";

const [_, setEnsureVerb, getEnsureVerbStateMap] = useStateMap<Operation, [string, string]>(
  AzureCoreStateKeys.ensureVerb,
);

export const $ensureVerb: EnsureVerbDecorator = (
  context,
  entity,
  templateName: string,
  verb: string,
) => {
  setEnsureVerb(context.program, entity, [templateName, verb]);
  context.program.stateMap(AzureCoreStateKeys.ensureVerb).set(entity, [templateName, verb]);
};

// TODO: migrate this to decorator post validation when/if become available
export function checkEnsureVerb(program: Program) {
  const opMap = getEnsureVerbStateMap(program);
  for (const [operation, [templateName, requiredVerb]] of opMap.entries()) {
    const verb = getHttpOperation(program, operation)[0].verb.toString().toLowerCase();
    const reqVerb: string = requiredVerb.toLowerCase();
    if (verb !== reqVerb) {
      reportDiagnostic(program, {
        code: "verb-conflict",
        target: operation,
        format: {
          templateName: templateName,
          verb: verb.toUpperCase(),
          requiredVerb: reqVerb.toUpperCase(),
        },
      });
    }
  }
}
