import {
  getClientLocation,
  getClientNameOverride,
  type TCGCContext,
} from "@azure-tools/typespec-client-generator-core";
import {
  getFriendlyName,
  getLifecycleVisibilityEnum,
  getVisibilityForClass,
  isGlobalNamespace,
  isService,
  isTemplateInstance,
  ModelProperty,
  Operation,
  Program,
  Service,
  Type,
} from "@typespec/compiler";
import { getOperationId } from "@typespec/openapi";
import { pascalCase } from "change-case";

export interface AutorestEmitterContext {
  readonly program: Program;
  readonly service: Service;
  readonly outputFile: string;
  readonly tcgcSdkContext: TCGCContext;
  readonly version?: string;
}

export function getClientName(context: AutorestEmitterContext, type: Type & { name: string }) {
  const clientName = getClientNameOverride(context.tcgcSdkContext, type);
  return clientName ?? type.name;
}
/**
 * Determines whether a type will be inlined in OpenAPI rather than defined
 * as a schema and referenced.
 *
 * All anonymous types (anonymous models, arrays, tuples, etc.) are inlined.
 *
 * Template instantiations are inlined unless they have a friendly name.
 *
 * A friendly name can be provided by the user using `@friendlyName`
 * decorator, or chosen by default in simple cases.
 */
export function shouldInline(program: Program, type: Type): boolean {
  if (getFriendlyName(program, type)) {
    return false;
  }
  switch (type.kind) {
    case "Model":
      return !type.name || isTemplateInstance(type);
    case "Scalar":
      return program.checker.isStdType(type) || isTemplateInstance(type);
    case "Enum":
    case "Union":
      return !type.name;
    default:
      return true;
  }
}

/**
 * Resolve the OpenAPI operation ID for the given operation using the following logic:
 * - If @operationId was specified use that value
 * - If @clientLocation was specified:
 *   - If the target is a string, use the string value as the prefix of the operation ID
 *   - If the target is an Interface, use the interface name as the prefix
 *   - If the target is a Namespace and it's not the service namespace or global namespace, use the namespace name as the prefix
 *   - If the target is the service namespace or global namespace, use the operation name as the operation ID
 * - If operation is defined at the root or under the service namespace return `<operation.name>`
 * - Otherwise(operation is under another namespace or interface) return `<namespace/interface.name>_<operation.name>`
 *
 * @param program TypeSpec Program
 * @param operation Operation
 * @returns Operation ID in this format `<name>` or `<group>_<name>`
 */
export function resolveOperationId(context: AutorestEmitterContext, operation: Operation) {
  const { program } = context;
  const explicitOperationId = getOperationId(program, operation);
  if (explicitOperationId) {
    return explicitOperationId;
  }

  const operationName = getClientName(context, operation);

  // Check for `@clientLocation` decorator
  const clientLocation = getClientLocation(context.tcgcSdkContext, operation);
  if (clientLocation) {
    if (typeof clientLocation === "string") {
      return pascalCaseForOperationId(`${clientLocation}_${operationName}`);
    }

    if (clientLocation.kind === "Interface") {
      return pascalCaseForOperationId(`${getClientName(context, clientLocation)}_${operationName}`);
    }

    if (clientLocation.kind === "Namespace") {
      if (isGlobalNamespace(program, clientLocation) || isService(program, clientLocation)) {
        return pascalCase(operationName);
      }
      return pascalCaseForOperationId(`${getClientName(context, clientLocation)}_${operationName}`);
    }
  }

  if (operation.interface) {
    return pascalCaseForOperationId(
      `${getClientName(context, operation.interface)}_${operationName}`,
    );
  }
  const namespace = operation.namespace;
  if (
    namespace === undefined ||
    isGlobalNamespace(program, namespace) ||
    isService(program, namespace)
  ) {
    return pascalCase(operationName);
  }

  return pascalCaseForOperationId(`${getClientName(context, namespace)}_${operationName}`);
}

/**
 * Determines if a property is read-only, which is defined as having only the
 * Lifecycle.Read visibility active within the Lifecycle visibility class.
 *
 * If there is more than one Lifecycle visibility modifier active, then the
 * property is not read-only. For example, `@visibility(Lifecycle.Read, Lifecycle.Update)`
 * does not designate a read-only property.
 */
export function isReadonlyProperty(program: Program, property: ModelProperty) {
  const lifecycle = getLifecycleVisibilityEnum(program);

  const read = lifecycle.members.get("Read")!;

  const visibility = getVisibilityForClass(program, property, lifecycle);

  // note: multiple visibilities that include read are not handled using
  // readonly: true, but using separate schemas.
  return visibility.size === 1 && visibility.has(read);
}

function pascalCaseForOperationId(name: string) {
  return name
    .split("_")
    .map((s) => pascalCase(s))
    .join("_");
}
