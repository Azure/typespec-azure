// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { buildPackageFile, updatePackageFile } from "../../src/metadata/build-package-file.js";
import {
  buildTsSrcBrowserConfig,
  buildTsSrcCjsConfig,
  buildTsSrcEsmConfig,
  buildTsSrcReactNativeConfig,
} from "../../src/metadata/build-ts-config.js";
import { buildWarpConfig } from "../../src/metadata/build-warp-config.js";
import { buildClientContext } from "../../src/modular/build-client-context.js";
import { transformModularEmitterOptions } from "../../src/modular/build-modular-options.js";
import { buildOperationFiles } from "../../src/modular/build-operations.js";
import { getModuleExports } from "../../src/modular/build-project-files.js";
import { buildSubpathIndexFile } from "../../src/modular/build-subpath-index.js";
import { buildApiOptions } from "../../src/modular/emit-models-options.js";
import { transformClientOptions } from "../../src/transform/transform-client-options.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import { createMockModel } from "../../test-next/unit/metadata/mock-helper.js";
import {
  clearCompileCache,
  compileTypeSpecFor,
  createDpgContextTestHelper,
} from "../util/test-util.js";

const imports = `
  import "@typespec/http";
  import "@azure-tools/typespec-client-generator-core";
  using TypeSpec.Http;
  using Azure.ClientGenerator.Core;
`;

const widgets = `
  @operationGroup namespace Management {
    @operationGroup interface Widgets {
      @get @route("/widgets") list(): void;
    }
  }
`;
const gadgets = `
  @operationGroup interface Gadgets {
    @get @route("/gadgets") list(): void;
  }
`;

const scenarios = [
  {
    name: "multiple clients across services",
    code: `
      @service @client({name: "FirstClient", service: First})
      namespace First { ${widgets} }
      @service @client({name: "SecondClient", service: Second})
      namespace Second { ${gadgets} }
    `,
    paths: [
      "first",
      "first/api",
      "second",
      "second/api",
      "first/api/management/widgets",
      "second/api/gadgets",
    ],
  },
  {
    name: "multiple services merged into one client",
    code: `
      @service namespace First { ${widgets.replaceAll("@operationGroup", "")} }
      @service namespace Second { ${gadgets.replaceAll("@operationGroup", "")} }
      @client({name: "CombinedClient", service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `,
    paths: ["api", "api/management/widgets", "api/gadgets"],
  },
  {
    name: "multiple clients within one service",
    code: `
      @service namespace Service {
        @client({name: "FirstClient", service: Service})
        namespace First { ${widgets} }
        @client({name: "SecondClient", service: Service})
        namespace Second { ${gadgets} }
      }
    `,
    paths: [
      "first",
      "first/api",
      "second",
      "second/api",
      "first/api/management/widgets",
      "second/api/gadgets",
    ],
  },
];

describe("API subpath exports", () => {
  afterEach(() => {
    clearCompileCache();
    clearContexts();
  });

  describe.each(scenarios)("$name", ({ code, paths }) => {
    it.each(["src", "src/generated"])("exports API entry points under %s", async (sourceRoot) => {
      const { program } = await compileTypeSpecFor(imports + code);
      expect(program.diagnostics).toEqual([]);
      const context = await createDpgContextTestHelper(program);
      expect(context.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual(
        [],
      );
      context.generationPathDetail = {
        rootDir: "/package",
        metadataDir: "/package",
        sourcesDir: `/package/${sourceRoot}`,
      };
      context.emitterOptions = transformClientOptions({ "hierarchy-client": true }, context);
      const options = transformModularEmitterOptions(context, `/package/${sourceRoot}`);
      for (const client of getClientHierarchyMap(context)) {
        buildApiOptions(context, client, options);
        buildOperationFiles(context, client, options);
        buildClientContext(context, client, options);
        buildSubpathIndexFile(options, "api", client, { recursive: true });
      }

      const expected = Object.fromEntries([
        [".", `./${sourceRoot}/index.ts`],
        ...paths.map((path) => [`./${path}`, `./${sourceRoot}/${path}/index.ts`]),
      ]);
      const exports = getModuleExports(context, options);
      expect(exports).toEqual(expected);
      const project = useContext("outputProject");
      for (const path of paths.filter((path) => path.includes("api"))) {
        expect(project.getSourceFile(`/package/${sourceRoot}/${path}/index.ts`)).toBeDefined();
      }

      const model = createMockModel({ generateReactNativeTarget: true });
      expect(parse(buildWarpConfig(model, { exports }).content).exports).toEqual({
        "./package.json": "./package.json",
        ...expected,
      });
      const packageExports = JSON.parse(buildPackageFile(model, { exports })!.content).exports;
      const updatedExports = JSON.parse(
        updatePackageFile(
          model,
          { name: "@azure/test", exports: { "./stale": "./stale.js" } },
          { exports },
        )!.content,
      ).exports;
      expect(updatedExports).toEqual(packageExports);
      expect(Object.keys(packageExports).sort()).toEqual(
        ["./package.json", ...Object.keys(expected)].sort(),
      );
      for (const path of paths.filter((path) => path.includes("api"))) {
        const relativePath = `${sourceRoot}/${path}/index`.replace(/^src\//, "");
        for (const [condition, target] of [
          ["import", "esm"],
          ["require", "commonjs"],
          ["browser", "browser"],
          ["react-native", "react-native"],
        ] as const) {
          expect(packageExports[`./${path}`][condition]).toEqual({
            types: `./dist/${target}/${relativePath}.d.ts`,
            default: `./dist/${target}/${relativePath}.js`,
          });
        }
      }
      for (const buildConfig of [
        buildTsSrcEsmConfig,
        buildTsSrcCjsConfig,
        buildTsSrcBrowserConfig,
        buildTsSrcReactNativeConfig,
      ]) {
        expect(JSON.parse(buildConfig(exports).content).include.sort()).toEqual(
          [
            ...new Set([
              "../src/index.ts",
              ...Object.values(expected).map((path) => path.replace(/^\.\//, "../")),
            ]),
          ].sort(),
        );
      }
    });
  });
});
