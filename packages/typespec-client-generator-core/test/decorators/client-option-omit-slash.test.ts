import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";

describe("@clientOption omitSlashFromEmptyRoute", () => {
  it("operation with empty route has path '/' by default", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      @put
      op createBlob(): void;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.operation.path, "/");
  });

  it("operation with @clientOption('omitSlashFromEmptyRoute', true) has empty path", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      @put
      op createBlob(): void;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.operation.path, "");
  });

  it("interface with @clientOption('omitSlashFromEmptyRoute', true) applies to operations", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      interface BlobOperations {
        @put
        createBlob(): void;
      }
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Interface creates a child client
    const mainClient = sdkPackage.clients[0];
    const childClient = mainClient.children?.[0];
    const createBlobMethod = childClient?.methods.find((m) => m.name === "createBlob");

    strictEqual(createBlobMethod?.kind, "basic");
    strictEqual(createBlobMethod?.operation.path, "");
  });

  it("does not affect operations with non-empty routes", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      @route("{blobName}")
      @get
      op getBlob(@path blobName: string): void;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    const getBlobMethod = sdkPackage.clients[0].methods.find((m) => m.name === "getBlob");

    // Non-empty route stays unchanged
    strictEqual(getBlobMethod?.kind, "basic");
    strictEqual(getBlobMethod?.operation.path, "/{blobName}");
  });

  it("works with language scope", async () => {
    const mainCode = `
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      @clientOption("omitSlashFromEmptyRoute", true, "python")
      @put
      op createBlob(): void;
    `;

    // Test with Python scope - should have empty path
    const { program: pythonProgram } = await SimpleTesterWithService.compile(mainCode);
    const pythonContext = await createSdkContextForTester(pythonProgram, {
      emitterName: "@azure-tools/typespec-python",
    });
    const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
    strictEqual(pythonMethod?.kind, "basic");
    strictEqual(pythonMethod?.operation.path, "");

    // Test with C# scope - should have "/" path (option not applied)
    const { program: csharpProgram } = await SimpleTesterWithService.compile(mainCode);
    const csharpContext = await createSdkContextForTester(csharpProgram, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpMethod = csharpContext.sdkPackage.clients[0].methods[0];
    strictEqual(csharpMethod?.kind, "basic");
    strictEqual(csharpMethod?.operation.path, "/");
  });

  it("namespace with @clientOption('omitSlashFromEmptyRoute', true) applies to nested operations", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      namespace BlobService {
        @put
        op createBlob(): void;
      }
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Namespace creates a child client
    const mainClient = sdkPackage.clients[0];
    const childClient = mainClient.children?.[0];
    const createBlobMethod = childClient?.methods.find((m) => m.name === "createBlob");

    strictEqual(createBlobMethod?.kind, "basic");
    strictEqual(createBlobMethod?.operation.path, "");
  });

  it("operation-level false overrides namespace-level true", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      namespace BlobService {
        #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
        #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
        @clientOption("omitSlashFromEmptyRoute", false)
        @put
        op createBlob(): void;
      }
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Namespace creates a child client
    const mainClient = sdkPackage.clients[0];
    const childClient = mainClient.children?.[0];
    const createBlobMethod = childClient?.methods.find((m) => m.name === "createBlob");

    // Operation-level false should override namespace-level true
    strictEqual(createBlobMethod?.kind, "basic");
    strictEqual(createBlobMethod?.operation.path, "/");
  });

  it("operation-level false overrides interface-level true", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
      @clientOption("omitSlashFromEmptyRoute", true)
      interface BlobOperations {
        #suppress "@azure-tools/typespec-client-generator-core/client-option" "testing"
        #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "testing"
        @clientOption("omitSlashFromEmptyRoute", false)
        @put
        createBlob(): void;
      }
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Interface creates a child client
    const mainClient = sdkPackage.clients[0];
    const childClient = mainClient.children?.[0];
    const createBlobMethod = childClient?.methods.find((m) => m.name === "createBlob");

    // Operation-level false should override interface-level true
    strictEqual(createBlobMethod?.kind, "basic");
    strictEqual(createBlobMethod?.operation.path, "/");
  });
});
