import { getNamespaceFullName } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import {
  getArmResource,
  getArmResourceOperationData,
  isProviderOperation,
  isResourceOperation,
} from "../../src/index.js";
import { Tester } from "../tester.js";

const compilerOptions = {
  linterRuleSet: {
    enable: {
      "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation": true,
    },
  },
};

it("registers every resource operation in the private-links sample", async () => {
  const source = await readFile(
    resolve(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "samples",
      "specs",
      "resource-manager",
      "resource-common-properties",
      "private-links",
      "main.tsp",
    ),
    "utf8",
  );
  const { program } = await Tester.files({ "sample.tsp": source })
    .import("./sample.tsp")
    .compile("", { compilerOptions });
  const provider = program
    .getGlobalNamespaceType()
    .namespaces.get("Microsoft")!
    .namespaces.get("PrivateLinkTest")!;
  expect(getArmResource(program, provider.models.get("PrivateEndpoint")!)).toMatchObject({
    keyName: "privateEndpointConnectionName",
    collectionName: "privateEndpointConnections",
  });
  for (const iface of provider.interfaces.values()) {
    for (const operation of iface.operations.values()) {
      expect(
        isProviderOperation(program, operation) || isResourceOperation(program, operation),
        `${getNamespaceFullName(provider)}.${iface.name}.${operation.name}`,
      ).toBe(true);
    }
  }
});

it.each([
  {
    name: "private endpoint connections",
    model: "PrivateEndpointConnectionResource",
    keyName: "privateEndpointConnectionName",
    collectionName: "privateEndpointConnections",
    templates: "PrivateEndpoints<BuiltIn>",
    operations: `
      read is Templates.Read<Widget>;
      list is Templates.ListByParent<Widget>;
      create is Templates.CreateOrReplaceSync<Widget>;
      update is Templates.CustomPatchSync<Widget>;
      delete is Templates.DeleteAsync<Widget>;
    `,
  },
  {
    name: "private link resources",
    model: "PrivateLink",
    keyName: "privateLinkResourceName",
    collectionName: "privateLinkResources",
    templates: "PrivateLinks<BuiltIn>",
    operations: `
      read is Templates.Read<Widget>;
      list is Templates.ListByParent<Widget>;
    `,
  },
  {
    name: "network security perimeter configurations",
    model: "NspConfiguration",
    keyName: "networkSecurityPerimeterConfigurationName",
    collectionName: "networkSecurityPerimeterConfigurations",
    templates: "NspConfigurations<BuiltIn>",
    operations: `
      read is Templates.Read<Widget>;
      list is Templates.ListByParent<Widget>;
      reconcile is Templates.Action<Widget, void, void>;
    `,
  },
])("registers built-in $name through their standard templates", async (scenario) => {
  const { program, BuiltIn, BuiltInOperations } = await Tester.compile(
    t.code`
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Test;
      enum Versions {
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        v2025: "2025-01-01";
      }
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      model ${t.model("BuiltIn")} is ${scenario.model};
      alias Templates = ${scenario.templates};
      @armResourceOperations(BuiltIn)
      interface ${t.interface("BuiltInOperations")} {
        ${scenario.operations}
      }
    `,
    { compilerOptions },
  );
  expect(getArmResource(program, BuiltIn)).toMatchObject({
    keyName: scenario.keyName,
    collectionName: scenario.collectionName,
  });
  for (const operation of BuiltInOperations.operations.values()) {
    expect(getArmResourceOperationData(program, operation)).toBeDefined();
    expect(isResourceOperation(program, operation)).toBe(true);
    expect(isProviderOperation(program, operation)).toBe(false);
  }
});
