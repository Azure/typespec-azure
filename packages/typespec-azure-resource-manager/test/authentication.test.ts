import { t } from "@typespec/compiler/testing";
import { getAuthentication } from "@typespec/http";
import { deepStrictEqual, strictEqual } from "assert";
import { it } from "vitest";
import { Tester } from "./tester.js";

it("@armProviderNamespace injects the canonical absolute ARM scope as the only scope", async () => {
  const { program, Test } = await Tester.compile(t.code`
    @armProviderNamespace
    namespace Microsoft.${t.namespace("Test")} {}
  `);

  const auth = getAuthentication(program, Test);
  strictEqual(auth?.options.length, 1);
  const option = auth!.options[0];
  strictEqual(option.schemes.length, 1);
  const scheme = option.schemes[0];
  strictEqual(scheme.type, "oauth2");
  if (scheme.type !== "oauth2") return;
  strictEqual(scheme.id, "azure_auth");
  strictEqual(scheme.flows.length, 1);
  const flow = scheme.flows[0];
  strictEqual(flow.type, "implicit");
  deepStrictEqual(flow.scopes, [
    {
      value: "https://management.azure.com/.default",
      description: "impersonate your user account",
    },
  ]);
});
