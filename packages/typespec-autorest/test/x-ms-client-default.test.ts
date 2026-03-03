import { expect, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

it("applies x-ms-client-default for property marked with @clientDefault", async () => {
  const res = await compileOpenAPI(
    `
    model Test {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("default-value")
      value: string;
    }
    `,
    { preset: "azure" },
  );
  expect(res.definitions?.Test?.properties?.value?.["x-ms-client-default"]).toEqual(
    "default-value",
  );
});

it("@clientDefaultValue doesn't affect the actual default", async () => {
  const res = await compileOpenAPI(
    `
    model Test {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("client-default")
      value: string = "server-default";
    }
    `,
    { preset: "azure" },
  );
  expect(res.definitions?.Test?.properties?.value).toMatchObject({
    "x-ms-client-default": "client-default",
    default: "server-default",
  });
});
