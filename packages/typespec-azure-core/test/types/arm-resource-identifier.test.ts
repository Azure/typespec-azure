import { Tester } from "#test/test-host.js";
import type { Scalar } from "@typespec/compiler";
import { t, type TesterInstance } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, expect, it } from "vitest";
import { getArmResourceIdentifierConfig } from "../../src/decorators/private/arm-resource-identifier-config.js";

let runner: TesterInstance;
beforeEach(async () => {
  runner = await Tester.createInstance();
});

describe("when used as ref", () => {
  async function compileAsRef(ref: string): Promise<Scalar> {
    const { prop } = await runner.compile(t.code`
    model Test {
      ${t.modelProperty("prop")}: ${ref};
    }
  `);

    const type = prop.type;
    strictEqual(type.kind, "Scalar");
    return type;
  }

  it("use without config", async () => {
    const type = await compileAsRef("armResourceIdentifier");
    expect(getArmResourceIdentifierConfig(runner.program, type)).toBeUndefined();
  });

  it("use with single type and no scopes", async () => {
    const type = await compileAsRef(`armResourceIdentifier<[{type:"Microsoft.RP/type"}]>`);
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
        },
      ],
    });
  });

  it("use with single type and scopes", async () => {
    const type = await compileAsRef(
      `armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}]>`,
    );
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
          scopes: ["Tenant", "ResourceGroup"],
        },
      ],
    });
  });

  it("use multiple single type and scopes", async () => {
    const type = await compileAsRef(
      `armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["Tenant", "ResourceGroup"]}]>`,
    );
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
          scopes: ["Tenant", "ResourceGroup"],
        },
        { type: "Microsoft.RP/type2", scopes: ["Tenant", "ResourceGroup"] },
      ],
    });
  });
});

describe("when used as scalar extends", () => {
  async function compileOnScalar(ref: string): Promise<Scalar> {
    const { test } = await runner.compile(t.code`
        scalar ${t.scalar("test")} extends ${ref};
    `);

    return test.baseScalar!;
  }

  it("use without config", async () => {
    const type = await compileOnScalar("armResourceIdentifier");
    expect(getArmResourceIdentifierConfig(runner.program, type)).toBeUndefined();
  });

  it("use with single type and no scopes", async () => {
    const type = await compileOnScalar(`armResourceIdentifier<[{type:"Microsoft.RP/type"}]>`);
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
        },
      ],
    });
  });

  it("use with single type and scopes", async () => {
    const type = await compileOnScalar(
      `armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}]>`,
    );
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
          scopes: ["Tenant", "ResourceGroup"],
        },
      ],
    });
  });

  it("use multiple single type and scopes", async () => {
    const type = await compileOnScalar(
      `armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["Tenant", "ResourceGroup"]}]>`,
    );
    expect(getArmResourceIdentifierConfig(runner.program, type)).toEqual({
      allowedResources: [
        {
          type: "Microsoft.RP/type",
          scopes: ["Tenant", "ResourceGroup"],
        },
        { type: "Microsoft.RP/type2", scopes: ["Tenant", "ResourceGroup"] },
      ],
    });
  });
});
