import { OpenAPI2Document } from "@azure-tools/typespec-autorest";
import { HttpVerb } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "./test-host.js";

interface ExpectOperation {
  in: "paths" | "x-ms-paths";
  path: string;
  verb: HttpVerb;
  operationId: string;
  parameters?: string[];
}

function expectOperation(doc: OpenAPI2Document, expect: ExpectOperation) {
  const pathItem = doc[expect.in]?.[expect.path];
  const pathSummary = [
    "paths:",
    ...Object.entries(doc.paths).map(
      ([path, values]) => `  ${path}: [${Object.keys(values).join(", ")}]`
    ),
    "x-ms-paths:",
    ...Object.entries(doc["x-ms-paths"] ?? {}).map(
      ([path, values]) => `  ${[path]}: [${Object.keys(values).join(", ")}]`
    ),
  ].join("\n");
  ok(
    pathItem,
    `Expected path ${expect.path} to exist in ${expect.in}. But path founds are:\n${pathSummary}`
  );
  const operation = pathItem[expect.verb];
  ok(
    operation,
    `Expected path ${expect.path} to have verb ${expect.verb} to exist in ${expect.in}. But path founds are:\n${pathSummary}`
  );

  strictEqual(operation.operationId, expect.operationId);
  if (expect.parameters) {
    const paramNames = operation.parameters.map((x: any) => x.name);
    deepStrictEqual(paramNames, expect.parameters);
  }
}

it("model shared routes that differ by variable query parameters", async () => {
  const results = await openApiFor(
    `
    model Thing {
      id: string;
    }

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByResourceGroup(...Thing, @query resourceGroup: string, @query foo?: string): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listBySubscription(...Thing, @query subscription: string, @query foo?: string): Thing[];
    `
  );
  expectOperation(results, {
    in: "paths",
    path: "/sharedroutes/resources",
    verb: "post",
    operationId: "ListByResourceGroup",
    parameters: ["resourceGroup", "foo", "body"],
  });
  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listBySubscription",
    verb: "post",
    operationId: "ListBySubscription",
    parameters: ["subscription", "foo", "body"],
  });
});

it("model shared routes that differ by values of a specific query parameter", async () => {
  const results = await openApiFor(
    `
    model Thing {
      id: string;
    }

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByResourceGroup(...Thing, @query filter: "resourceGroup"): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listBySubscription(...Thing, @query filter: "subscription"): Thing[];
    `
  );

  expectOperation(results, {
    in: "paths",
    path: "/sharedroutes/resources",
    verb: "post",
    operationId: "ListByResourceGroup",
    parameters: ["filter", "body"],
  });
  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listBySubscription",
    verb: "post",
    operationId: "ListBySubscription",
    parameters: ["filter", "body"],
  });
});

// Leftover test from change in behavior https://github.com/Azure/typespec-azure/issues/3801
it("model shared routes with implicit disambiguation ignore the implicit query params", async () => {
  const results = await openApiFor(
    `
    model Thing {
      id: string;
    }

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByResourceGroup(...Thing, @query apiVersion: string): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listBySubscription(...Thing, @query apiVersion: string): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByNothing(...Thing, @query apiVersion: string): Thing[];
    `
  );

  // The first shared route ends up in paths
  expectOperation(results, {
    in: "paths",
    path: "/sharedroutes/resources",
    verb: "post",
    operationId: "ListByResourceGroup",
  });

  // All subsequent shared routes append the _overload dummy parameter and go in x-ms-paths
  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listBySubscription",
    verb: "post",
    operationId: "ListBySubscription",
  });

  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listByNothing",
    verb: "post",
    operationId: "ListByNothing",
  });
});

it("model shared routes with implicit disambiguation and no queries", async () => {
  const results = await openApiFor(
    `
    model Thing {
      id: string;
    }

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByResourceGroup(...Thing): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listBySubscription(...Thing): Thing[];

    @sharedRoute
    @route("/sharedroutes/resources")
    op listByNothing(...Thing): Thing[];
    `
  );
  // The first shared route ends up in paths
  expectOperation(results, {
    in: "paths",
    path: "/sharedroutes/resources",
    verb: "post",
    operationId: "ListByResourceGroup",
  });

  // All subsequent shared routes append the _overload dummy parameter and go in x-ms-paths
  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listBySubscription",
    verb: "post",
    operationId: "ListBySubscription",
  });

  expectOperation(results, {
    in: "x-ms-paths",
    path: "/sharedroutes/resources?_overload=listByNothing",
    verb: "post",
    operationId: "ListByNothing",
  });
});

it("can share route with @autoRoute", async () => {
  const results = await openApiFor(
    `
    @sharedRoute @autoRoute op one(...One): void;

    @sharedRoute @autoRoute op two(...Two): void;

    @resource("operations")
    model One {
      @key @path
      id: string;
    }

    @resource("operations")
    model Two {
      @key @path
      id: string;
    }
    `
  );
  expectOperation(results, {
    in: "paths",
    path: "/operations/{id}",
    verb: "get",
    operationId: "One",
  });

  expectOperation(results, {
    in: "x-ms-paths",
    path: "/operations/{id}?_overload=two",
    verb: "get",
    operationId: "Two",
  });
});
