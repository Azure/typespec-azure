import { expect, it } from "vitest";
import {
  emitModularClientContextFromTypeSpec,
  emitModularOperationsFromTypeSpec,
} from "../util/emit-util.js";

it("isolates a child API-version override from parent options", async () => {
  const operations = await emitModularOperationsFromTypeSpec(
    `
      @service(#{ title: "Versioned Service" })
      @versioned(Versions)
      @client({ name: "VersionedServiceClient", service: VersionedService })
      namespace VersionedService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/parent")
        op getParent(@query("api-version") @apiVersion apiVersion: Versions = Versions.v2): void;

        @route("/legacy")
        @client({ name: "LegacyOperationsClient", service: VersionedService })
        @Azure.Core.Legacy.overrideApiVersion("opaque-legacy-version")
        interface LegacyOperations {
          getLegacy(@query("api-version") @apiVersion apiVersion: Versions = Versions.v2): void;
        }
      }
    `,
    { needAzureCore: true, needTCGC: true },
  );

  expect(operations).toBeDefined();
  const text = [...operations!].map((file) => file.getFullText()).join("\n");
  expect(text).toContain('"api%2Dversion": "opaque-legacy-version"');
  expect(text).toContain('"api%2Dversion": context.apiVersion ?? "2025-01-01"');
});

it("initializes an optional custom-named API-version context property", async () => {
  const context = await emitModularClientContextFromTypeSpec(
    `
      @service(#{ title: "Versioned Service" })
      @versioned(Versions)
      @client({ name: "VersionedServiceClient", service: VersionedService })
      namespace VersionedService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/parent")
        op getParent(
          @query("api-version") @apiVersion serviceVersion?: Versions
        ): void;

        @Azure.Core.Legacy.overrideApiVersion("opaque-legacy-version")
        namespace Legacy {
          @route("/legacy")
          @client({ name: "LegacyOperationsClient", service: VersionedService })
          interface LegacyOperations {
            getLegacy(
              @query("api-version") @apiVersion apiVersion: Versions = Versions.v2
            ): void;
          }
        }
      }
    `,
    { needAzureCore: true, needTCGC: true },
  );

  const text = context!.getFullText();
  expect(text).toContain("serviceVersion?: string");
  const declaration = "const serviceVersion = options.serviceVersion;";
  expect(text).toContain(declaration);
  expect(text).toMatch(/return\s*\{\s*\.\.\.clientContext,\s*serviceVersion\s*\}/);
  expect(text.indexOf(declaration)).toBeLessThan(text.indexOf("return"));
});

it("preserves enum typing for normal version options", async () => {
  const context = await emitModularClientContextFromTypeSpec(
    `
      @service(#{ title: "Versioned Service" })
      @versioned(Versions)
      namespace VersionedService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/items")
        op getItem(@query("api-version") @apiVersion version: Versions = Versions.v2): void;
      }
    `,
    { needAzureCore: true, needTCGC: true },
  );

  const text = context!.getFullText();
  expect(text).toContain("version?: Versions");
  expect(text).not.toContain("version?: string");
});
