import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NativeProjectResult } from "./native-coverage.js";

const specsRepo = process.env.NATIVE_COVERAGE_SPECS_REPO;
const rule = "@azure-tools/typespec-azure-core/no-boolean";
const prelude = `
  import "@typespec/http";
  import "@typespec/versioning";
  import "@azure-tools/typespec-autorest";
  import "@azure-tools/typespec-azure-core";
  import "@azure-tools/typespec-azure-resource-manager";
  using TypeSpec.Http;
  using TypeSpec.Versioning;
`;

describe.skipIf(!specsRepo)(
  "native coverage against injected official packages",
  { timeout: 120_000 },
  () => {
    let root: string;
    let next = 0;
    beforeAll(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "native-coverage-controls-"));
      fs.symlinkSync(
        path.join(specsRepo!, "node_modules"),
        path.join(root, "node_modules"),
        "junction",
      );
    });
    afterAll(() => {
      fs.unlinkSync(path.join(root, "node_modules"));
      fs.rmSync(root, { recursive: true, force: true });
    });

    function evaluate(
      source: string,
      overrides: Record<string, unknown> = {},
      configuration?: { config: string; ruleset?: string },
    ) {
      const directory = path.join(root, String(next++));
      fs.mkdirSync(directory);
      fs.writeFileSync(path.join(directory, "main.tsp"), prelude + source);
      fs.writeFileSync(
        path.join(directory, "tspconfig.yaml"),
        configuration?.config ??
          `
linter:
  disable:
    "${rule}": "Control: only the comparison may enable this rule."
`,
      );
      if (configuration?.ruleset) {
        fs.writeFileSync(path.join(directory, "rules.yaml"), configuration.ruleset);
      }
      const input = path.join(directory, "input.json");
      const output = path.join(directory, "output.json");
      fs.writeFileSync(
        input,
        JSON.stringify({
          specsRepo,
          project: { sourcePath: directory, apiVersion: "2026-01-01" },
          validatorRule: "EnumInsteadOfBoolean",
          tspRules: [rule],
          scope: "source",
          ...overrides,
        }),
      );
      const child = spawnSync(
        process.execPath,
        [path.join(import.meta.dirname, "native-coverage-worker.mjs"), input, output],
        { encoding: "utf8", timeout: 120_000 },
      );
      if (child.error) throw child.error;
      if (!fs.existsSync(output)) throw new Error(`Worker produced no receipt: ${child.stderr}`);
      const receipt: NativeProjectResult = JSON.parse(fs.readFileSync(output, "utf8"));
      return receipt;
    }

    it("loads the official package and explicitly activates a disabled target", () => {
      const result = evaluate("model Widget { enabled: boolean; }");
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.defaultTargetDiagnostics).toEqual([]);
      expect(result.packages).toContainEqual(
        expect.objectContaining({
          name: "@azure-tools/typespec-azure-core",
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });

    it("does not report compliant nonboolean properties", () => {
      const result = evaluate('model Widget { mode: "enabled" | "disabled"; }');
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toEqual([]);
    });

    it.each(["configured", "target-only"])(
      "loads an explicit native package without claiming lint findings in %s mode",
      (nativeMode) => {
        const result = evaluate("model Widget { enabled: boolean; }", {
          tspRules: [],
          nativePackage: "@azure-tools/typespec-azure-core",
          nativeMode,
        });
        expect(result.status).toBe("success");
        expect(result.assessmentMode).toBe("package-evidence");
        expect(result.nativePackage).toBe("@azure-tools/typespec-azure-core");
        expect(result.rawDiagnostics).toEqual([]);
        expect(result.packages).toContainEqual(
          expect.objectContaining({
            name: "@azure-tools/typespec-azure-core",
            sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        );
      },
    );

    it("rejects an implicit empty target rather than manufacturing native compliance", () => {
      const result = evaluate("model Widget {}", { tspRules: [] });
      expect(result.status).toBe("failed");
      expect(result.error).toMatch(/No native lint/);
    });
    it("runs only the target and leaves default activation explicitly unassessed", () => {
      const result = evaluate("model Widget { enabled: boolean; }", { nativeMode: "target-only" });
      expect(result.error).toBeUndefined();
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.defaultActivation).toBe("not-assessed");
      expect(result.defaultTargetDiagnostics).toBeUndefined();
    });

    it.each(["http-reachable", "boolean-http"])(
      "retains unassessed default activation after %s alignment",
      (scope) => {
        const result = evaluate(
          `
          @service namespace Contoso;
          model Widget { enabled: boolean; }
          @get @route("/widgets") op read(): Widget;
          `,
          { scope, nativeMode: "target-only" },
        );
        expect(result.status).toBe("success");
        expect(result.diagnostics).toHaveLength(1);
        expect(result.defaultActivation).toBe("not-assessed");
        expect(result.defaultTargetDiagnostics).toBeUndefined();
      },
    );

    it("retains unassessed default activation when a target-only worker throws", () => {
      const result = evaluate("model Widget {}", {
        nativeMode: "target-only",
        tspRules: ["@azure-tools/typespec-azure-core/not-a-real-rule"],
      });
      expect(result.status).toBe("failed");
      expect(result.error).toContain("does not register");
      expect(result.defaultActivation).toBe("not-assessed");
    });

    it.each(["configured", "target-only"])(
      "preserves inherited short-name options and source suppression in %s mode",
      (nativeMode) => {
        const casing = "@azure-tools/typespec-azure-core/casing-style";
        const result = evaluate(
          `model Widget {
            UpperName: string;
            #suppress "${casing}" "Control: intentional casing."
            lowerName: string;
          }`,
          { nativeMode, tspRules: [casing] },
          {
            config: `linter:\n  extends:\n    - file:./rules.yaml\n  disable:\n    "azure-core/casing-style": "Control: explicit opt-in."\n`,
            ruleset: "enable:\n  azure-core/casing-style:\n    modelProperty: PascalCase\n",
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.rawDiagnostics).toEqual([]);
      },
    );

    it.each([
      ["configured", "get", "fixedGroup", false, 1],
      ["configured", "get", "{resourceGroupName}", false, 0],
      ["target-only", "get", "fixedGroup", false, 1],
      ["target-only", "get", "{resourceGroupName}", false, 0],
      ["target-only", "post", "fixedGroup", false, 0],
      ["target-only", "get", "fixedGroup", true, 0],
    ] as const)(
      "evaluates injected resource-group rule: mode=%s verb=%s segment=%s suppressed=%s",
      (nativeMode, verb, segment, suppressed, count) => {
        const target = "@azure-tools/typespec-azure-resource-manager/resource-group-path-parameter";
        const result = evaluate(
          `
          using Azure.ResourceManager;
          @service @armProviderNamespace namespace Microsoft.Coverage;
          ${suppressed ? `#suppress "${target}" "Control: intentional path."` : ""}
          @${verb} @route("/resourceGroups/${segment}/providers/Microsoft.Coverage/widgets")
          op read(${segment.startsWith("{") ? "@path resourceGroupName: string" : ""}): void;
          `,
          { nativeMode, validatorRule: "PathContainsResourceGroup", tspRules: [target] },
          { config: `linter:\n  disable:\n    "${target}": "Control: explicit opt-in."\n` },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe("success");
        expect(result.rawDiagnostics).toHaveLength(count);
        if (nativeMode === "configured") expect(result.defaultTargetDiagnostics).toEqual([]);
        else expect(result.defaultActivation).toBe("not-assessed");
      },
    );

    it("resolves the import-only official Resource Manager rulesets package", () => {
      const result = evaluate(
        "model Widget { enabled: boolean; }",
        {},
        {
          config:
            "linter:\n  extends:\n    - '@azure-tools/typespec-azure-rulesets/resource-manager'\n",
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
    });

    it("preserves directly configured options instead of replacing them with defaults", () => {
      const casingRule = "@azure-tools/typespec-azure-core/casing-style";
      const result = evaluate(
        "model Widget { UpperName: string; }",
        { tspRules: [casingRule] },
        { config: `linter:\n  enable:\n    "${casingRule}":\n      modelProperty: PascalCase\n` },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toEqual([]);
    });

    it("preserves inherited options when explicitly activating a disabled target", () => {
      const casingRule = "@azure-tools/typespec-azure-core/casing-style";
      const result = evaluate(
        "model Widget { UpperName: string; }",
        { tspRules: [casingRule] },
        {
          config: `linter:\n  extends:\n    - file:./rules.yaml\n  disable:\n    "${casingRule}": "Control: explicit opt-in."\n`,
          ruleset: `enable:\n  "${casingRule}":\n    modelProperty: PascalCase\n`,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toEqual([]);
    });

    it("retains authored source suppressions", () => {
      const result = evaluate(`
      model Widget {
        #suppress "${rule}" "Control: intentional boolean."
        enabled: boolean;
      }
    `);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toEqual([]);
    });

    it("fails explicitly when the injected library does not register the target", () => {
      const result = evaluate("model Widget {}", {
        tspRules: ["@azure-tools/typespec-azure-core/not-a-real-rule"],
      });
      expect(result.status).toBe("failed");
      expect(result.error).toContain("does not register");
      expect(result.packages.length).toBeGreaterThan(0);
    });

    it("rejects an unknown upstream rule instead of interpreting it as zero findings", () => {
      const result = evaluate("model Widget {}", { validatorRule: "NotARealValidatorRule" });
      expect(result.status).toBe("failed");
      expect(result.error).toContain("Unknown production ARM validator rule");
    });

    it.each(["2025-01-01", "2026-01-01"])(
      "aligns boolean targets to the selected version %s and retains raw findings",
      (apiVersion) => {
        const result = evaluate(
          `
        @service
        @versioned(Versions)
        namespace Contoso;
        enum Versions { old: "2025-01-01", current: "2026-01-01" }
        model Widget {
          enabled: boolean;
          @removed(Versions.current) removed: boolean;
          @typeChangedFrom(Versions.current, string) changed: boolean;
        }
        @get @route("/widgets") op read(): Widget;
      `,
          {
            project: { sourcePath: path.join(root, String(next)), apiVersion },
            scope: "boolean-http",
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe("success");
        expect(result.rawDiagnostics).toHaveLength(3);
        expect(result.diagnostics).toHaveLength(2);
      },
    );

    it.each([false, true])(
      "respects omit-unreachable-types=%s for service namespace schemas",
      (omit) => {
        const result = evaluate(
          `
        @service namespace Contoso {
          model Unused { enabled: boolean; }
          @get @route("/status") op read(): string;
        }
        namespace Outside { model Unused { other: boolean; } }
      `,
          { scope: "boolean-http" },
          {
            config: `options:\n  "@azure-tools/typespec-autorest":\n    omit-unreachable-types: ${omit}\nlinter:\n  disable:\n    "${rule}": "Control: explicit opt-in."\n`,
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.rawDiagnostics).toHaveLength(2);
        expect(result.diagnostics).toHaveLength(omit ? 0 : 1);
      },
    );

    it("includes emitted derived models reachable only through their base model", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        @discriminator("kind")
        model Pet { kind: string; }
        model Cat extends Pet { kind: "cat"; enabled: boolean; }
        @get @route("/pets") op read(): Pet;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains default-emitted local children of reference-only bases", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        @Autorest.useRef("./common.json#/definitions/Base")
        model Base { name: string; }
        model Child extends Base { enabled: boolean; }
        @get @route("/base") op read(): Base;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains default-emitted named unions with inline boolean properties", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        union Choice { value: { enabled: boolean; }, absent: null }
        @get @route("/status") op read(): string;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("excludes reference-only derived graphs when unreachable schemas are omitted", () => {
      const result = evaluate(
        `
        @service namespace Contoso;

        @discriminator("kind")
        model ChildReferenceBase { kind: string; }
        @Autorest.useRef("./common.json#/definitions/ChildReference")
        model ChildReference extends ChildReferenceBase {
          kind: "child";
          enabled: boolean;
        }
        @get @route("/child-reference") op readChildReference(): ChildReferenceBase;

        @Autorest.useRef("./common.json#/definitions/BaseReference")
        @discriminator("kind")
        model BaseReference { kind: string; }
        model BaseReferenceChild extends BaseReference {
          kind: "child";
          enabled: boolean;
        }
        @get @route("/base-reference") op readBaseReference(): BaseReference;
      `,
        { scope: "boolean-http" },
        {
          config:
            'options:\n  "@azure-tools/typespec-autorest":\n    omit-unreachable-types: true\n',
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(2);
      expect(result.diagnostics).toEqual([]);
    });

    it("excludes direct reference-only model contents", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        @Autorest.useRef("./common.json#/definitions/ExternalWidget")
        model ExternalWidget { enabled: boolean; }
        @get @route("/widget") op read(): ExternalWidget;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toEqual([]);
    });

    it("retains locally emitted visibility transformations of referenced models", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        @Autorest.useRef("./common.json#/definitions/ExternalWidget")
        model ExternalWidget {
          enabled: boolean;
          @visibility(Lifecycle.Read, Lifecycle.Delete) readAndDeleteOnly: string;
        }
        @patch @route("/widget") op update(@body body: ExternalWidget): void;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it.each(["boolean-http", "http-reachable"])(
      "excludes nonpayload properties from %s while retaining raw findings",
      (scope) => {
        const result = evaluate(
          `
          @service namespace Contoso;
          model Widget {
            @visibility(Lifecycle.Delete) deleteOnly: boolean;
            @bodyIgnore ignored: boolean;
            value: string;
          }
          @get @route("/widget") op read(): Widget;
        `,
          { scope },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe("success");
        expect(result.rawDiagnostics).toHaveLength(2);
        expect(result.diagnostics).toEqual([]);
      },
    );

    it.each([false, true])(
      "aligns referenced query parameters with omit-unreachable-types=%s",
      (omit) => {
        const result = evaluate(
          `
        @service namespace Contoso;
        model Query {
          @Autorest.useRef("./common.json#/parameters/Flag")
          @query flag: boolean;
        }
        @get @route("/widget") op read(...Query): string;
      `,
          { scope: "boolean-http" },
          {
            config: `options:\n  "@azure-tools/typespec-autorest":\n    omit-unreachable-types: ${omit}\n`,
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe("success");
        expect(result.rawDiagnostics).toHaveLength(2);
        expect(result.diagnostics).toHaveLength(omit ? 0 : 2);
      },
    );

    it("retains ordinary parameters, response headers and shared read schemas", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        model Widget {
          @header flag: boolean;
          @visibility(Lifecycle.Create) createOnly: boolean;
        }
        @get @route("/widget") op read(@query enabled: boolean): Widget;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(3);
      expect(result.diagnostics).toHaveLength(3);
    });

    it("retains metadata-annotated properties inside an explicit inline body", () => {
      const result = evaluate(
        `
        @service namespace Contoso;
        @post @route("/widget")
        op write(@body body: { @header flag: boolean }): void;
      `,
        { scope: "boolean-http" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains reachable union-variant diagnostic targets", () => {
      const offsetRule = "@azure-tools/typespec-azure-core/no-offsetdatetime";
      const result = evaluate(
        `
        @service namespace Contoso;
        union Timestamp { utc: utcDateTime, offset: offsetDateTime }
        @get @route("/timestamp") op read(): Timestamp;
      `,
        { tspRules: [offsetRule], scope: "http-reachable" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains a reachable operation's owning interface target", () => {
      const casingRule = "@azure-tools/typespec-azure-core/casing-style";
      const result = evaluate(
        `
        @service namespace Contoso;
        interface storeFront {
          @get @route("/widgets") read(): string;
        }
      `,
        { tspRules: [casingRule], scope: "http-reachable" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains reachable enum-member diagnostic targets", () => {
      const docsRule = "@azure-tools/typespec-azure-core/documentation-required";
      const result = evaluate(
        `
        @service namespace Contoso;
        @doc("Available modes.")
        enum Mode {
          @doc("The ready mode.")
          ready,
          missing,
        }
        @doc("Read the current mode.")
        @get @route("/mode") op read(): Mode;
      `,
        { tspRules: [docsRule], scope: "http-reachable" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });

    it("retains the selected service namespace diagnostic target", () => {
      const authRule = "@azure-tools/typespec-azure-core/auth-required";
      const result = evaluate(
        `
        @service namespace Contoso;
        @get @route("/widgets") op read(): string;
      `,
        { tspRules: [authRule], scope: "http-reachable" },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics).toHaveLength(1);
      expect(result.diagnostics).toHaveLength(1);
    });
  },
);
