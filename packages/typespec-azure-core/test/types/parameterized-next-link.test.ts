import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { expect, it } from "vitest";
import { getParameterizedNextLinkArguments } from "../../src/decorators/private/parameterized-next-link-config.js";
import { Tester } from "../test-host.js";

it("single parameter", async () => {
  const { includePending, nextLink, program } = await Tester.compile(t.code`
    model ListCertificateOptions {
      ${t.modelProperty("includePending")}: string;
    }
    model Certificate {}
    model Page {
      @pageItems items: Certificate[];
      @nextLink ${t.modelProperty("nextLink")}: Azure.Core.Legacy.parameterizedNextLink<[ListCertificateOptions.includePending]>;
    }
`);
  strictEqual(nextLink.type.kind, "Scalar");
  const templateArgs = getParameterizedNextLinkArguments(program, nextLink.type);
  strictEqual(templateArgs?.length, 1);
  strictEqual(templateArgs[0], includePending);
});

it("multiple parameter", async () => {
  const { includePending, includeExpired, nextLink, program } = await Tester.compile(t.code`
    model ListCertificateOptions {
      ${t.modelProperty("includePending")}?: string;
      ${t.modelProperty("includeExpired")}?: string;
    }
    model Certificate {}
    model Page {
      @pageItems items: Certificate[];
      @nextLink ${t.modelProperty("nextLink")}: Azure.Core.Legacy.parameterizedNextLink<[
        ListCertificateOptions.includePending,
        ListCertificateOptions.includeExpired
      ]>;
    }
`);
  strictEqual(nextLink.type.kind, "Scalar");
  const templateArgs = getParameterizedNextLinkArguments(program, nextLink.type);
  strictEqual(templateArgs?.length, 2);
  strictEqual(templateArgs[0], includePending);
  strictEqual(templateArgs[1], includeExpired);
});

it("emit diagnostic if used with no parameter", async () => {
  const diagnostics = await Tester.diagnose(`
    model Certificate {}
    model Page {
      @pageItems items: Certificate[];
      @nextLink nextLink: Azure.Core.Legacy.parameterizedNextLink;
    }
`);
  expectDiagnostics(diagnostics, {
    code: "invalid-template-args",
    message: "Template argument 'ParameterizedParams' is required and not specified.",
  });
});

it("call getParameterizedNextLinkArguments on unrelated type", async () => {
  const { includePending, program } = await Tester.compile(t.code`
    model ListCertificateOptions {
      ${t.modelProperty("includePending")}?: string;
  }
`);
  strictEqual(includePending.type.kind, "Scalar");
  expect(getParameterizedNextLinkArguments(program, includePending.type)).toBeUndefined();
});
