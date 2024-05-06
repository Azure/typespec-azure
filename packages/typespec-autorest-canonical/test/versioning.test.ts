import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { it } from "vitest";
import { canonicalVersion } from "../src/emitter.js";
import { diagnoseOpenApiFor, ignoreUseStandardOps, openApiFor } from "./test-host.js";

it("works with models", async () => {
  const v = await openApiFor(
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
  `
  );
  strictEqual(v.info.version, canonicalVersion);
  deepStrictEqual(v.info["x-canonical-included-versions"], ["v1", "v2", "v3"]);
  deepStrictEqual(v.definitions.Test, {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
      prop5: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });

  deepStrictEqual(v.definitions["MyLibrary.Foo"], {
    type: "object",
    properties: {
      prop1: { type: "string" },
      prop2: { type: "string" },
      prop3: { type: "string" },
    },
    required: ["prop1", "prop2", "prop3"],
  });
});

it("works with models and projectedNames (LEGACY)", async () => {
  const v = await openApiFor(
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
        #suppress "deprecated" "for testing"
        @projectedName("json", "jsonProp1")
        prop1: string;
        #suppress "deprecated" "for testing"
        @projectedName("json", "jsonProp2")
        @added(Versions.v2) prop2: string;
        @removed(Versions.v2) prop3: string;
        #suppress "deprecated" "for testing"
        @projectedName("json", "jsonProp4NewOrNot")
        prop4: string;
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
        #suppress "deprecated" "for testing"
        @projectedName("json", "jsonProp1")
        prop1: string;
        #suppress "deprecated" "for testing"
        @projectedName("json", "jsonProp2")
        @added(Versions.B) prop2: string;
        @added(Versions.C) prop3: string;
      }
    }
  `
  );
  strictEqual(v.info.version, canonicalVersion);
  deepStrictEqual(v.info["x-canonical-included-versions"], ["v1", "v2", "v3"]);
  deepStrictEqual(v.definitions.Test, {
    type: "object",
    properties: {
      jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
      jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
      jsonProp4NewOrNot: { type: "string", "x-ms-client-name": "prop4" },
      prop3: { type: "string" },
      prop5: { type: "string" },
    },
    required: ["jsonProp1", "jsonProp2", "prop3", "jsonProp4NewOrNot"],
  });

  deepStrictEqual(v.definitions["MyLibrary.Foo"], {
    type: "object",
    properties: {
      jsonProp1: { type: "string", "x-ms-client-name": "prop1" },
      jsonProp2: { type: "string", "x-ms-client-name": "prop2" },
      prop3: { type: "string" },
    },
    required: ["jsonProp1", "jsonProp2", "prop3"],
  });
});

it("Diagnostics for unsupported versioning decorators.", async () => {
  const diagnostics = await diagnoseOpenApiFor(
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
        @typeChangedFrom(Versions.v2, int32) prop6: string;
      }

      @route("/read1")
      op read1(): Test;
      op read2(): MyLibrary.Foo;

      @route("/testReturnType") 
      @returnTypeChangedFrom(Versions.v2, int32) 
      op testReturnType(var: string): string; 
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
  `
  );
  expectDiagnostics(ignoreUseStandardOps(diagnostics), [
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @renamedFrom is not supported in AutorestCanonical.",
    },
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @typeChangedFrom is not supported in AutorestCanonical.",
    },
    {
      code: "@azure-tools/typespec-autorest-canonical/unsupported-versioning-decorator",
      message: "Decorator @returnTypeChangedFrom is not supported in AutorestCanonical.",
    },
  ]);
});
