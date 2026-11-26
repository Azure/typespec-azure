import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { resourcePathValidationRule } from "../../src/rules/resource-path-validation.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/resource-path-validation";

function diagnostic(message: string) {
  return { code, severity: "warning" as const, message };
}

function service(contents: string, providerNamespace = "Microsoft.Contoso") {
  return `
    @armProviderNamespace("${providerNamespace}")
    namespace Microsoft.Contoso {
      ${contents}
    }
  `;
}

function operation(path: string, verb: string, name = "test"): string {
  const parameters = [...path.matchAll(/\{(\w+)\}/g)].map((match) => `@path ${match[1]}: string`);
  return `@route("${path}") @${verb} op ${name}(${parameters.join(", ")}): void;`;
}

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    resourcePathValidationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it.each(["get", "put", "patch", "delete"])("requires a resource type on %s paths", async (verb) => {
  await tester
    .expect(service(operation("/providers/Microsoft.Contoso", verb)))
    .toEmitDiagnostics(
      diagnostic(
        "The path for a GET, PUT, PATCH, or DELETE operation must contain a resource type after the provider namespace.",
      ),
    );
  await tester.expect(service(operation("/providers/Microsoft.Contoso/widgets", verb))).toBeValid();
});

it("does not apply the resource-type check to POST-only paths", async () => {
  await tester.expect(service(operation("/providers/Microsoft.Contoso", "post"))).toBeValid();
});

it("reports path-based diagnostics once when HTTP methods share a path", async () => {
  const path = "/providers/Microsoft.Contoso";
  await tester
    .expect(service(`${operation(path, "get", "read")}\n${operation(path, "put", "replace")}`))
    .toEmitDiagnostics(
      diagnostic(
        "The path for a GET, PUT, PATCH, or DELETE operation must contain a resource type after the provider namespace.",
      ),
    );
});

it.each([
  "/providers/Microsoft.Contoso/widgets/{widget}/parts/action",
  "/providers/Microsoft.Contoso/widgets/{widget}/parts/{part}/action/run",
  "/providers/Microsoft.Contoso/widgets/{widget}/{other}",
  "/providers/Microsoft.Contoso/widgets/missing/{part}",
])("rejects an invalid nested-resource path: %s", async (path) => {
  await tester
    .expect(service(operation(path, "get")))
    .toEmitDiagnostics(
      diagnostic("The path for a nested resource must follow the resource type and name pattern."),
    );
});

it("uses the resolved parent relationship for nested resource paths", async () => {
  await tester
    .expect(
      service(`
          model Parent is TrackedResource<{}> {
            ...ResourceNameParameter<Parent>;
          }
          @parentResource(Parent)
          model Child is ProxyResource<{}> {
            ...ResourceNameParameter<Child>;
          }
          @armResourceOperations
          interface Children {
            read is ArmResourceRead<Child>;
          }
        `),
    )
    .toBeValid();
});

it("uses the resolved parent relationship when parent path parameter names differ", async () => {
  await tester
    .expect(
      service(`
        @subscriptionResource
        model Event is ProxyResource<{}> { ...ResourceNameParameter<Event>; }
        @subscriptionResource
        @parentResource(Event)
        model ImpactedResource is ProxyResource<{}> { ...ResourceNameParameter<ImpactedResource>; }
        interface Events {
          @route("/providers/Microsoft.Contoso/events/{eventId}") @get @armResourceRead(Event)
          op tenant(@path eventId: string): Event;
          @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/events/{eventId}")
          @get @armResourceRead(Event)
          op subscription(@path subscriptionId: string, @path eventId: string): Event;
        }
        interface ImpactedResources {
          @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/events/{parentEventName}/impactedResources/{impactedId}")
          @get @armResourceRead(ImpactedResource)
          op get(@path subscriptionId: string, @path parentEventName: string, @path impactedId: string): ImpactedResource;
        }
      `),
    )
    .toBeValid();
});

it("checks provider casing on every path regardless of HTTP method", async () => {
  await tester
    .expect(service(operation("/providers/Microsoft.contoso/widgets", "post"), "Microsoft.contoso"))
    .toEmitDiagnostics({
      code,
      severity: "warning",
      message:
        "Provider namespace 'Microsoft.contoso' in path '/providers/Microsoft.contoso/widgets' must use PascalCase.",
    });
});

it("matches the last provider segment to the ARM service namespace on every path", async () => {
  await tester
    .expect(service(operation("/providers/Microsoft.Other/widgets", "post")))
    .toEmitDiagnostics({
      code,
      severity: "warning",
      message:
        "The last provider namespace 'Microsoft.Other' in path '/providers/Microsoft.Other/widgets' must match the ARM service namespace 'Microsoft.Contoso'.",
    });
});

it("checks provider casing for operations inherited into service interfaces", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.DBforPostgreSQL {
          interface Operations extends Azure.ResourceManager.Legacy.Operations {}
        }
      `,
    )
    .toEmitDiagnostics(
      diagnostic(
        "Provider namespace 'Microsoft.DBforPostgreSQL' in path '/providers/Microsoft.DBforPostgreSQL/operations' must use PascalCase.",
      ),
    );
});

it("requires tracked resource operations to use subscription and resource-group scope", async () => {
  await tester
    .expect(
      service(`
        model Widget is TrackedResource<{}> {
          ...ResourceNameParameter<Widget>;
        }
        @armResourceOperations
        interface Widgets {
          read is ArmResourceRead<
            Widget,
            BaseParameters = Azure.ResourceManager.Foundations.SubscriptionBaseParameters
          >;
        }
      `),
    )
    .toEmitDiagnostics(
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
    );
});

it("accepts a tracked resource path at resource-group scope", async () => {
  await tester
    .expect(
      service(`
        model Widget is TrackedResource<{}> {
          ...ResourceNameParameter<Widget>;
        }
        @armResourceOperations
        interface Widgets {
          read is ArmResourceRead<Widget>;
        }
      `),
    )
    .toBeValid();
});

it("checks a proxy resource with location using the Swagger heuristic", async () => {
  await tester
    .expect(
      service(`
        model Widget is ProxyResource<{}> {
          location: string;
          ...ResourceNameParameter<Widget>;
        }
        @armResourceOperations
        interface Widgets {
          read is ArmResourceRead<
            Widget,
            BaseParameters = Azure.ResourceManager.Foundations.SubscriptionBaseParameters
          >;
        }
      `),
    )
    .toEmitDiagnostics(
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
    );
});

it("checks GET responses and PUT bodies with inherited or JSON-named location", async () => {
  await tester
    .expect(
      service(`
        model Base { location: string; }
        model Response extends Base {}
        model Request { @encodedName("application/json", "location") region: string; }
        @route("/providers/Microsoft.Contoso/widgets/{name}") @get
        op get(@path name: string): Response;
        @route("/providers/Microsoft.Contoso/gadgets/{name}") @put
        op put(@path name: string, @body body: Request): void;
      `),
    )
    .toEmitDiagnostics([
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
    ]);
});

it("does not treat non-payload or unsuccessful response location as tracked", async () => {
  await tester
    .expect(
      service(`
        model Failure { @statusCode statusCode: 400; location: string; }
        model Success { @statusCode statusCode: 200; name: string; }
        @route("/providers/Microsoft.Contoso/widgets/{name}") @get
        op get(@path name: string): Success | Failure;
        @route("/providers/Microsoft.Contoso/gadgets/{name}") @put
        op put(@path name: string, @header location: string, @body body: { name: string }): void;
        @route("/providers/Microsoft.Contoso/other/{name}") @post
        op action(@path name: string, @body body: { location: string }): { location: string };
      `),
    )
    .toBeValid();
});

it("checks only the first successful GET response, in status-code order", async () => {
  await tester
    .expect(
      service(`
        model First { @statusCode statusCode: 200; name: string; }
        model Later { @statusCode statusCode: 201; location: string; }
        @route("/providers/Microsoft.Contoso/widgets/{name}") @get
        op get(@path name: string): Later | First;
      `),
    )
    .toBeValid();
});

it("reports once when GET and PUT on the same path both have location", async () => {
  await tester
    .expect(
      service(`
        @route("/providers/Microsoft.Contoso/widgets/{name}") @put
        op put(@path name: string, @body body: { location: string }): void;
        @route("/providers/Microsoft.Contoso/widgets/{name}") @get
        op get(@path name: string): { location: string };
      `),
    )
    .toEmitDiagnostics(
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
    );
});

it("checks a location response at an invalid nested resource-group path", async () => {
  await tester
    .expect(
      service(`
        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{name}/parts/action")
        @get
        op get(@path subscriptionId: string, @path resourceGroupName: string, @path name: string): { location: string };
      `),
    )
    .toEmitDiagnostics([
      diagnostic("The path for a nested resource must follow the resource type and name pattern."),
      diagnostic(
        "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
      ),
    ]);
});
