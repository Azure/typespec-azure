import {
  ModelProperty,
  Operation,
  Program,
  ProjectedNameView,
  Service,
  Type,
  getFriendlyName,
  getVisibility,
  isGlobalNamespace,
  isService,
  isTemplateInstance,
} from "@typespec/compiler";
import { getOperationId } from "@typespec/openapi";
import { pascalCase } from "change-case";

export interface AutorestEmitterContext {
  program: Program;
  service: Service;
  version?: string;
  jsonView: ProjectedNameView;
  clientView: ProjectedNameView;
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
 * - If operation is defined at the root or under the service namespace return `<operation.name>`
 * - Otherwise(operation is under another namespace or interface) return `<namespace/interface.name>_<operation.name>`
 *
 * @param program TypeSpec Program
 * @param operation Operation
 * @returns Operation ID in this format `<name>` or `<group>_<name>`
 */
export function resolveOperationId(context: AutorestEmitterContext, operation: Operation) {
  const { program, clientView } = context;
  const explicitOperationId = getOperationId(program, operation);
  if (explicitOperationId) {
    return explicitOperationId;
  }

  const operationName = clientView.getProjectedName(operation);
  if (operation.interface) {
    return pascalCaseForOperationId(
      `${clientView.getProjectedName(operation.interface)}_${operationName}`
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

  return pascalCaseForOperationId(`${namespace.name}_${operationName}`);
}

/**
 * Determines if a property is read-only, which is defined as being
 * decorated `@visibility("read")`.
 *
 * If there is more than 1 `@visibility` argument, then the property is not
 * read-only. For example, `@visibility("read", "update")` does not
 * designate a read-only property.
 */
export function isReadonlyProperty(program: Program, property: ModelProperty) {
  const visibility = getVisibility(program, property);
  // note: multiple visibilities that include read are not handled using
  // readonly: true, but using separate schemas.
  return visibility?.length === 1 && visibility[0] === "read";
}

function pascalCaseForOperationId(name: string) {
  return name
    .split("_")
    .map((s) => pascalCase(s))
    .join("_");
}
