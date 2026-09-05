import { getServiceForVersion, Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getApiVersionOverride, getEffectiveApiVersionOverride } from "./override-api-version.js";

const decorator = "Azure.Core.Legacy.overrideApiVersion";

it("returns values applied directly to namespaces and interfaces", async () => {
  const { program, Service, Widgets } = await Tester.compile(t.code`
    @${decorator}("namespace-version")
    namespace ${t.namespace("Service")} {
      @${decorator}("interface-version")
      interface ${t.interface("Widgets")} {
        op get(): void;
      }
    }
  `);

  expect(getApiVersionOverride(program, Service)).toBe("namespace-version");
  expect(getApiVersionOverride(program, Widgets)).toBe("interface-version");
});

it("inherits the nearest override through operations, interfaces, and namespaces", async () => {
  const { program, Service, Administration, Leaf, Widgets, Reports } = await Tester.compile(t.code`
    @${decorator}("service-version")
    namespace ${t.namespace("Service")} {
      @${decorator}("administration-version")
      namespace ${t.namespace("Administration")} {
        op list(): void;

        namespace ${t.namespace("Leaf")} {}

        interface ${t.interface("Widgets")} {
          op get(): void;
        }

        @${decorator}("reports-version")
        interface ${t.interface("Reports")} {
          op get(): void;
        }
      }
    }
  `);

  expect(getEffectiveApiVersionOverride(program, Service)).toBe("service-version");
  expect(getEffectiveApiVersionOverride(program, Administration)).toBe("administration-version");
  expect(getEffectiveApiVersionOverride(program, Leaf)).toBe("administration-version");
  expect(getEffectiveApiVersionOverride(program, Administration.operations.get("list")!)).toBe(
    "administration-version",
  );
  expect(getEffectiveApiVersionOverride(program, Widgets)).toBe("administration-version");
  expect(getEffectiveApiVersionOverride(program, Widgets.operations.get("get")!)).toBe(
    "administration-version",
  );
  expect(getEffectiveApiVersionOverride(program, Reports)).toBe("reports-version");
  expect(getEffectiveApiVersionOverride(program, Reports.operations.get("get")!)).toBe(
    "reports-version",
  );
});

it("preserves overrides on projected interfaces", async () => {
  const { program } = await Tester.compile(`
    @service
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      @${decorator}("projected-version")
      @added(Versions.v2)
      interface Widgets {
        op get(): void;
      }
    }
  `);

  const projectedService = getServiceForVersion(program, "v2");
  const widgets = projectedService.interfaces.get("Widgets");

  expect(widgets).toBeDefined();
  expect(getApiVersionOverride(program, widgets!)).toBe("projected-version");
  expect(getEffectiveApiVersionOverride(program, widgets!.operations.get("get")!)).toBe(
    "projected-version",
  );
});

it("returns undefined when no override applies", async () => {
  const { program, Service, Widgets } = await Tester.compile(t.code`
    namespace ${t.namespace("Service")} {
      op list(): void;

      interface ${t.interface("Widgets")} {
        op get(): void;
      }
    }
  `);

  expect(getApiVersionOverride(program, Service)).toBeUndefined();
  expect(getApiVersionOverride(program, Widgets)).toBeUndefined();
  expect(getEffectiveApiVersionOverride(program, Service)).toBeUndefined();
  expect(getEffectiveApiVersionOverride(program, Service.operations.get("list")!)).toBeUndefined();
  expect(getEffectiveApiVersionOverride(program, Widgets)).toBeUndefined();
  expect(getEffectiveApiVersionOverride(program, Widgets.operations.get("get")!)).toBeUndefined();
});

it.each(["", " ", " \t\r\n "])(
  "rejects an empty or whitespace-only API version %j",
  async (version) => {
    const diagnostics = await Tester.diagnose(`
      @${decorator}(${JSON.stringify(version)})
      namespace Service {}
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/invalid-api-version-override",
      message: "The API version override must be a non-empty string.",
    });
  },
);
