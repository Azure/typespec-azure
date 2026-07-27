import { createRule, type Interface, type Namespace, type Operation } from "@typespec/compiler";
import { getAllHttpServices, getAuthentication, type Authentication, type HttpAuth } from "@typespec/http";

export const securityDefinitionDescriptionRule = createRule({
  name: "security-definition-description",
  description:
    "Security schemes that emit OpenAPI security definitions must provide a description.",
  severity: "warning",
  messages: {
    default: "Security definition should have a description.",
  },
  create(context) {
    const reported = new Set<HttpAuth["model"]>();

    const checkAuthentication = (
      target: Namespace | Interface | Operation,
      authentication: Authentication | undefined,
    ) => {
      if (authentication === undefined) {
        return;
      }

      for (const option of authentication.options) {
        for (const auth of option.schemes) {
          if (reported.has(auth.model) || !emitsSecurityDefinition(auth)) {
            continue;
          }

          if (auth.description !== undefined) {
            continue;
          }

          reported.add(auth.model);
          context.reportDiagnostic({ target });
        }
      }
    };

    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        const seenInterfaces = new Set<Interface>();

        for (const service of services) {
          checkAuthentication(
            service.namespace,
            getAuthentication(program, service.namespace),
          );

          for (const httpOperation of service.operations) {
            const iface = httpOperation.operation.interface;
            if (iface !== undefined && !seenInterfaces.has(iface)) {
              seenInterfaces.add(iface);
              checkAuthentication(iface, getAuthentication(program, iface));
            }

            checkAuthentication(
              httpOperation.operation,
              getAuthentication(program, httpOperation.operation),
            );
          }
        }
      },
    };
  },
});

function emitsSecurityDefinition(auth: HttpAuth): boolean {
  switch (auth.type) {
    case "http":
      return auth.scheme.toLowerCase() === "basic";
    case "apiKey":
      return auth.in !== "cookie";
    case "oauth2":
      return auth.flows.length > 0;
    default:
      return false;
  }
}
