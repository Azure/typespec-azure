import { expectDiagnostics } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { Tester } from "./tester.js";

describe("basetypes-experimental diagnostic", () => {
  it("emits warning when @azureBaseType is applied to a model", async () => {
    const diagnostics = await Tester.diagnose(`
      using Azure.ResourceManager.BaseTypes;
      @armProviderNamespace namespace MyService;

      model MyAgentProperties {
        displayName: string;
        description: string;
      }

      @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
      model MyAgent is TrackedResource<MyAgentProperties> {
        @key("myAgentName") @segment("myAgents") name: string;
      }
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-resource-manager/basetypes-experimental",
      message:
        "Azure Resource Manager BaseTypes are experimental and may be subject to breaking changes.",
    });
  });

  it("does not emit warning when no base type is used", async () => {
    const diagnostics = await Tester.diagnose(`
      using Azure.ResourceManager.BaseTypes;
      @armProviderNamespace namespace MyService;

      model MyProperties {
        displayName: string;
      }

      model MyResource is TrackedResource<MyProperties> {
        @key("myResourceName") @segment("myResources") name: string;
      }
    `);
    const baseTypeDiags = diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-azure-resource-manager/basetypes-experimental",
    );
    expect(baseTypeDiags).toHaveLength(0);
  });
});
