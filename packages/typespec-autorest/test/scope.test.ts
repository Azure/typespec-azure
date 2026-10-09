import { describe, expect, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

describe("@scope decorator", () => {
  describe("operations", () => {
    it("omits operations scoped to a different emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/included") op included(): void;
        @route("/excluded") @scope("python") op excluded(): void;
        `,
        { preset: "azure" },
      );

      expect(res.paths["/included"]).toBeDefined();
      expect(res.paths["/excluded"]).toBeUndefined();
    });

    it("includes operations scoped to autorest emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/included") @scope("autorest") op included(): void;
        `,
        { preset: "azure" },
      );

      expect(res.paths["/included"]).toBeDefined();
    });

    it("includes operations with no scope (default behavior)", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/no-scope") op noScope(): void;
        `,
        { preset: "azure" },
      );

      expect(res.paths["/no-scope"]).toBeDefined();
    });

    it("omits operations with negation scope matching autorest", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/included") op included(): void;
        @route("/excluded") @scope("!autorest") op excluded(): void;
        `,
        { preset: "azure" },
      );

      expect(res.paths["/included"]).toBeDefined();
      expect(res.paths["/excluded"]).toBeUndefined();
    });
  });

  describe("model properties", () => {
    it("omits model properties scoped to a different emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        model Foo {
          included: string;
          @scope("python") excluded: string;
        }
        @route("/test") op test(): Foo;
        `,
        { preset: "azure" },
      );

      const fooDef = res.definitions?.["Foo"];
      expect(fooDef).toBeDefined();
      expect(fooDef!.properties?.["included"]).toBeDefined();
      expect(fooDef!.properties?.["excluded"]).toBeUndefined();
    });

    it("includes model properties scoped to autorest emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        model Foo {
          included: string;
          @scope("autorest") alsoIncluded: string;
        }
        @route("/test") op test(): Foo;
        `,
        { preset: "azure" },
      );

      const fooDef = res.definitions?.["Foo"];
      expect(fooDef).toBeDefined();
      expect(fooDef!.properties?.["included"]).toBeDefined();
      expect(fooDef!.properties?.["alsoIncluded"]).toBeDefined();
    });

    it("includes model properties with no scope (default behavior)", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        model Foo {
          prop1: string;
          prop2: int32;
        }
        @route("/test") op test(): Foo;
        `,
        { preset: "azure" },
      );

      const fooDef = res.definitions?.["Foo"];
      expect(fooDef).toBeDefined();
      expect(fooDef!.properties?.["prop1"]).toBeDefined();
      expect(fooDef!.properties?.["prop2"]).toBeDefined();
    });

    it("scoped-out property is not in required list", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        model Foo {
          included: string;
          @scope("python") excluded: string;
        }
        @route("/test") op test(): Foo;
        `,
        { preset: "azure" },
      );

      const fooDef = res.definitions?.["Foo"];
      expect(fooDef).toBeDefined();
      expect(fooDef!.required).toEqual(["included"]);
    });
  });

  describe("operation parameters", () => {
    it("omits query parameters scoped to a different emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/test") op test(@query included: string, @query @scope("python") excluded: string): void;
        `,
        { preset: "azure" },
      );

      const params = res.paths["/test"].get?.parameters;
      expect(params).toBeDefined();
      const paramNames = params!.map((p: any) => p.name);
      expect(paramNames).toContain("included");
      expect(paramNames).not.toContain("excluded");
    });

    it("includes parameters scoped to autorest emitter", async () => {
      const res = await compileOpenAPI(
        `
        @service namespace MyService;
        @route("/test") op test(@query @scope("autorest") included: string): void;
        `,
        { preset: "azure" },
      );

      const params = res.paths["/test"].get?.parameters;
      expect(params).toBeDefined();
      const paramNames = params!.map((p: any) => p.name);
      expect(paramNames).toContain("included");
    });
  });
});
