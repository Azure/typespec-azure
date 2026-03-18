import { notStrictEqual, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("generates 12-character hex hash", async () => {
  const { program } = await SimpleTester.compile(`
    @service namespace MyService {
      op get(): string;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.crossLanguageVersion.length, 12);
  strictEqual(/^[0-9a-f]{12}$/.test(sdkPackage.crossLanguageVersion), true);
});

it("is deterministic across runs", async () => {
  const code = `
    @service namespace MyService {
      model Widget { id: string; name: string; }
      op get(): Widget;
    }
  `;

  const { program: program1 } = await SimpleTester.compile(code);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(code);
  const context2 = await createSdkContextForTester(program2);

  strictEqual(context1.sdkPackage.crossLanguageVersion, context2.sdkPackage.crossLanguageVersion);
});

it("changes when operation is added", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/get") op get(): string;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/get") op get(): string;
      @route("/create") op create(): string;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when model property is added", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; }
      op get(): Widget;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; name: string; }
      op get(): Widget;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("does NOT change when doc comment changes", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      /** Gets a widget */
      op get(): string;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      /** Gets a widget from the store */
      op get(): string;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  strictEqual(context1.sdkPackage.crossLanguageVersion, context2.sdkPackage.crossLanguageVersion);
});

it("changes when enum value is added", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      enum Color { Red, Blue }
      op get(): Color;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      enum Color { Red, Blue, Green }
      op get(): Color;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when parameter is renamed", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      op get(@query id: string): string;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      op get(@query widgetId: string): string;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("handles empty service", async () => {
  const { program } = await SimpleTester.compile(`
    @service namespace MyService {}
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.crossLanguageVersion.length, 12);
  strictEqual(/^[0-9a-f]{12}$/.test(sdkPackage.crossLanguageVersion), true);
});

it("changes when operation is removed", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/get") op get(): string;
      @route("/create") op create(): string;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/get") op get(): string;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when model is renamed", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; }
      op get(): Widget;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Gadget { id: string; }
      op get(): Gadget;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when property optionality changes", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; name: string; }
      op get(): Widget;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; name?: string; }
      op get(): Widget;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when property type changes", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; count: int32; }
      op get(): Widget;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      model Widget { id: string; count: int64; }
      op get(): Widget;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});

it("changes when HTTP verb changes", async () => {
  const { program: program1 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/widget") @get op getWidget(): string;
    }
  `);
  const context1 = await createSdkContextForTester(program1);

  const { program: program2 } = await SimpleTester.compile(`
    @service namespace MyService {
      @route("/widget") @post op getWidget(): string;
    }
  `);
  const context2 = await createSdkContextForTester(program2);

  notStrictEqual(
    context1.sdkPackage.crossLanguageVersion,
    context2.sdkPackage.crossLanguageVersion,
  );
});
