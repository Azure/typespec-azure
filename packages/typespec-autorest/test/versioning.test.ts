import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: versioning", () => {
  it("works with models", async () => {
    const { v1, v2, v3 } = await openApiFor(
      `
      @versioned(Versions)
      @service({title: "My Service"})
      namespace MyService {
        enum Versions {
          @useDependency(MyLibrary.Versions.A)
          v1,
          @useDependency(MyLibrary.Versions.B)
          v2,
          @useDependency(MyLibrary.Versions.C)
          v3
        }

        model Test {
          prop1: string;
          @added(Versions.v2) prop2: string;
          @removed(Versions.v2) prop3: string;
          @renamedFrom(Versions.v3, "prop4") prop4new: string;
          @madeOptional(Versions.v3) prop5?: string;
        }

        @route("/read1")
        op read1(): Test;
        op read2(): MyLibrary.Foo;
      }

      @versioned(Versions)
      namespace MyLibrary {
        enum Versions {A, B, C}

        model Foo {
          prop1: string;
          @added(Versions.B) prop2: string;
          @added(Versions.C) prop3: string;
        }
      }
    `,
      ["v1", "v2", "v3"]
    );
    strictEqual(v1.info.version, "v1");
    deepStrictEqual(v1.definitions.Test, {
      type: "object",
      properties: {
        prop1: { type: "string" },
        prop3: { type: "string" },
        prop4: { type: "string" },
        prop5: { type: "string" },
      },
      required: ["prop1", "prop3", "prop4", "prop5"],
    });

    deepStrictEqual(v1.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        prop1: { type: "string" },
      },
      required: ["prop1"],
    });

    strictEqual(v2.info.version, "v2");
    deepStrictEqual(v2.definitions.Test, {
      type: "object",
      properties: {
        prop1: { type: "string" },
        prop2: { type: "string" },
        prop4: { type: "string" },
        prop5: { type: "string" },
      },
      required: ["prop1", "prop2", "prop4", "prop5"],
    });
    deepStrictEqual(v2.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        prop1: { type: "string" },
        prop2: { type: "string" },
      },
      required: ["prop1", "prop2"],
    });

    strictEqual(v3.info.version, "v3");
    deepStrictEqual(v3.definitions.Test, {
      type: "object",
      properties: {
        prop1: { type: "string" },
        prop2: { type: "string" },
        prop5: { type: "string" },
        prop4new: { type: "string" },
      },
      required: ["prop1", "prop2", "prop4new"],
    });
    deepStrictEqual(v3.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        prop1: { type: "string" },
        prop2: { type: "string" },
        prop3: { type: "string" },
      },
      required: ["prop1", "prop2", "prop3"],
    });
  });

  it("works with models and projectedNames", async () => {
    const { v1, v2, v3 } = await openApiFor(
      `
      @versioned(Versions)
      @service({title: "My Service"})
      namespace MyService {
        enum Versions {
          @useDependency(MyLibrary.Versions.A)
          v1,
          @useDependency(MyLibrary.Versions.B)
          v2,
          @useDependency(MyLibrary.Versions.C)
          v3
        }
        model Test {
          @projectedName("json", "jsonProp1")
          prop1: string;
          @projectedName("json", "jsonProp2")
          @added(Versions.v2) prop2: string;
          @removed(Versions.v2) prop3: string;
          @projectedName("json", "jsonProp4NewOrNot")
          @renamedFrom(Versions.v3, "prop4") prop4New: string;
          @madeOptional(Versions.v3) prop5?: string;
        }
        @route("/read1")
        op read1(): Test;
        op read2(): MyLibrary.Foo;
      }
      @versioned(Versions)
      namespace MyLibrary {
        enum Versions {A, B, C}
        model Foo {
          @projectedName("json", "jsonProp1")
          prop1: string;
          @projectedName("json", "jsonProp2")
          @added(Versions.B) prop2: string;
          @added(Versions.C) prop3: string;
        }
      }
    `,
      ["v1", "v2", "v3"]
    );
    strictEqual(v1.info.version, "v1");
    deepStrictEqual(v1.definitions.Test, {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
        prop3: { type: "string" },
        jsonProp4NewOrNot: { type: "string", "x-ms-client-name": "prop4" },
        prop5: { type: "string" },
      },
      required: ["jsonProp1", "prop3", "jsonProp4NewOrNot", "prop5"],
    });

    deepStrictEqual(v1.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
      },
      required: ["jsonProp1"],
    });

    strictEqual(v2.info.version, "v2");
    deepStrictEqual(v2.definitions.Test, {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
        jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
        jsonProp4NewOrNot: { type: "string", "x-ms-client-name": "prop4" },
        prop5: { type: "string" },
      },
      required: ["jsonProp1", "jsonProp2", "jsonProp4NewOrNot", "prop5"],
    });
    deepStrictEqual(v2.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
        jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
      },
      required: ["jsonProp1", "jsonProp2"],
    });

    strictEqual(v3.info.version, "v3");
    deepStrictEqual(v3.definitions.Test, {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
        jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
        prop5: { type: "string" },
        jsonProp4NewOrNot: { type: "string", "x-ms-client-name": "prop4New" },
      },
      required: ["jsonProp1", "jsonProp2", "jsonProp4NewOrNot"],
    });
    deepStrictEqual(v3.definitions["MyLibrary.Foo"], {
      type: "object",
      properties: {
        jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
        jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
        prop3: { type: "string" },
      },
      required: ["jsonProp1", "jsonProp2", "prop3"],
    });
  });
});
