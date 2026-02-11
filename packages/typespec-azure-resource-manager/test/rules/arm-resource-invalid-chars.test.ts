import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourcePathInvalidCharsRule } from "../../src/rules/arm-resource-path-invalid-chars.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourcePathInvalidCharsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("succeed when segment is not using any invalid chars", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<{}> {
          @visibility(Lifecycle.Read)
          @key("foo")
          @segment("foo")
          @path
          name: string;
        }
      `,
    )
    .toBeValid();
});

it("emit warning when using `/` in arm resource segments", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<{}> {
          @visibility(Lifecycle.Read)
          @key("foo")
          @segment("/foo/bar")
          @path
          name: string;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars",
      message: `'/foo/bar' is an invalid path segment. Segments may start with a separator must consist of alphanumeric characters or dashes, starting with a lower case letter.`,
    });
});
