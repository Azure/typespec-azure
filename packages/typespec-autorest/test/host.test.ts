import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: host/x-ms-parameterized-host", () => {
  it("set a basic server", async () => {
    const res = await openApiFor(
      `
      @service({title: "My service"})
      @server("https://example.com", "Main server")
      namespace MyService {}
      `
    );
    strictEqual(res.host, "example.com");
    strictEqual(res["x-ms-parameterized-host"], undefined);
    deepStrictEqual(res.schemes, ["https"]);
  });

  it("set a server with base url parameter", async () => {
    const res = await openApiFor(
      `
      @service({title: "My service"})
      @server("{endpoint}/v2", "Regional account endpoint", {endpoint: url})
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "{endpoint}/v2",
      useSchemePrefix: false,
      parameters: [
        {
          in: "path",
          name: "endpoint",
          required: true,
          type: "string",
          format: "uri",
          "x-ms-skip-url-encoding": true,
        },
      ],
    });
  });

  it("set a server with parameters", async () => {
    const res = await openApiFor(
      `
      @service({title: "My service"})
      @server("https://{account}.{region}.example.com", "Regional account endpoint", {region: string, account: string})
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{account}.{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        { in: "path", name: "region", required: true, type: "string" },
        { in: "path", name: "account", required: true, type: "string" },
      ],
    });
  });

  it("set a server with parameters with defaults", async () => {
    const res = await openApiFor(
      `
      @service({title: "My service"})
      @server("https://{account}.{region}.example.com", "Regional account endpoint", {
        region?: string = "westus", 
        account?: string = "default",
      })
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{account}.{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        { in: "path", name: "region", required: false, type: "string", default: "westus" },
        { in: "path", name: "account", required: false, type: "string", default: "default" },
      ],
    });
  });

  it("set a server with parameters with doc", async () => {
    const res = await openApiFor(
      `
      @service({title: "My service"})
      @server("https://{region}.example.com", "Regional account endpoint", {
        @doc("Region name")
        region: string,
      })
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        { in: "path", name: "region", required: true, type: "string", description: "Region name" },
      ],
    });
  });

  it("set a server with enum properties", async () => {
    const res = await openApiFor(
      `
      enum Region { westus, eastus }
      @service({title: "My service"})
      @server("https://{region}.example.com", "Regional account endpoint", {
        region: Region, 
      })
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        {
          in: "path",
          name: "region",
          required: true,
          type: "string",
          enum: ["westus", "eastus"],
          "x-ms-enum": { modelAsString: true, name: "Region" },
        },
      ],
    });
  });

  it("set a server with string literal", async () => {
    const res = await openApiFor(
      `
      enum Region {  }
      @service({title: "My service"})
      @server("https://{region}.example.com", "Regional account endpoint", {
        region: "westus", 
      })
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        {
          in: "path",
          name: "region",
          required: true,
          type: "string",
          enum: ["westus"],
          "x-ms-enum": { modelAsString: false },
        },
      ],
    });
  });

  it("set a server with unions type", async () => {
    const res = await openApiFor(
      `
      enum Region {  }
      @service({title: "My service"})
      @server("https://{region}.example.com", "Regional account endpoint", {
        region: "westus" | "eastus", 
      })
      namespace MyService {}
      `
    );
    strictEqual(res.host, undefined);
    deepStrictEqual(res["x-ms-parameterized-host"], {
      hostTemplate: "https://{region}.example.com",
      useSchemePrefix: false,
      parameters: [
        {
          in: "path",
          name: "region",
          required: true,
          type: "string",
          enum: ["westus", "eastus"],
          "x-ms-enum": {
            modelAsString: false,
          },
        },
      ],
    });
  });
});
