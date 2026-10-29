import type { Operation, Program } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import { AzureCoreStateKeys } from "./lib.js";

/**
 * Resolves an accepted explicit LRO declaration for a full emitter package name.
 * The declaration owner retains its validation and scope semantics. Read state
 * from the supplied program and operation, not captured source instances.
 */
export type LroDeclarationEvaluator = (
  program: Program,
  operation: Operation,
  emitterName: string,
) => boolean;

const [getDeclaration, setDeclaration] = useStateMap<Operation, LroDeclarationEvaluator>(
  AzureCoreStateKeys.lroDeclaration,
);

/**
 * Publish an accepted explicit LRO declaration. Replaces the operation's previous
 * evaluator. Producers must publish only after validation and resolve current
 * state without side effects; ignored declarations must not replace prior state.
 */
export function setLroDeclaration(
  program: Program,
  operation: Operation,
  evaluate: LroDeclarationEvaluator,
): void {
  setDeclaration(program, operation, evaluate);
}

/**
 * Whether an operation has an accepted explicit LRO declaration for an emitter.
 * This does not infer a declaration from LRO polling/protocol metadata or inspect
 * raw OpenAPI extensions.
 * @param emitterName Full emitter package name, for example `@azure-tools/typespec-autorest`.
 */
export function isLroDeclared(
  program: Program,
  operation: Operation,
  emitterName: string,
): boolean {
  return getDeclaration(program, operation)?.(program, operation, emitterName) ?? false;
}
