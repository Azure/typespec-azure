import {
  getClientNameOverride,
  type SdkClientType,
  type SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import pluralize from "pluralize";
import type { SdkContext } from "../../utils/interfaces.js";
import {
  guardReservedNames,
  NameType,
  normalizeName,
  normalizeSdkName,
  ReservedModelNames,
} from "../../utils/name-utils.js";
import type { ServiceOperation } from "../../utils/operation-util.js";

export function getClientName(client: SdkClientType<SdkServiceOperation>): string {
  const name = client.name.replace(/Client$/, "");
  return client.isExactName
    ? normalizeSdkName({ name, isExactName: true }, NameType.Interface, { shouldGuard: true })
    : name;
}

export function getClassicalClientName(client: SdkClientType<SdkServiceOperation>): string {
  return client.isExactName
    ? normalizeSdkName(client, NameType.Class, { shouldGuard: true })
    : client.name;
}

export interface GuardedName {
  /** The name used for the generated API-layer function (e.g. `deleteConversation`). */
  name: string;
  /** The name used for the public method exposed on clients and operation groups. */
  propertyName: string;
  fixme?: string[];
}

export function getOperationName(
  operation: ServiceOperation,
  dpgContext?: SdkContext,
  prefixes: string[] = [],
): GuardedName {
  const name = operation.isExactName
    ? guardReservedNames(operation.name, NameType.Method)
    : normalizeSdkName(operation, NameType.Method, { shouldGuard: true });
  const propertyName = normalizeSdkName(operation, NameType.Property);
  const isDataplane = dpgContext !== undefined && !dpgContext.emitterOptions?.azureArm;
  // An explicit `@clientName` override is an intentional naming choice by the user, so we
  // honor it verbatim and skip the reserved-word disambiguation (and its `@fixme`). The
  // public method keeps the reserved word (e.g. `delete`), while the generated API-layer
  // function stays guarded (e.g. `$delete`) because a reserved word is not a valid function
  // binding in JavaScript.
  const hasClientNameOverride =
    dpgContext !== undefined &&
    operation.__raw !== undefined &&
    getClientNameOverride(dpgContext, operation.__raw) !== undefined;
  if (isReservedName(operation.name, NameType.Method) && isDataplane && !hasClientNameOverride) {
    const suffix = getReservedNameGroupSuffix(prefixes);
    if (suffix) {
      // Disambiguate the reserved word by suffixing the singularized operation group
      // name, e.g. `delete` in the `Conversations` group becomes `deleteConversation`.
      const disambiguated = normalizeName(`${operation.name}_${suffix}`, NameType.Method);
      return {
        name: disambiguated,
        propertyName: disambiguated,
      };
    }
    // There is no operation group to disambiguate the reserved word with (e.g. a top-level
    // operation), so keep the guarded name (e.g. `$delete`) and surface a fixme asking the
    // user to override the generated name.
    return {
      name,
      propertyName,
      fixme: [
        `${operation.name} is a reserved word that cannot be used as an operation name. 
        Please add @clientName("clientName") or @clientName("<JS-Specific-Name>", "javascript") 
        to the operation to override the generated name.`,
      ],
    };
  }
  return {
    name,
    propertyName,
  };
}

/**
 * Builds the suffix used to disambiguate a reserved-word operation name from the
 * operation group it belongs to. The innermost operation group name is singularized
 * so that, for example, the `Conversations` group yields `Conversation`.
 */
function getReservedNameGroupSuffix(prefixes: string[]): string | undefined {
  const groups = prefixes.filter((prefix) => prefix && prefix.length > 0);
  const innermostGroup = groups[groups.length - 1];
  if (!innermostGroup) {
    return undefined;
  }
  return pluralize.singular(normalizeName(innermostGroup, NameType.Interface));
}

export function isReservedName(name: string, nameType: NameType): boolean {
  return ReservedModelNames.some(
    (reservedName) =>
      reservedName.name === name.toLowerCase() && reservedName.reservedFor.includes(nameType),
  );
}

export function getClassicalLayerPrefix(
  prefixes: string[],
  nameType: NameType,
  separator: string = "",
  layer: number = prefixes.length - 1,
): string {
  const prefix: string[] = [];
  if (layer < 0) {
    return prefix.join(separator);
  }
  if (layer === 0) {
    return normalizeName(prefixes[0] ?? "", nameType);
  }
  for (let i = 0; i <= layer; i++) {
    prefix.push(normalizeName(prefixes[i] ?? "", nameType));
  }
  return prefix.join(separator);
}

export function isDefined<T>(thing: T | undefined | null): thing is T {
  return typeof thing !== "undefined" && thing !== null;
}

/**
 * Generates a locally unique name within a set of existing names.
 * @param name - The base name.
 * @param existingNames - A set of names already in use.
 * @returns A unique name not present in the existing names set.
 */
export function generateLocallyUniqueName(name: string, existingNames: Set<string>): string {
  let uniqueName = name;
  let counter = 1;
  while (existingNames.has(uniqueName)) {
    uniqueName = `${name}_${counter}`;
    counter++;
  }
  return uniqueName;
}
