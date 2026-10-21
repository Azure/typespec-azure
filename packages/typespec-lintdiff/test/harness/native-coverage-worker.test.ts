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

    it("excludes externally referenced derived graphs while retaining raw findings", () => {
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

    it("excludes externally referenced spread query parameters", () => {
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
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe("success");
      expect(result.rawDiagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics).toEqual([]);
    });

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
