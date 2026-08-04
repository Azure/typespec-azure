import type {
  SdkClientType,
  SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import pluralize from "pluralize";
import type { SdkContext } from "../../utils/interfaces.js";
import { NameType, normalizeName, ReservedModelNames } from "../../utils/name-utils.js";
import type { ServiceOperation } from "../../utils/operation-util.js";

export function getClientName(client: SdkClientType<SdkServiceOperation>): string {
  return client.name.replace(/Client$/, "");
}

export function getClassicalClientName(client: SdkClientType<SdkServiceOperation>): string {
  return client.name;
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
  const name = normalizeName(operation.name, NameType.Method, true);
  const propertyName = normalizeName(operation.name, NameType.Property);
  const isDataplane = dpgContext !== undefined && !dpgContext.emitterOptions?.azureArm;
  if (isReservedName(operation.name, NameType.Method) && isDataplane) {
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
