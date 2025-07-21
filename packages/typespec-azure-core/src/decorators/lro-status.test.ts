import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { Tester } from "../../test/test-host.js";
import { getLongRunningStates } from "./lro-status.js";

it("emits diagnostic if used on wrong type", async () => {
  const diagnostics = await Tester.diagnose(`
    @lroStatus
    op foo(): void;

    @lroStatus
    interface Foo {}
  `);

  expectDiagnostics(diagnostics, [
    {
      code: "decorator-wrong-target",
      message:
        "Cannot apply @lroStatus decorator to foo since it is not assignable to Enum | Union | ModelProperty",
    },
    {
      code: "decorator-wrong-target",
      message:
        "Cannot apply @lroStatus decorator to Foo since it is not assignable to Enum | Union | ModelProperty",
    },
  ]);
});

it("emits diagnostic when model property type isn't valid", async () => {
  const diagnostics = await Tester.diagnose(`
    model BadStatusType {
      @lroStatus status: int32;
    }

    model BadUnionType {
      @lroStatus status: "Succeeded" | int64;
    }
  `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/lro-status-property-invalid-type",
      message: "Property type must be a union of strings or an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/lro-status-union-non-string",
      message: "Union contains non-string value type Scalar.",
    },
    {
      code: "@azure-tools/typespec-azure-core/lro-status-missing",
      message: "Terminal long-running operation states are missing: Failed.",
    },
  ]);
});

it("emits diagnostic when standard terminal states are missing", async () => {
  const diagnostics = await Tester.diagnose(`
    model UnionMissingStates {
      @lroStatus status: "Completed" | "Failed" | "Cancelled" | "Working" | "Extra";
    }

    @lroStatus
    enum EnumMissingStates {
      Succeeded, Error, Cancelled
    }
    `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/lro-status-missing",
      message: "Terminal long-running operation states are missing: Succeeded.",
    },
    {
      code: "@azure-tools/typespec-azure-core/lro-status-missing",
      message: "Terminal long-running operation states are missing: Failed.",
    },
  ]);
});

it("returns LRO states from a string union", async () => {
  const { StatusModel, program } = await Tester.compile(t.code`
    model ${t.model("StatusModel")} {
      @lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Working" | "Extra";
    }
`);

  deepStrictEqual(getLongRunningStates(program, StatusModel.properties.get("status")!), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Working", "Extra"],
  });
});

it("returns LRO states from an enum type", async () => {
  const { DefaultLroStates, CustomLroStates, program } = await Tester.compile(t.code`
    @lroStatus
    enum ${t.enum("DefaultLroStates")} {
      Succeeded,
      Failed,
      Canceled,
      Extra,
    }

    @lroStatus
    enum ${t.enum("CustomLroStates")} {
      @lroSucceeded Donezo,
      @lroFailed Borked,
      @lroCanceled Chucked,
      HaveAnother,
    }
  `);

  deepStrictEqual(getLongRunningStates(program, DefaultLroStates), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Extra"],
  });

  deepStrictEqual(getLongRunningStates(program, CustomLroStates), {
    succeededState: ["Donezo"],
    failedState: ["Borked"],
    canceledState: ["Chucked"],
    states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
  });
});

it("returns LRO states from an named union type", async () => {
  const { DefaultLroStates, CustomLroStates, program } = await Tester.compile(t.code`
    @lroStatus
    union ${t.union("DefaultLroStates")} {
      "Succeeded",
      "Failed",
      "Canceled",
      "Extra",
    }

    @lroStatus
    union ${t.union("CustomLroStates")} {
      @lroSucceeded "Donezo",
      @lroFailed "Borked",
      @lroCanceled "Chucked",
      "HaveAnother",
    }
  `);

  deepStrictEqual(getLongRunningStates(program, DefaultLroStates), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Extra"],
  });

  deepStrictEqual(getLongRunningStates(program, CustomLroStates), {
    succeededState: ["Donezo"],
    failedState: ["Borked"],
    canceledState: ["Chucked"],
    states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
  });
});

it("returns LRO states from an named union type built with enum", async () => {
  const { DefaultLroStates, program } = await Tester.compile(t.code`
    enum CommonStates {
      Succeeded,
      Failed,
      Canceled
    }

    @lroStatus
    union ${t.union("DefaultLroStates")} {
      CommonStates,
      "Extra",
    }
  `);

  deepStrictEqual(getLongRunningStates(program, DefaultLroStates), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Extra"],
  });
});

it("returns LRO states from a string type with known values", async () => {
  const { DefaultLroStates, CustomLroStates, program } = await Tester.compile(t.code`
    @lroStatus
    enum ${t.enum("DefaultLroStates")} {
      Succeeded,
      Failed,
      Canceled,
      Extra,
    }

    @lroStatus
    enum ${t.enum("CustomLroStates")} {
      @lroSucceeded Donezo,
      @lroFailed Borked,
      @lroCanceled Chucked,
      HaveAnother,
    }
  `);

  deepStrictEqual(getLongRunningStates(program, DefaultLroStates), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Extra"],
  });

  deepStrictEqual(getLongRunningStates(program, CustomLroStates), {
    succeededState: ["Donezo"],
    failedState: ["Borked"],
    canceledState: ["Chucked"],
    states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
  });
});

it("resolve default state from union variant name", async () => {
  const { DefaultLroStates, program } = await Tester.compile(t.code`
    @lroStatus
    union ${t.union("DefaultLroStates")} {
      Succeeded: "uSucceeded",
      Failed: "uFailed",
      Canceled: "uCancelled",
      Extra: "uExtra",
    }
  `);

  deepStrictEqual(getLongRunningStates(program, DefaultLroStates), {
    succeededState: ["Succeeded"],
    failedState: ["Failed"],
    canceledState: ["Canceled"],
    states: ["Succeeded", "Failed", "Canceled", "Extra"],
  });
});
