import { DecoratorApplication, DiagnosticTarget, Model, Namespace } from "@typespec/compiler";
import { TCGCContext } from "../interfaces.js";
import { listAllUserDefinedNamespaces } from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

interface DecoratorScopeRequirement {
  /** The decorator name as it appears in the definition (e.g., "@convenientAPI") */
  decoratorName: string;
  /** If provided, the scope must include at least one of these languages. If undefined, any scope is accepted. */
  allowedScopes?: string[];
  /** If true, only check when the first boolean argument is true. */
  onlyWhenTrue?: boolean;
}

const DECORATOR_SCOPE_REQUIREMENTS: DecoratorScopeRequirement[] = [
  {
    decoratorName: "@convenientAPI",
    allowedScopes: ["java", "csharp"],
    onlyWhenTrue: true,
  },
  {
    decoratorName: "@clientOption",
  },
];

function parseScope(scopeArg: string): string[] {
  return scopeArg.split(",").map((s) => s.trim().toLowerCase());
}

function checkDecoratorScopes(
  context: TCGCContext,
  decorators: DecoratorApplication[],
  target: DiagnosticTarget,
) {
  for (const requirement of DECORATOR_SCOPE_REQUIREMENTS) {
    const matchingDecorators = decorators.filter(
      (d) => d.definition?.name === requirement.decoratorName,
    );

    for (const decorator of matchingDecorators) {
      // For decorators with onlyWhenTrue, skip validation when the first arg is false.
      // e.g., @convenientAPI(false) is always allowed — opting out is safe for any language.
      if (requirement.onlyWhenTrue) {
        const firstArgValue = (decorator.args[0]?.value as any)?.value;
        if (firstArgValue === false) {
          continue;
        }
      }

      // Find the scope argument - it's the last string argument.
      // decorator.args[i].value is a Value object with entityKind and a nested .value for the primitive.
      const scopeArg = decorator.args.find((arg, idx) => {
        const val = arg.value as any;
        return typeof val?.value === "string" && idx !== 0;
      });
      const scopeValue = (scopeArg?.value as any)?.value as string | undefined;

      if (scopeValue === undefined) {
        // No scope provided at all
        const allowedScopes = requirement.allowedScopes
          ? `"${requirement.allowedScopes.join('" or "')}"`
          : "a specific language";
        reportDiagnostic(context.program, {
          code: "decorator-requires-scope",
          format: {
            decoratorName: requirement.decoratorName.slice(1), // remove @
            allowedScopes,
          },
          target,
        });
        continue;
      }

      // If there are allowed scopes, check the provided scope includes at least one
      if (requirement.allowedScopes) {
        const parsedScopes = parseScope(scopeValue);
        const hasValidScope = parsedScopes.some((s) =>
          requirement.allowedScopes!.some((allowed) => s.includes(allowed)),
        );
        if (!hasValidScope) {
          reportDiagnostic(context.program, {
            code: "decorator-requires-scope",
            format: {
              decoratorName: requirement.decoratorName.slice(1), // remove @
              allowedScopes: `"${requirement.allowedScopes.join('" or "')}"`,
            },
            target,
          });
        }
      }
    }
  }
}

export function validateDecoratorScopes(context: TCGCContext) {
  for (const namespace of listAllUserDefinedNamespaces(context)) {
    walkNamespace(context, namespace);
  }
}

function walkNamespace(context: TCGCContext, namespace: Namespace) {
  checkDecoratorScopes(context, namespace.decorators, namespace);

  for (const op of namespace.operations.values()) {
    checkDecoratorScopes(context, op.decorators, op);
  }

  for (const iface of namespace.interfaces.values()) {
    checkDecoratorScopes(context, iface.decorators, iface);
    for (const op of iface.operations.values()) {
      checkDecoratorScopes(context, op.decorators, op);
    }
  }

  for (const model of namespace.models.values()) {
    walkModel(context, model);
  }

  for (const child of namespace.namespaces.values()) {
    walkNamespace(context, child);
  }
}

function walkModel(context: TCGCContext, model: Model) {
  checkDecoratorScopes(context, model.decorators, model);
}
