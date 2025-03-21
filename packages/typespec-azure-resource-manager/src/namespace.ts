import {
  DecoratorContext,
  Enum,
  EnumMember,
  EnumValue,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  addService,
  getNamespaceFullName,
} from "@typespec/compiler";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import * as http from "@typespec/http";
import { getAuthentication, setAuthentication } from "@typespec/http";
import { unsafe_setRouteOptionsForNamespace as setRouteOptionsForNamespace } from "@typespec/http/experimental";
import { getResourceTypeForKeyParam } from "@typespec/rest";
import {
  ArmLibraryNamespaceDecorator,
  ArmProviderNamespaceDecorator,
  UseLibraryNamespaceDecorator,
} from "../generated-defs/Azure.ResourceManager.js";
import { $armCommonTypesVersion } from "./common-types.js";
import { reportDiagnostic } from "./lib.js";
import { getSingletonResourceKey } from "./resource.js";
import { ArmStateKeys } from "./state.js";

function getArmCommonTypesVersion(
  context: DecoratorContext,
  entity: Namespace | EnumMember,
): EnumValue | undefined {
  return entity.decorators.find((x) => x.definition?.name === "@armCommonTypesVersion")?.args[0]
    .jsValue as EnumValue | undefined;
}

function setArmCommonTypesVersionIfDoesnotExist(
  context: DecoratorContext,
  entity: Namespace | EnumMember,
  commonTypeVersion: string,
) {
  // Determine whether to set a default ARM CommonTypes.Version
  const armCommonTypesVersion = entity.decorators.find(
    (x) => x.definition?.name === "@armCommonTypesVersion",
  );
  // if no existing @armCommonTypesVersion decorator, add default.
  // This will NOT cause error if overrode on version enum.
  if (!armCommonTypesVersion) {
    context.call($armCommonTypesVersion, entity, commonTypeVersion);
  }
}

/**
 * Mark the target namespace as containign only ARM library types.  This is used to create libraries to share among RPs
 * @param context The doecorator context, automatically supplied by the compiler
 * @param entity The decorated namespace
 */
export const $armLibraryNamespace: ArmLibraryNamespaceDecorator = (
  context: DecoratorContext,
  entity: Namespace,
) => {
  const { program } = context;

  program.stateMap(ArmStateKeys.armLibraryNamespaces).set(entity, true);

  setArmCommonTypesVersionIfDoesnotExist(context, entity, "v3");
};

/**
 * Check if the given namespace contains ARM library types
 * @param program The program to process
 * @param namespace The namespace to check
 * @returns true if the given namespace contains ARM library types only, false otherwise
 */
export function isArmLibraryNamespace(program: Program, namespace: Namespace): boolean {
  return program.stateMap(ArmStateKeys.armLibraryNamespaces).get(namespace) === true;
}

export function isArmProviderNamespace(
  program: Program,
  namespace: Namespace | undefined,
): boolean {
  return (
    namespace !== undefined && program.stateMap(ArmStateKeys.armProviderNamespaces).has(namespace)
  );
}

function isArmNamespaceOverride(program: Program, entity: Namespace): boolean {
  return (
    program.stateMap(ArmStateKeys.armProviderNamespaces).size === 1 &&
    program.stateMap(ArmStateKeys.armProviderNamespaces).has(entity)
  );
}

/**
 * Specify which ARM library namespaces this arm provider uses
 * @param {DecoratorContext} context Standard DecoratorContext object
 * @param {Namespace} entity The namespace the decorator is applied to
 * @param {Namespace[]} namespaces The library namespaces that will be used in this namespace
 */
export const $useLibraryNamespace: UseLibraryNamespaceDecorator = (
  context: DecoratorContext,
  entity: Namespace,
  ...namespaces: Namespace[]
) => {
  const { program } = context;
  const provider = program.stateMap(ArmStateKeys.armProviderNamespaces).get(entity);

  if (provider) {
    setLibraryNamespaceProvider(program, provider, namespaces);
  }

  program.stateMap(ArmStateKeys.usesArmLibraryNamespaces).set(entity, namespaces);
};

/**
 * Determine which library namespaces are used in this provider
 * @param {Program} program The program to check
 * @param {Namespace} namespace The provider namespace
 */
export function getUsedLibraryNamespaces(
  program: Program,
  namespace: Namespace,
): Namespace[] | undefined {
  return program.stateMap(ArmStateKeys.usesArmLibraryNamespaces).get(namespace) as Namespace[];
}

function setLibraryNamespaceProvider(program: Program, provider: string, namespaces: Namespace[]) {
  for (const namespace of namespaces) {
    program.stateMap(ArmStateKeys.armProviderNamespaces).set(namespace, provider);
  }
}

/**
 * `@armProviderNamespace` sets the ARM provider namespace.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {type} entity Target of the decorator. Must be `namespace` type
 * @param {string} armProviderNamespace Provider namespace
 */
export const $armProviderNamespace: ArmProviderNamespaceDecorator = (
  context: DecoratorContext,
  entity: Namespace,
  armProviderNamespace?: string,
) => {
  const { program } = context;

  const inRealm = unsafe_Realm.realmForType.has(entity);
  const override = isArmNamespaceOverride(program, entity);
  const namespaceCount = program.stateMap(ArmStateKeys.armProviderNamespaces).size;
  if (namespaceCount > 0 && !override && !inRealm) {
    reportDiagnostic(program, {
      code: "single-arm-provider",
      target: context.decoratorTarget,
    });
    return;
  }

  // armProviderNamespace will set the service namespace if it's not done already
  if (!override || inRealm) {
    addService(program, entity);

    if (!http.getServers(program, entity)) {
      context.call(
        http.$server,
        entity,
        "https://management.azure.com",
        "Azure Resource Manager url.",
      );
    }
  }

  const armCommonTypesVersion = getArmCommonTypesVersion(context, entity);

  // If it is versioned namespace, we will check each Version enum member. If no
  // @armCommonTypeVersion decorator, add the one
  const versioned = entity.decorators.find((x) => x.definition?.name === "@versioned");
  if (versioned) {
    const versionEnum = versioned.args[0].value as Enum;
    versionEnum.members.forEach((v) => {
      if (!getArmCommonTypesVersion(context, v)) {
        context.call($armCommonTypesVersion, v, armCommonTypesVersion ?? "v3");
      }
    });
  } else {
    // if it is unversioned namespace, set @armCommonTypesVersion and
    // no existing @armCommonTypesVersion decorator, add default.
    // This will NOT cause error if overrode on version enum.
    if (!armCommonTypesVersion) {
      context.call($armCommonTypesVersion, entity, "v3");
    }
  }

  // 'namespace' is optional, use the actual namespace string if omitted
  const typespecNamespace = getNamespaceFullName(entity);
  if (!armProviderNamespace) {
    armProviderNamespace = typespecNamespace;
  }

  program.stateMap(ArmStateKeys.armProviderNamespaces).set(entity, armProviderNamespace);

  const libraryNamespace = getUsedLibraryNamespaces(program, entity);

  if (libraryNamespace) {
    setLibraryNamespaceProvider(program, armProviderNamespace, libraryNamespace);
  }

  // Set default security definitions
  if (!override) {
    if (getAuthentication(program, entity) === undefined) {
      setAuthentication(program, entity, {
        options: [
          {
            schemes: [
              {
                id: "azure_auth",
                description: "Azure Active Directory OAuth2 Flow.",
                type: "oauth2",
                model: null as any,
                flows: [
                  {
                    type: "implicit",
                    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize",
                    scopes: [
                      { value: "user_impersonation", description: "impersonate your user account" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    // Set route options for the whole namespace
    setRouteOptionsForNamespace(program, entity, {
      autoRouteOptions: {
        // Filter key parameters for singleton resource types to insert the
        // singleton key value
        routeParamFilter: (operation: Operation, param: ModelProperty) => {
          const paramResourceType = getResourceTypeForKeyParam(program, param);
          if (paramResourceType) {
            const singletonKey = getSingletonResourceKey(program, paramResourceType);
            if (singletonKey) {
              return {
                routeParamString: singletonKey,
                excludeFromOperationParams: true,
              };
            }
          }

          // Returning undefined leaves the parameter unaffected
          return undefined;
        },
      },
    });
  }
};

/**
 * Get the ARM provider namespace for a given entity
 * @param {Program} program
 * @param {Namespace | Model} entity
 * @returns {string | undefined} ARM provider namespace
 */
export function getArmProviderNamespace(
  program: Program,
  entity: Namespace | Model,
): string | undefined {
  let currentNamespace: Namespace | undefined =
    entity.kind === "Namespace" ? entity : entity.namespace;

  let armProviderNamespace: string | undefined;
  while (currentNamespace) {
    armProviderNamespace = program
      .stateMap(ArmStateKeys.armProviderNamespaces)
      .get(currentNamespace);
    if (armProviderNamespace) {
      return armProviderNamespace;
    }

    currentNamespace = currentNamespace.namespace;
  }

  return undefined;
}
