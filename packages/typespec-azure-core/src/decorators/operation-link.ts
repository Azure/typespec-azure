import type { DecoratorContext, ModelProperty, Operation, Program, Type } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { OperationLinkDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";
import { type PropertyMap, type ResultInfo, getLroOperationInfo } from "../lro-info.js";

/**
 * Custom polling
 * Represents a property or header that provides a Uri linking to another operation
 */
export interface OperationLink {
  kind: "link";
  /** Indicates whether the link is in the response header or response body */
  location: "ResponseHeader" | "ResponseBody" | "Self";
  /** The property that contains the link */
  property: ModelProperty;
}

export interface OperationLinkMetadata {
  parameters?: Type;
  linkedOperation: Operation;
  linkType: string;

  link?: OperationLink;
  parameterMap?: Map<string, PropertyMap>;
  result?: ResultInfo;
}

const [
  /**
   * Returns the collection of `OperationLinkMetadata` for a given operation, if any, or undefined.
   */
  getOperationLinks,
  setOperationLinks,
] = useStateMap<Operation, Map<string, OperationLinkMetadata>>(AzureCoreStateKeys.operationLink);

export { getOperationLinks };

export const $operationLink: OperationLinkDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  linkType: string,
  parameters?: Type,
) => {
  if (parameters && parameters.kind !== "Model") {
    return;
  }
  const { program } = context;
  const [operationInfo, diagnostics] = getLroOperationInfo(
    program,
    entity,
    linkedOperation,
    linkType,
    parameters,
  );
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }

  // An operation may have many operationLinks, so treat them as a collection
  let items = getOperationLinks(program, entity);
  if (items === undefined) {
    items = new Map<string, OperationLinkMetadata>();
  }
  items.set(linkType, {
    parameters: parameters,
    linkedOperation: linkedOperation,
    linkType: linkType,
    link: operationInfo?.getOperationLink(),
    parameterMap: operationInfo?.getInvocationInfo()?.parameterMap,
    result: operationInfo?.getResultInfo(),
  } as OperationLinkMetadata);
  setOperationLinks(context.program, entity, items);
};

/**
 * Returns the `OperationLinkMetadata` for a given operation and link type, or undefined.
 */
export function getOperationLink(
  program: Program,
  entity: Operation,
  linkType: string,
): OperationLinkMetadata | undefined {
  const items = getOperationLinks(program, entity);
  if (items !== undefined) {
    return items.get(linkType);
  }
  return items;
}
