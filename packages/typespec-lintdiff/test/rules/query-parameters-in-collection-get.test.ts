import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { createReportedParameterKey } from "../../src/rules/query-parameters-in-collection-get.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

describe("query-parameters-in-collection-get", () => {
  it("deduplicates sibling child namespaces by their ARM provider namespace", async () => {
    const runner = await Tester.createInstance();
    await runner.compile(`
      @Azure.ResourceManager.armProviderNamespace
      namespace Microsoft.Contoso {
        namespace First {}
        namespace Second {}
      }
    `);

    const microsoft = runner.program.getGlobalNamespaceType().namespaces.get("Microsoft")!;
    const provider = microsoft.namespaces.get("Contoso")!;
    const firstChild = provider.namespaces.get("First")!;
    const secondChild = provider.namespaces.get("Second")!;
    const path = "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets";

    const firstChildKey = createReportedParameterKey(
      runner.program,
      firstChild,
      path,
      "continuationToken",
    );
    const secondChildKey = createReportedParameterKey(
      runner.program,
      secondChild,
      path,
      "continuationToken",
    );

    expect(firstChildKey).toBe(secondChildKey);
  });

  it("keeps identical paths from different ARM providers distinct", async () => {
    const runner = await Tester.createInstance();
    await runner.compile(`
      namespace Microsoft {
        @Azure.ResourceManager.armProviderNamespace
        namespace First {}

        @Azure.ResourceManager.armProviderNamespace
        namespace Second {}
      }
    `);

    const microsoft = runner.program.getGlobalNamespaceType().namespaces.get("Microsoft")!;
    const firstProvider = microsoft.namespaces.get("First")!;
    const secondProvider = microsoft.namespaces.get("Second")!;
    const path = "/subscriptions/{subscriptionId}/providers/Microsoft.Shared/widgets";

    const firstProviderKey = createReportedParameterKey(
      runner.program,
      firstProvider,
      path,
      "continuationToken",
    );
    const secondProviderKey = createReportedParameterKey(
      runner.program,
      secondProvider,
      path,
      "continuationToken",
    );

    expect(firstProviderKey).not.toBe(secondProviderKey);
  });
});
