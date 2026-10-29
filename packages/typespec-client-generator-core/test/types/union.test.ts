import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { createTCGCContext } from "../../src/context.js";
import { getAccess, getUsage } from "../../src/decorators.js";
import { type SdkArrayType, type SdkMethodResponse, UsageFlags } from "../../src/interfaces.js";
import { getSdkModel, getSdkUnion } from "../../src/types.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithService,
  XmlTesterWithBuiltInService,
} from "../tester.js";
import { getSdkTypeHelper } from "./utils.js";

describe("inline discriminated union conversion", () => {
  it("preserves literal tags when an enum member has a different encoded name", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      enum Kind {
        @encodedName("application/json", "feline")
        @encodedName("application/xml", "Feline")
        cat: "cat",
      }
      model Base { kind: Kind | string; }
      model Cat extends Base { kind: "cat"; meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends Base { cat: Cat }
      op send(@body pet: Pet): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const cat = context.sdkPackage.models.find((model) => model.name === "Cat");
    ok(cat);
    strictEqual(cat.discriminatorValue, "cat");
    const kind = cat.properties.find((property) => property.name === "kind");
    ok(kind);
    strictEqual(kind.type.kind, "constant");
    strictEqual(kind.type.value, "cat");
  });

  it.each([false, true])(
    "converts the hierarchy with injected discriminator=%s",
    async (injected) => {
      const { program } = await SimpleTesterWithService.compile(`
      model PetBase {
        ${injected ? "" : "kind: string;"}
        name: string;
      }
      model Mammal extends PetBase { age?: int32; }
      model Cat extends Mammal { ${injected ? "" : 'kind: "cat";'} meows: boolean; }
      model Dog extends PetBase { ${injected ? "" : 'kind: "dog";'} barks: boolean; }
      model Unrelated extends PetBase { flies: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat, dog: Dog }
      @post op echo(@body pet: Pet): Pet;
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
      ok(base);
      strictEqual(context.sdkPackage.unions.length, 0);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.parameters[0].type, base);
      strictEqual(method.response.type, base);
      strictEqual(method.operation.bodyParam?.type, base);
      strictEqual(method.operation.responses[0].type, base);
      strictEqual(base.discriminatorProperty?.name, "kind");
      strictEqual(base.discriminatorProperty?.isExactName, false);
      strictEqual(base.discriminatorProperty?.serializationOptions.json?.name, "kind");
      deepStrictEqual(Object.keys(base.discriminatedSubtypes ?? {}), ["cat", "dog"]);
      const mammal = context.sdkPackage.models.find((model) => model.name === "Mammal");
      ok(mammal);
      strictEqual(mammal.baseModel, base);
      strictEqual(base.discriminatedSubtypes?.cat.baseModel, mammal);
      strictEqual(mammal.discriminatorProperty, undefined);
      strictEqual(base.properties.filter((property) => property.discriminator).length, 1);
      const union = context
        .getMutatedGlobalNamespace()
        .namespaces.get("TestService")!
        .unions.get("Pet")!;
      strictEqual(getUsage(context, union), base.usage);
      for (const [tag, name] of [
        ["cat", "Cat"],
        ["dog", "Dog"],
      ]) {
        const variant = context.sdkPackage.models.find((x) => x.name === name);
        ok(variant);
        strictEqual(base.discriminatedSubtypes?.[tag], variant);
        strictEqual(variant.discriminatorValue, tag);
        const property = variant.properties.find((x) => x.discriminator);
        ok(property);
        strictEqual(property.type.kind, "constant");
        strictEqual(property.type.value, tag);
        strictEqual(property.isExactName, false);
        strictEqual(property.serializationOptions.json?.name, "kind");
        strictEqual(variant.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
      }
      strictEqual(
        context.sdkPackage.models.some((x) => x.name === "Unrelated"),
        false,
      );
    },
  );

  it.each([false, true])(
    "does not convert a union containing its base with other subtypes=%s",
    async (withSubtype) => {
      const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { base: PetBase, ${withSubtype ? "cat: Cat" : ""} }
      @post op echo(@body body: Pet): Pet;
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(
        context.diagnostics,
        Array.from({ length: withSubtype ? 2 : 1 }, () => ({
          code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
          severity: "warning" as const,
        })),
      );
      const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
      ok(base);
      const union = context.sdkPackage.unions[0];
      ok(union);
      strictEqual(union.kind, "union");
      strictEqual(union.baseType, base);
      strictEqual(union.discriminatedOptions?.envelope, "none");
      strictEqual(context.sdkPackage.clients[0].methods[0].parameters[0].type, union);
      strictEqual(context.sdkPackage.clients[0].methods[0].response.type, union);
      deepStrictEqual(union.variantTypes, [
        base,
        ...(withSubtype ? [context.sdkPackage.models.find((model) => model.name === "Cat")] : []),
      ]);
      strictEqual(base.discriminatorProperty, undefined);
      strictEqual(base.discriminatorValue, undefined);
      strictEqual(base.discriminatedSubtypes, undefined);
      strictEqual(
        context.sdkPackage.models.find((model) => model.name === "Cat")?.discriminatorValue,
        undefined,
      );
    },
  );

  it("preserves unions and variant identity when conversion is disabled", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { convertDiscriminatedUnionsToModels: false },
    );
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
    });
    const union = context.sdkPackage.unions[0];
    strictEqual(union.kind, "union");
    strictEqual(union.discriminatedOptions?.envelope, "none");
    strictEqual(
      union.variantTypes[0],
      context.sdkPackage.models.find((model) => model.name === "Cat"),
    );
    strictEqual(context.sdkPackage.clients[0].methods[0].response.type, union);
    const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
    ok(base);
    strictEqual(base.discriminatorProperty, undefined);
    strictEqual(base.discriminatedSubtypes, undefined);
    strictEqual(
      context.sdkPackage.models.find((x) => x.name === "Cat")?.discriminatorValue,
      undefined,
    );
    const converted = await createSdkContextForTester(program);
    strictEqual(converted.sdkPackage.clients[0].methods[0].response.type?.kind, "model");
    strictEqual(base.discriminatorProperty, undefined);
  });

  it("converts recursive properties, containers, and nullable uses regardless of traversal order", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; next?: Pet; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      model Holder { pet: Pet; pets: Pet[]; lookup: Record<Pet>; maybe: Pet | null; }
      op getCat(): Cat;
      @post op echo(@body body: Holder): Holder;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
    const holder = context.sdkPackage.models.find((x) => x.name === "Holder");
    ok(base);
    ok(holder);
    strictEqual(base.properties.find((x) => x.name === "next")?.type, base);
    strictEqual(holder.properties[0].type, base);
    const array = holder.properties[1].type;
    strictEqual(array.kind, "array");
    strictEqual(array.valueType, base);
    const dict = holder.properties[2].type;
    strictEqual(dict.kind, "dict");
    strictEqual(dict.valueType, base);
    const nullable = holder.properties[3].type;
    strictEqual(nullable.kind, "nullable");
    strictEqual(nullable.type, base);
    strictEqual(context.sdkPackage.models.find((x) => x.name === "Cat")?.discriminatorValue, "cat");
  });

  it("reuses discriminator properties declared after recursive union properties", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase {
        next?: Pet;
        @clientName("clientKind") kind: string;
      }
      model Cat extends PetBase { kind: "cat"; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      @route("/base") op getBase(): PetBase;
      @route("/union") op getUnion(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    strictEqual(base.properties.filter((property) => property.discriminator).length, 1);
    strictEqual(
      base.discriminatorProperty,
      base.properties.find((property) => property.name === "clientKind"),
    );
    strictEqual(base.properties.find((property) => property.name === "next")?.type, base);
    context.sdkPackage.clients[0].methods.forEach((method) =>
      strictEqual(method.response.type, base),
    );
  });

  it("updates previously handled model properties and HTTP types to the projected base", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      model Holder { pet: Pet; }
      @route("/base") op getBase(): PetBase;
      @route("/holder") @post op echo(@body body: Holder): Holder;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const [getBase, echo] = context.sdkPackage.clients[0].methods;
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    const holder = context.sdkPackage.models.find((model) => model.name === "Holder");
    ok(base);
    ok(holder);
    strictEqual(getBase.response.type, base);
    strictEqual(getBase.operation.responses[0].type, base);
    strictEqual(echo.parameters[0].type, holder);
    strictEqual(echo.operation.bodyParam?.type, holder);
    strictEqual(holder.properties[0].type, base);
    strictEqual(base.discriminatedSubtypes?.cat.discriminatorValue, "cat");
  });

  it("preserves standalone SDK union conversion after the base is already cached", async () => {
    const { program, PetBase, Pet } = await SimpleTesterWithService.compile(t.code`
      model ${t.model("PetBase")} { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union ${t.union("Pet")} extends PetBase { cat: Cat }
    `);
    const context = createTCGCContext(program, "@azure-tools/typespec-test", {
      mutateNamespace: false,
    });
    const base = getSdkModel(context, PetBase);
    const projected = getSdkUnion(context, Pet);
    strictEqual(projected, base);
    strictEqual(base.discriminatedSubtypes?.cat.discriminatorValue, "cat");
    strictEqual(base.properties.filter((property) => property.discriminator).length, 1);
  });

  it("discovers instantiated union templates during normal type handling", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet<T extends PetBase> extends PetBase { cat: T }
      op get(): Pet<Cat>;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    strictEqual(context.sdkPackage.clients[0].methods[0].response.type, base);
    strictEqual(base.discriminatedSubtypes?.cat.discriminatorValue, "cat");
  });

  it("uses wire tags independently of client names", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { @clientName("clientKind") type: string; }
      @clientName("Kitten")
      model Cat extends PetBase { @clientName("clientKind") type: "feline"; }
      @discriminated(#{ envelope: "none", discriminatorPropertyName: "type" })
      union Pet extends PetBase { feline: Cat }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
    ok(base);
    strictEqual(base.discriminatorProperty?.name, "clientKind");
    strictEqual(base.discriminatorProperty?.serializationOptions.json?.name, "type");
    strictEqual(base.discriminatedSubtypes?.feline.name, "Kitten");
    strictEqual(base.discriminatedSubtypes?.feline.discriminatorValue, "feline");
  });

  it("preserves client names when injecting a subtype discriminator", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { @clientName("clientKind") kind: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const cat = context.sdkPackage.models.find((x) => x.name === "Cat");
    ok(cat);
    const property = cat.properties.find((x) => x.discriminator);
    ok(property);
    strictEqual(property.name, "clientKind");
    strictEqual(property.serializationOptions.json?.name, "kind");
  });

  it.each([false, true])(
    "preserves exact discriminator names with inherited property=%s",
    async (inherited) => {
      const { program } = await SimpleTesterWithService.compile(`
        model Entity { ${inherited ? '@clientName(exact("Pet_KIND")) kind: string;' : ""} }
        model PetBase extends Entity {
          ${inherited ? "" : '@clientName(exact("Pet_KIND")) kind: string;'}
        }
        model Cat extends PetBase { meows: boolean; }
        @discriminated(#{ envelope: "none" })
        union Pet extends PetBase { cat: Cat }
        op get(): Pet;
      `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
      ok(base);
      const cat = base.discriminatedSubtypes?.cat;
      ok(cat);
      for (const property of [
        base.discriminatorProperty,
        cat.properties.find((p) => p.discriminator),
      ]) {
        ok(property);
        strictEqual(property.name, "Pet_KIND");
        strictEqual(property.isExactName, true);
        strictEqual(property.serializationOptions.json?.name, "kind");
      }
    },
  );

  it.each([
    { location: "base", propertyName: "type" },
    { location: "ancestor", propertyName: "type" },
    { location: "variant", propertyName: "type" },
    { location: "base", propertyName: "kind" },
  ])(
    "rejects a model discriminator on the $location using $propertyName before recursive conversion",
    async ({ location, propertyName }) => {
      const { program } = await SimpleTesterWithService.compile(`
        ${location === "ancestor" ? `@discriminator("${propertyName}")` : ""}
        model Entity { ${propertyName}: string; }
        ${location === "base" ? `@discriminator("${propertyName}")` : ""}
        model PetBase extends Entity { next?: Pet; }
        ${location === "variant" ? `@discriminator("${propertyName}")` : ""}
        model Cat extends PetBase { ${propertyName}: "cat"; }
        @discriminated(#{ envelope: "none" })
        union Pet extends PetBase { cat: Cat }
        op get(): PetBase;
      `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/union-model-discriminator-conflict",
          severity: "error",
        },
        {
          code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
          severity: "warning",
        },
      ]);
      const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
      ok(base);
      const next = base.properties.find((property) => property.name === "next");
      ok(next);
      strictEqual(next.type.kind, "union");
      if (propertyName !== "kind") {
        strictEqual(
          base.properties.some((property) => property.serializationOptions.json?.name === "kind"),
          false,
        );
      }
      if (location === "base") strictEqual(base.discriminatorProperty?.name, propertyName);
      if (location === "ancestor")
        strictEqual(base.baseModel?.discriminatorProperty?.name, propertyName);
      const native = await createSdkContextForTester(
        program,
        {},
        { convertDiscriminatedUnionsToModels: false },
      );
      expectDiagnostics(native.diagnostics, {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        severity: "warning",
      });
    },
  );

  it.each(["public", "internal"] as const)(
    "preserves union usage and %s access overrides on the projected base",
    async (access) => {
      const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @usage(Usage.input | Usage.output | Usage.json)
      @access(Access.${access})
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
      ok(base);
      strictEqual(base.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
      strictEqual(base.access, access);
      strictEqual(base.discriminatedSubtypes?.cat.access, access);
      strictEqual(base.discriminatorProperty?.serializationOptions.json?.name, "kind");
    },
  );

  it("still reports internal union overrides conflicting with public operation use", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @access(Access.internal)
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(
      context.diagnostics,
      Array.from({ length: 2 }, () => ({
        code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
      })),
    );
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    strictEqual(base.access, "public");
    strictEqual(base.discriminatedSubtypes?.cat.access, "public");
  });

  it("preserves inherited discriminator XML metadata without changing the inherited SDK property", async () => {
    const { program } = await XmlTesterWithBuiltInService.compile(`
      model Entity {
        @clientName("clientKind")
        @encodedName("application/xml", "XmlKind")
        @Xml.attribute
        @Xml.ns("https://example.com/pets", "p")
        kind: string;
      }
      model PetBase extends Entity { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      @post op echo(@header contentType: "application/xml", @body body: Pet):
        { @header contentType: "application/xml"; @body body: Pet; };
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    const inherited = base.baseModel?.properties.find((property) => property.name === "clientKind");
    const subtype = base.discriminatedSubtypes?.cat.properties.find(
      (property) => property.discriminator,
    );
    ok(inherited);
    ok(subtype);
    for (const property of [base.discriminatorProperty, subtype]) {
      ok(property);
      strictEqual(property.__raw, inherited.__raw);
      strictEqual(property.name, "clientKind");
      strictEqual(property.serializationOptions.xml?.name, "XmlKind");
      strictEqual(property.serializationOptions.xml?.attribute, true);
      deepStrictEqual(property.serializationOptions.xml?.ns, {
        namespace: "https://example.com/pets",
        prefix: "p",
      });
    }
    strictEqual(inherited.discriminator, false);
    strictEqual(inherited.type.kind, "string");
    strictEqual(subtype.type.kind, "constant");
  });

  it("preserves an inherited discriminator's client name and enum type", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      union PetKind { cat: "cat", dog: "dog" }
      model NamedEntity { @clientName("clientKind") kind: PetKind; }
      model Entity extends NamedEntity { id: string; }
      model PetBase extends Entity { name: string; }
      model Cat extends PetBase { meows: boolean; }
      model Dog extends PetBase { barks: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      @discriminated(#{ envelope: "none" })
      union OtherPet extends PetBase { dog: Dog }
      @route("/cat") op get(): Pet;
      @route("/dog") op getOther(): OtherPet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    strictEqual(base.discriminatorProperty?.name, "clientKind");
    strictEqual(base.discriminatorProperty?.serializationOptions.json?.name, "kind");
    strictEqual(base.discriminatorProperty?.type.kind, "enum");
    strictEqual(base.baseModel?.discriminatorProperty, undefined);
    const entity = base.baseModel;
    const root = entity?.baseModel;
    ok(entity);
    ok(root);
    strictEqual(entity.name, "Entity");
    strictEqual(root.name, "NamedEntity");
    strictEqual(root.discriminatorProperty, undefined);
    const inherited = root.properties.find((property) => property.name === "clientKind");
    ok(inherited);
    strictEqual(base.discriminatorProperty?.__raw, inherited.__raw);
    strictEqual(base.discriminatorProperty?.type, inherited.type);
    const property = base.discriminatedSubtypes?.cat.properties.find(
      (property) => property.discriminator,
    );
    ok(property);
    strictEqual(property.name, "clientKind");
    strictEqual(property.type.kind, "enumvalue");
    strictEqual(base.discriminatedSubtypes?.cat.baseModel, base);
    strictEqual(base.discriminatedSubtypes?.dog.discriminatorValue, "dog");
    context.sdkPackage.clients[0].methods.forEach((method) =>
      strictEqual(method.response.type, base),
    );
  });

  it.each([false, true])(
    "preserves enum discriminator types with injected discriminator=%s",
    async (injected) => {
      const { program } = await SimpleTesterWithService.compile(`
        union PetKind { cat: "cat", dog: "dog" }
        model PetBase { kind: PetKind; }
        model Cat extends PetBase { ${injected ? "" : 'kind: "cat";'} meows: boolean; }
        @discriminated(#{ envelope: "none" })
        union Pet extends PetBase { cat: Cat }
        op get(): Pet;
      `);
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
      ok(base);
      const enumType = base.discriminatorProperty?.type;
      ok(enumType);
      strictEqual(enumType.kind, "enum");
      strictEqual(
        base.discriminatedSubtypes?.cat.properties.find((property) => property.discriminator)?.type,
        enumType.values.find((value) => value.value === "cat"),
      );
    },
  );

  it("combines compatible disjoint unions using the same base", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      model Dog extends PetBase { barks: boolean; }
      @discriminated(#{ envelope: "none" })
      union IndoorPet extends PetBase { cat: Cat }
      @discriminated(#{ envelope: "none" })
      union OutdoorPet extends PetBase { dog: Dog }
      @route("/indoor") op indoor(): IndoorPet;
      @route("/outdoor") op outdoor(): OutdoorPet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((x) => x.name === "PetBase");
    ok(base);
    deepStrictEqual(Object.keys(base.discriminatedSubtypes ?? {}), ["cat", "dog"]);
    context.sdkPackage.clients[0].methods.forEach((method) =>
      strictEqual(method.response.type, base),
    );
    strictEqual(base.properties.filter((property) => property.discriminator).length, 1);
    strictEqual(context.sdkPackage.models.filter((x) => x.name === "PetBase").length, 1);
  });

  it("propagates combined usage, access, and serialization after shared-base conversion", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      model Dog extends PetBase { barks: boolean; }
      @discriminated(#{ envelope: "none" })
      union IndoorPet extends PetBase { cat: Cat }
      @discriminated(#{ envelope: "none" })
      union OutdoorPet extends PetBase { dog: Dog }
      @access(Access.internal)
      @route("/indoor") @post
      op indoor(@header contentType: "application/xml", @body body: IndoorPet): void;
      @route("/outdoor") op outdoor(): OutdoorPet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    deepStrictEqual(Object.keys(base.discriminatedSubtypes ?? {}), ["cat", "dog"]);
    for (const variant of Object.values(base.discriminatedSubtypes ?? {})) {
      strictEqual(
        variant.usage,
        UsageFlags.Input | UsageFlags.Output | UsageFlags.Json | UsageFlags.Xml,
      );
      strictEqual(variant.access, "public");
      ok(variant.serializationOptions.json);
      ok(variant.serializationOptions.xml);
    }
    strictEqual(context.sdkPackage.clients[0].methods[0].operation.bodyParam?.type, base);
    strictEqual(context.sdkPackage.clients[0].methods[1].response.type, base);
  });

  it("aliases connected unions to their respective bases without rolling back valid hierarchies", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model AnimalBase { name: string; }
      model PetBase extends AnimalBase { }
      model Cat extends PetBase { meows: boolean; }
      model Dog extends PetBase { barks: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pets extends PetBase { cat: Cat }
      @discriminated(#{ envelope: "none" })
      union OtherPets extends PetBase { feline: Cat }
      @discriminated(#{ envelope: "none" })
      union Animals extends AnimalBase { dog: Dog }
      @route("/pets") op pets(): Pets;
      @route("/others") op others(): OtherPets;
      @route("/animals") op animals(): Animals;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/union-model-conversion-conflict",
      severity: "error",
    });
    const petBase = context.sdkPackage.models.find((model) => model.name === "PetBase");
    const animalBase = context.sdkPackage.models.find((model) => model.name === "AnimalBase");
    ok(petBase);
    ok(animalBase);
    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods[0].response.type, petBase);
    strictEqual(methods[1].response.type, petBase);
    strictEqual(methods[2].response.type, animalBase);
    strictEqual(petBase.discriminatedSubtypes?.cat.discriminatorValue, "cat");
    strictEqual(animalBase.discriminatedSubtypes?.dog.discriminatorValue, "dog");
  });

  it("propagates internal operation access to the converted hierarchy", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      @access(Access.internal)
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    strictEqual(base.access, "internal");
    strictEqual(base.discriminatedSubtypes?.cat.access, "internal");
    const union = context
      .getMutatedGlobalNamespace()
      .namespaces.get("TestService")!
      .unions.get("Pet")!;
    strictEqual(getAccess(context, union), "internal");
  });

  it("keeps conflicting unions aliased to the base without overwriting subtype tags", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { cat: Cat }
      @discriminated(#{ envelope: "none" })
      union Animal extends PetBase { feline: Cat }
      @route("/base") op base(): PetBase;
      @route("/pet") op pet(): Pet;
      @route("/animal") op animal(): Animal;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/union-model-conversion-conflict",
      severity: "error",
    });
    const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
    ok(base);
    context.sdkPackage.clients[0].methods.forEach((method) =>
      strictEqual(method.response.type, base),
    );
    deepStrictEqual(Object.keys(base.discriminatedSubtypes ?? {}), ["cat"]);
    strictEqual(context.sdkPackage.models.find((x) => x.name === "Cat")?.discriminatorValue, "cat");
  });

  it.each([
    { name: "repeated payload", properties: "", variants: "cat: Cat, feline: Cat" },
    {
      name: "encoded discriminator",
      properties: '@encodedName("application/json", "type") kind: string;',
      variants: "cat: Cat",
    },
  ])("reports incompatible $name metadata", async ({ properties, variants }) => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { ${properties} name: string; }
      model Cat extends PetBase { meows: boolean; }
      @discriminated(#{ envelope: "none" })
      union Pet extends PetBase { ${variants} }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/union-model-conversion-conflict",
      severity: "error",
    });
    strictEqual(
      context.sdkPackage.clients[0].methods[0].response.type,
      context.sdkPackage.models.find((model) => model.name === "PetBase"),
    );
    strictEqual(
      context.sdkPackage.models.find((x) => x.name === "Cat")?.discriminatorValue,
      undefined,
    );
  });

  it.each([
    {
      name: "ordinary",
      decorator: "",
      cat: "extends PetBase",
      constraint: "extends PetBase",
      variants: "cat: Cat, dog: Dog",
    },
    {
      name: "envelope",
      decorator: "@discriminated",
      cat: "extends PetBase",
      constraint: "extends PetBase",
      variants: "cat: Cat",
    },
    {
      name: "structural",
      decorator: '@discriminated(#{ envelope: "none" })',
      cat: "",
      constraint: "extends PetBase",
      variants: "cat: Cat",
    },
    {
      name: "no base",
      decorator: '@discriminated(#{ envelope: "none" })',
      cat: "extends PetBase",
      constraint: "",
      variants: "cat: Cat",
    },
    {
      name: "default",
      decorator: '@discriminated(#{ envelope: "none" })',
      cat: "extends PetBase",
      constraint: "extends PetBase",
      variants: "cat: Cat, UnknownPet",
    },
  ])("leaves $name unions unchanged", async ({ decorator, cat, constraint, variants }) => {
    const { program } = await SimpleTesterWithService.compile(`
      model PetBase { name: string; }
      model Cat ${cat} { name: string; meows: boolean; }
      model Dog extends PetBase { barks: boolean; }
      model UnknownPet extends PetBase { kind: string; }
      ${decorator}
      union Pet ${constraint} { ${variants} }
      op get(): Pet;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(
      context.diagnostics,
      Array.from({ length: variants.includes(",") ? 2 : 1 }, () => ({
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        severity: "warning" as const,
      })),
    );
    strictEqual(context.sdkPackage.clients[0].methods[0].response.type?.kind, "union");
    strictEqual(
      context.sdkPackage.models.find((x) => x.name === "PetBase")?.discriminatorProperty,
      undefined,
    );
  });
});

it("primitive union", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        name: string | int32;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "TestName");
  strictEqual(sdkType.isGeneratedName, true);
  strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(sdkType.access, "public");
  ok(sdkType.isGeneratedName);
  const values = sdkType.variantTypes;
  strictEqual(values.length, 2);
  strictEqual(values[0].kind, "string");
  strictEqual(values[1].kind, "int32");
  ok(sdkType.variants instanceof Map);
  deepStrictEqual([...sdkType.variants.values()], values);
  strictEqual(sdkType.variants.size, 2);
  for (const key of sdkType.variants.keys()) {
    strictEqual(typeof key, "symbol");
  }
  const rawUnion = sdkType.__raw;
  ok(rawUnion);
  strictEqual(rawUnion.kind, "Union");
  deepStrictEqual([...sdkType.variants.keys()], [...rawUnion.variants.keys()]);

  deepStrictEqual(context.sdkPackage.unions[0], sdkType);
});

it.each([false, true])("named union variants with nullable=%s", async (nullable) => {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      value: Choice;
    }

    union Choice {
      firstOption: Payload,
      int32,
      ${nullable ? "null," : ""}
      second_option: Payload,
      int32,
    }

    @clientName("RenamedPayload")
    model Payload {
      value: string;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  if (nullable) {
    strictEqual(sdkType.kind, "nullable");
  }
  const unionType = sdkType.kind === "nullable" ? sdkType.type : sdkType;
  strictEqual(unionType.kind, "union");
  const keys = [...unionType.variants.keys()];
  strictEqual(keys[0], "firstOption");
  strictEqual(typeof keys[1], "symbol");
  strictEqual(keys[2], "second_option");
  strictEqual(typeof keys[3], "symbol");
  strictEqual(unionType.variants.size, 4);
  [...unionType.variants.values()].forEach((type, index) => {
    strictEqual(type, unionType.variantTypes[index]);
  });
  const payload = unionType.variants.get("firstOption");
  ok(payload);
  strictEqual(payload, unionType.variants.get("second_option"));
  strictEqual(payload.kind, "model");
  strictEqual(payload.name, "RenamedPayload");
  strictEqual(unionType.variants.get(keys[1])?.kind, "int32");
  strictEqual(unionType.variants.get(keys[3])?.kind, "int32");
});

it("discriminated union preserves distinct tags for the same payload type", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      value: Limit;
    }

    @discriminated(#{ discriminatorPropertyName: "tag", envelopePropertyName: "contents" })
    union Limit {
      daily: string,
      weekly: string,
      monthly: string,
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  deepStrictEqual([...sdkType.variants.keys()], ["daily", "weekly", "monthly"]);
  strictEqual(sdkType.variantTypes.length, 3);
  [...sdkType.variants.values()].forEach((type, index) => {
    strictEqual(type.kind, "string");
    strictEqual(type, sdkType.variantTypes[index]);
  });
});

it("discriminated union exposes an unnamed default variant", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      value: Pet;
    }

    @discriminated(#{ envelope: "none" })
    union Pet {
      cat: Cat,
      UnknownPet,
    }

    model Cat {
      name: string;
    }
    model UnknownPet {
      kind: string;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  const keys = [...sdkType.variants.keys()];
  strictEqual(sdkType.variants.size, 2);
  strictEqual(keys[0], "cat");
  strictEqual(typeof keys[1], "symbol");
  strictEqual(sdkType.variants.get("cat"), sdkType.variantTypes[0]);
  const defaultType = sdkType.variants.get(keys[1]);
  ok(defaultType);
  strictEqual(defaultType, sdkType.variantTypes[1]);
  strictEqual(defaultType.kind, "model");
  strictEqual(defaultType.name, "UnknownPet");
});

it("nullable", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: float32 | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.name, "TestName");
  strictEqual(nullableType.isGeneratedName, true);
  strictEqual(nullableType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableType.access, "public");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], nullableType);
});

it("nullable with more types", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: string | float32 | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.name, "TestName");
  strictEqual(nullableType.isGeneratedName, true);
  strictEqual(nullableType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableType.access, "public");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.variantTypes.length, 2);
  strictEqual(sdkType.variantTypes[0].kind, "string");
  strictEqual(sdkType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], nullableType);
});

it("nullable doc", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model TestModel {
      prop: TestNullable;
    }
    
    @doc("nullable doc")
    union TestNullable {
      null,
      {
        prop: string;
      }
    }
  `);

  const context = await createSdkContextForTester(program);
  const nullableUnion = getSdkTypeHelper(context);
  strictEqual(nullableUnion.kind, "nullable");
  strictEqual(nullableUnion.name, "TestNullable");
  strictEqual(nullableUnion.isGeneratedName, false);
  strictEqual(nullableUnion.doc, "nullable doc");

  strictEqual(nullableUnion.type.kind, "model");
  strictEqual(nullableUnion.type.name, "TestModelProp");
  strictEqual(nullableUnion.type.isGeneratedName, true);
});

it("record with nullable", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: Record<float32 | null>;
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "dict");
  const elementType = sdkType.valueType;
  strictEqual(elementType.kind, "nullable");
  strictEqual(elementType.name, "TestName");
  strictEqual(elementType.isGeneratedName, true);
  strictEqual(elementType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(elementType.access, "public");
  strictEqual(elementType.type.kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], elementType);
});

it("record with nullable with more types", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: Record<string | float32 | null>;
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "dict");
  const elementType = sdkType.valueType;
  strictEqual(elementType.kind, "nullable");
  strictEqual(elementType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(elementType.name, "TestName");
  strictEqual(elementType.isGeneratedName, true);
  strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(elementType.access, "public");

  const elementTypeValueType = elementType.type;
  strictEqual(elementTypeValueType.kind, "union");
  strictEqual(elementTypeValueType.variantTypes.length, 2);
  strictEqual(elementTypeValueType.variantTypes[0].kind, "string");
  strictEqual(elementTypeValueType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], elementType);
});

it("array with nullable", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: (float32 | null)[];
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "array");
  const elementType = sdkType.valueType;
  strictEqual(elementType.kind, "nullable");
  strictEqual(elementType.name, "TestName");
  strictEqual(elementType.isGeneratedName, true);
  strictEqual(elementType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(elementType.access, "public");
  strictEqual(elementType.type.kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], elementType);
});

it("array with nullable with more types", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: (string | float32 | null)[];
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "array");
  const elementType = sdkType.valueType;
  strictEqual(elementType.kind, "nullable");
  strictEqual(elementType.name, "TestName");
  strictEqual(elementType.isGeneratedName, true);
  strictEqual(elementType.crossLanguageDefinitionId, "TestService.Test.name.anonymous");
  strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(elementType.access, "public");
  const elementTypeValueType = elementType.type;
  strictEqual(elementTypeValueType.kind, "union");
  strictEqual(elementTypeValueType.variantTypes.length, 2);
  strictEqual(elementTypeValueType.variantTypes[0].kind, "string");
  strictEqual(elementTypeValueType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], elementType);
});

it("additional property is nullable", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model TestExtends extends Record<string|null> {
      name: string;
    }

    @usage(Usage.input | Usage.output)
    model TestIs is Record<string|null> {
      name: string;
    }

    @usage(Usage.input | Usage.output)
    model TestSpread {
      name: string;
      ...Record<string|null>
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);

  const extendsType = models.find((x) => x.name === "TestExtends");
  ok(extendsType);
  strictEqual(extendsType.kind, "model");
  const additionalProperties = extendsType.additionalProperties;
  ok(additionalProperties);
  strictEqual(additionalProperties.kind, "nullable");
  strictEqual(additionalProperties.name, "TestExtendsAdditionalProperty");
  strictEqual(additionalProperties.isGeneratedName, true);
  strictEqual(
    additionalProperties.crossLanguageDefinitionId,
    "TestService.TestExtends.AdditionalProperty.anonymous",
  );
  strictEqual(additionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(additionalProperties.access, "public");
  strictEqual(additionalProperties.type.kind, "string");

  deepStrictEqual(context.sdkPackage.unions[0], additionalProperties);

  const isType = models.find((x) => x.name === "TestIs");
  ok(isType);
  strictEqual(isType.kind, "model");
  const isTypeAdditionalProperties = isType.additionalProperties;
  ok(isTypeAdditionalProperties);
  strictEqual(isTypeAdditionalProperties.kind, "nullable");
  strictEqual(isTypeAdditionalProperties.name, "TestIsAdditionalProperty");
  strictEqual(isTypeAdditionalProperties.isGeneratedName, true);
  strictEqual(
    isTypeAdditionalProperties.crossLanguageDefinitionId,
    "TestService.TestIs.AdditionalProperty.anonymous",
  );
  strictEqual(isTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(isTypeAdditionalProperties.access, "public");
  strictEqual(isTypeAdditionalProperties.type.kind, "string");

  deepStrictEqual(context.sdkPackage.unions[1], isTypeAdditionalProperties);

  const spreadType = models.find((x) => x.name === "TestSpread");
  ok(spreadType);
  strictEqual(spreadType.kind, "model");
  const spreadTypeAdditionalProperties = spreadType.additionalProperties;
  ok(spreadTypeAdditionalProperties);
  strictEqual(spreadTypeAdditionalProperties.kind, "nullable");
  strictEqual(spreadTypeAdditionalProperties.name, "TestSpreadAdditionalProperty");
  strictEqual(spreadTypeAdditionalProperties.isGeneratedName, true);
  strictEqual(
    spreadTypeAdditionalProperties.crossLanguageDefinitionId,
    "TestService.TestSpread.AdditionalProperty.anonymous",
  );
  strictEqual(spreadTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(spreadTypeAdditionalProperties.access, "public");
  strictEqual(spreadTypeAdditionalProperties.type.kind, "string");

  deepStrictEqual(context.sdkPackage.unions[2], spreadTypeAdditionalProperties);
});

it("additional property nullable with more types", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model TestExtends extends Record<string|float32|null> {
      name: string;
    }

    @usage(Usage.input | Usage.output)
    model TestIs is Record<string|float32|null> {
      name: string;
    }

    @usage(Usage.input | Usage.output)
    model TestSpread {
      name: string;
      ...Record<string|float32|null>
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);

  const extendsType = models.find((x) => x.name === "TestExtends");
  ok(extendsType);
  strictEqual(extendsType.kind, "model");

  const extendsTypeAdditionalProperties = extendsType.additionalProperties;
  ok(extendsTypeAdditionalProperties);
  strictEqual(extendsTypeAdditionalProperties.kind, "nullable");
  strictEqual(extendsTypeAdditionalProperties.name, "TestExtendsAdditionalProperty");
  strictEqual(extendsTypeAdditionalProperties.isGeneratedName, true);
  strictEqual(
    extendsTypeAdditionalProperties.crossLanguageDefinitionId,
    "TestService.TestExtends.AdditionalProperty.anonymous",
  );
  strictEqual(extendsTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(extendsTypeAdditionalProperties.access, "public");
  const extendsAdPropUnderlyingType = extendsTypeAdditionalProperties.type;
  strictEqual(extendsAdPropUnderlyingType.kind, "union");
  strictEqual(extendsAdPropUnderlyingType.name, "TestExtendsAdditionalProperty");
  strictEqual(extendsAdPropUnderlyingType.isGeneratedName, true);
  strictEqual(extendsAdPropUnderlyingType.variantTypes.length, 2);
  strictEqual(extendsAdPropUnderlyingType.variantTypes[0].kind, "string");
  strictEqual(extendsAdPropUnderlyingType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[0], extendsTypeAdditionalProperties);

  const isType = models.find((x) => x.name === "TestIs");
  ok(isType);
  strictEqual(isType.kind, "model");
  const isTypeAdditionalProperties = isType.additionalProperties;
  ok(isTypeAdditionalProperties);
  strictEqual(isTypeAdditionalProperties.kind, "nullable");
  strictEqual(isTypeAdditionalProperties.name, "TestIsAdditionalProperty");
  strictEqual(isTypeAdditionalProperties.isGeneratedName, true);
  strictEqual(
    isTypeAdditionalProperties.crossLanguageDefinitionId,
    "TestService.TestIs.AdditionalProperty.anonymous",
  );
  strictEqual(isTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(isTypeAdditionalProperties.access, "public");
  const isTypeAdditionalPropertiesUnderlyingType = isTypeAdditionalProperties.type;
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.kind, "union");
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.name, "TestIsAdditionalProperty");
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes.length, 2);
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes[0].kind, "string");
  strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[1], isTypeAdditionalProperties);

  const spreadType = models.find((x) => x.name === "TestSpread");
  ok(spreadType);
  strictEqual(spreadType.kind, "model");
  const spreadTypeAdditionalProperties = spreadType.additionalProperties;
  ok(spreadTypeAdditionalProperties);
  strictEqual(spreadTypeAdditionalProperties.kind, "nullable");
  strictEqual(spreadTypeAdditionalProperties.name, "TestSpreadAdditionalProperty");
  strictEqual(spreadTypeAdditionalProperties.isGeneratedName, true);
  strictEqual(
    spreadTypeAdditionalProperties.crossLanguageDefinitionId,
    "TestService.TestSpread.AdditionalProperty.anonymous",
  );
  strictEqual(spreadTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(spreadTypeAdditionalProperties.access, "public");
  const spreadTypeAdditionalPropertiesUnderlyingType = spreadTypeAdditionalProperties.type;
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.kind, "union");
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.name, "TestSpreadAdditionalProperty");
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes.length, 2);
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes[0].kind, "string");
  strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes[1].kind, "float32");

  deepStrictEqual(context.sdkPackage.unions[2], spreadTypeAdditionalProperties);
});

it("model with simple union property", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model ModelWithSimpleUnionProperty {
      prop: int32 | int32[];
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(sdkType.access, "public");
  const values = sdkType.variantTypes;
  strictEqual(values.length, 2);
  strictEqual(values[0].kind, "int32");
  strictEqual(values[1].kind, "array");

  const elementType = (<SdkArrayType>values[1]).valueType;
  strictEqual(elementType.kind, "int32");

  deepStrictEqual(context.sdkPackage.unions[0], sdkType);
});

it("model with named union", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model BaseModel {
      name: string;
    }
    @usage(Usage.input | Usage.output)
    model Model1 extends BaseModel {
      prop1: int32;
    }
    @usage(Usage.input | Usage.output)
    model Model2 extends BaseModel {
      prop2: int32;
    }
    @usage(Usage.input | Usage.output)
    union MyNamedUnion {
      one: Model1,
      two: Model2,
    }

    @usage(Usage.input | Usage.output)
    model ModelWithNamedUnionProperty {
      prop: MyNamedUnion;
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 4);
  const modelWithNamedUnionProperty = models.find(
    (x) => x.kind === "model" && x.name === "ModelWithNamedUnionProperty",
  );
  ok(modelWithNamedUnionProperty);
  const property = modelWithNamedUnionProperty.properties[0];
  strictEqual(property.kind, "property");
  const sdkType = property.type;
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "MyNamedUnion");
  strictEqual(sdkType.isGeneratedName, false);
  strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(sdkType.access, "public");
  const variants = sdkType.variantTypes;
  strictEqual(variants.length, 2);
  strictEqual(variants[0].kind, "model");
  strictEqual(variants[0].name, "Model1");
  strictEqual(
    variants[0],
    models.find((x) => x.kind === "model" && x.name === "Model1"),
  );
  strictEqual(variants[1].kind, "model");
  strictEqual(variants[1].name, "Model2");
  strictEqual(
    variants[1],
    models.find((x) => x.kind === "model" && x.name === "Model2"),
  );

  deepStrictEqual(context.sdkPackage.unions[0], sdkType);
});

it("preserves an explicit union base type", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    model BaseModel {
      name: string;
    }
    model Model1 extends BaseModel {
      prop1: int32;
    }
    model Model2 extends BaseModel {
      prop2: int32;
    }
    @usage(Usage.input | Usage.output)
    union MyNamedUnion extends BaseModel {
      one: Model1,
      two: Model2,
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  ok(sdkType.baseType);
  strictEqual(sdkType.baseType.kind, "model");
  strictEqual(sdkType.baseType.name, "BaseModel");
  strictEqual(
    sdkType.baseType,
    context.sdkPackage.models.find((x) => x.name === "BaseModel"),
  );
  strictEqual(sdkType.baseType.usage, sdkType.usage);
});

it.each([
  {
    name: "input",
    operation: "@post op send(@body body: MyNamedUnion): void;",
    usage: UsageFlags.Input | UsageFlags.Json,
  },
  {
    name: "output",
    operation: "op get(): MyNamedUnion;",
    usage: UsageFlags.Output | UsageFlags.Json,
  },
  {
    name: "input and output",
    operation: "@post op echo(@body body: MyNamedUnion): MyNamedUnion;",
    usage: UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  },
])("propagates $name usage and access to a union base constraint", async ({ operation, usage }) => {
  const { program } = await SimpleTesterWithService.compile(`
    model BaseModel {
      name: string;
    }
    model Model1 {
      name: string;
      prop1: int32;
    }
    model Model2 {
      name: string;
      prop2: int32;
    }
    union MyNamedUnion extends BaseModel {
      one: Model1,
      two: Model2,
    }
    @access(Access.internal)
    ${operation}
  `);

  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
  ]);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.usage, usage);
  strictEqual(sdkType.access, "internal");
  const baseType = sdkType.baseType;
  ok(baseType);
  strictEqual(baseType.kind, "model");
  strictEqual(baseType.usage, usage);
  strictEqual(baseType.access, "internal");
  strictEqual(
    baseType,
    context.sdkPackage.models.find((x) => x.name === "BaseModel"),
  );
  strictEqual(baseType.serializationOptions.json?.name, "BaseModel");
  strictEqual(baseType.properties[0].serializationOptions.json?.name, "name");
});

it.each([false, true])(
  "propagates orphan union overrides to its explicit base with disableUsageAccessPropagationToBase=%s",
  async (disableUsageAccessPropagationToBase) => {
    const { program } = await SimpleTesterWithService.compile(`
      model BaseModel {
        name: string;
      }
      model Model1 {
        name: string;
        prop1: int32;
      }
      model Model2 {
        name: string;
        prop2: int32;
      }
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union MyNamedUnion extends BaseModel {
        one: Model1,
        two: Model2,
      }
    `);

    const context = await createSdkContextForTester(
      program,
      {},
      { disableUsageAccessPropagationToBase },
    );
    expectDiagnostics(context.diagnostics, [
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        severity: "warning",
        message: "Kind Model prevents this union from being resolved as an enum.",
      },
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        severity: "warning",
        message: "Kind Model prevents this union from being resolved as an enum.",
      },
    ]);
    const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
    ok(sdkType);
    strictEqual(sdkType.kind, "union");
    const baseType = sdkType.baseType;
    ok(baseType);
    strictEqual(baseType.kind, "model");
    strictEqual(baseType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(baseType.access, "public");
    strictEqual(
      baseType,
      context.sdkPackage.models.find((x) => x.name === "BaseModel"),
    );
  },
);

it("honors an explicit access override on the union base constraint", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @access(Access.public)
    model BaseModel {
      name: string;
    }
    model Model1 {
      name: string;
      prop1: int32;
    }
    model Model2 {
      name: string;
      prop2: int32;
    }
    union MyNamedUnion extends BaseModel {
      one: Model1,
      two: Model2,
    }
    @access(Access.internal)
    op get(): MyNamedUnion;
  `);

  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
  ]);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.access, "internal");
  ok(sdkType.baseType);
  strictEqual(sdkType.baseType.kind, "model");
  strictEqual(sdkType.baseType.access, "public");
  strictEqual(sdkType.baseType.usage, UsageFlags.Output | UsageFlags.Json);
});

it("propagates usage through a union base constraint chain", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BaseModel {
      name: string;
    }
    model BaseVariant1 {
      name: string;
      prop1: int32;
    }
    model BaseVariant2 {
      name: string;
      prop2: int32;
    }
    union BaseConstraint extends BaseModel {
      one: BaseVariant1,
      two: BaseVariant2,
    }
    model Model1 {
      name: string;
      prop1: int32;
      extra: boolean;
    }
    model Model2 {
      name: string;
      prop2: int32;
      extra: boolean;
    }
    union MyNamedUnion extends BaseConstraint {
      one: Model1,
      two: Model2,
    }
    @access(Access.internal)
    op get(): MyNamedUnion;
  `);

  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
  ]);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  const baseType = sdkType.baseType;
  ok(baseType);
  strictEqual(baseType.kind, "union");
  strictEqual(baseType.usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(baseType.access, "internal");
  strictEqual(
    baseType,
    context.sdkPackage.unions.find((x) => x.name === "BaseConstraint"),
  );
  ok(baseType.baseType);
  strictEqual(baseType.baseType.kind, "model");
  strictEqual(baseType.baseType.usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(baseType.baseType.access, "internal");
  strictEqual(
    baseType.baseType,
    context.sdkPackage.models.find((x) => x.name === "BaseModel"),
  );
  strictEqual(baseType.baseType.serializationOptions.json?.name, "BaseModel");
  for (const variant of baseType.variantTypes) {
    strictEqual(variant.kind, "model");
    strictEqual(variant.usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual(variant.access, "internal");
    strictEqual(variant.serializationOptions.json?.name, variant.name);
  }
});

it("preserves a scalar union base constraint", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    union MyNamedUnion extends numeric {
      int32,
      float32,
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.baseType?.kind, "numeric");
});

it("does not propagate union base usage to unrelated discriminated subtypes", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @discriminator("kind")
    model BaseModel {
      kind: string;
    }
    model Model1 extends BaseModel {
      kind: "one";
    }
    model Model2 extends BaseModel {
      kind: "two";
    }
    model Unused extends BaseModel {
      kind: "unused";
    }
    union MyNamedUnion extends BaseModel {
      one: Model1,
      two: Model2,
    }
    op get(): MyNamedUnion;
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  ok(sdkType.baseType);
  strictEqual(sdkType.baseType.kind, "model");
  strictEqual(sdkType.baseType.usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(
    context.sdkPackage.models.find((x) => x.name === "Unused"),
    undefined,
  );
  deepStrictEqual(Object.keys(sdkType.baseType.discriminatedSubtypes ?? {}), ["one", "two"]);
});

it("handles a union base model that references the union", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BaseModel {
      name: string;
      choice?: MyNamedUnion;
    }
    model Model1 extends BaseModel {
      prop1: int32;
    }
    model Model2 extends BaseModel {
      prop2: int32;
    }
    union MyNamedUnion extends BaseModel {
      one: Model1,
      two: Model2,
    }
    @post op echo(@body body: MyNamedUnion): MyNamedUnion;
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  ok(sdkType.baseType);
  strictEqual(sdkType.baseType.kind, "model");
  strictEqual(
    sdkType.baseType,
    context.sdkPackage.models.find((x) => x.name === "BaseModel"),
  );
  strictEqual(sdkType.baseType.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(sdkType.baseType.properties.find((x) => x.name === "choice")?.type, sdkType);
});

it("does not infer a union base type from a common model ancestor", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model BaseModel {
      name: string;
    }
    model Model1 extends BaseModel {
      prop1: int32;
    }
    model Model2 extends BaseModel {
      prop2: int32;
    }
    @usage(Usage.input | Usage.output)
    union MyNamedUnion {
      one: Model1,
      two: Model2,
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(sdkType);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.baseType, undefined);
});

it("model with nullable named union", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model BaseModel {
      name: string;
    }
    @usage(Usage.input | Usage.output)
    model Model1 extends BaseModel {
      prop1: int32;
    }
    @usage(Usage.input | Usage.output)
    model Model2 extends BaseModel {
      prop2: int32;
    }
    @usage(Usage.input | Usage.output)
    union MyNamedUnion {
      one: Model1,
      two: Model2,
      null,
    }

    @usage(Usage.input | Usage.output)
    model ModelWithNamedUnionProperty {
      prop: MyNamedUnion;
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 4);
  const modelWithNamedUnionProperty = models.find(
    (x) => x.kind === "model" && x.name === "ModelWithNamedUnionProperty",
  );
  ok(modelWithNamedUnionProperty);
  const property = modelWithNamedUnionProperty.properties[0];
  strictEqual(property.kind, "property");
  const sdkType = property.type;
  strictEqual(sdkType.kind, "nullable");
  strictEqual(sdkType.name, "MyNamedUnion");
  strictEqual(sdkType.isGeneratedName, false);
  strictEqual(sdkType.crossLanguageDefinitionId, "TestService.MyNamedUnion");
  strictEqual(sdkType.type.kind, "union");
  strictEqual(sdkType.type.name, "MyNamedUnion");
  strictEqual(sdkType.type.isGeneratedName, true);
  strictEqual(sdkType.type.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(sdkType.type.access, "public");
  const variants = sdkType.type.variantTypes;
  strictEqual(variants.length, 2);
  strictEqual(variants[0].kind, "model");
  strictEqual(variants[0].name, "Model1");
  strictEqual(
    variants[0],
    models.find((x) => x.kind === "model" && x.name === "Model1"),
  );
  strictEqual(variants[1].kind, "model");
  strictEqual(variants[1].name, "Model2");
  strictEqual(
    variants[1],
    models.find((x) => x.kind === "model" && x.name === "Model2"),
  );

  deepStrictEqual(context.sdkPackage.unions[0], sdkType);
});

it("preserves an explicit union base type inside a nullable wrapper", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    model BaseModel {
      name: string;
    }
    model Model1 extends BaseModel {
      prop1: int32;
    }
    model Model2 extends BaseModel {
      prop2: int32;
    }
    union BaseConstraint {
      base: BaseModel,
      null,
    }
    union MyNamedUnion extends BaseConstraint {
      one: Model1,
      two: Model2,
      null,
    }
    @access(Access.internal)
    @post op echo(@body body: MyNamedUnion): MyNamedUnion;
  `);

  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
    {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      severity: "warning",
      message: "Kind Model prevents this union from being resolved as an enum.",
    },
  ]);
  const nullableType = context.sdkPackage.unions.find((x) => x.name === "MyNamedUnion");
  ok(nullableType);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.type.kind, "union");
  ok(nullableType.type.baseType);
  strictEqual(nullableType.type.baseType.kind, "nullable");
  strictEqual(nullableType.type.baseType.name, "BaseConstraint");
  strictEqual(
    nullableType.type.baseType.usage,
    UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  );
  strictEqual(nullableType.type.baseType.access, "internal");
  strictEqual(
    nullableType.type.baseType,
    context.sdkPackage.unions.find((x) => x.name === "BaseConstraint"),
  );
  strictEqual(nullableType.type.baseType.type.kind, "model");
  strictEqual(nullableType.type.baseType.type.name, "BaseModel");
  strictEqual(
    nullableType.type.baseType.type,
    context.sdkPackage.models.find((x) => x.name === "BaseModel"),
  );
});

it("model with nullable enum property", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    enum PetKind {
      dog, cat, bird
    }
    @usage(Usage.input | Usage.output)
    model Home {
      pet: PetKind | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableType.access, "public");
  strictEqual(nullableType.crossLanguageDefinitionId, "TestService.Home.pet.anonymous");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "enum");
  strictEqual(sdkType.isUnionAsEnum, false);
  strictEqual(sdkType.name, "PetKind");

  const values = sdkType.values;
  strictEqual(values.length, 3);

  deepStrictEqual(context.sdkPackage.unions[0], nullableType);
});

it("model with nullable union as enum", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Home {
      pet: "dog" | "cat" | "bird" | string | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.name, "HomePet");
  strictEqual(nullableType.isGeneratedName, true);
  strictEqual(nullableType.crossLanguageDefinitionId, "TestService.Home.pet.anonymous");
  strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableType.access, "public");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "enum");
  strictEqual(sdkType.isUnionAsEnum, true);
  strictEqual(sdkType.name, "HomePet");

  const values = sdkType.values;
  strictEqual(values.length, 3);

  deepStrictEqual(context.sdkPackage.unions[0], nullableType);
});

it("model with nullable model property", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model PropertyModel {
      internalProp: string;
    }

    @usage(Usage.input | Usage.output)
    model Test {
      prop: PropertyModel | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models.find((x) => x.kind === "model" && x.name === "Test");
  ok(model);
  const nullableType = model.properties[0].type;
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.name, "TestProp");
  strictEqual(nullableType.isGeneratedName, true);
  strictEqual(nullableType.crossLanguageDefinitionId, "TestService.Test.prop.anonymous");
  strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableType.access, "public");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "model");
  strictEqual(sdkType.name, "PropertyModel");

  deepStrictEqual(context.sdkPackage.unions[0], nullableType);
});

it("nullable union with anonymous model ref self", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    union A {
      null,
      {
        code?: string,
        message?: string,
        propA?: A,
      },
    }
    op post(@body body: A): { @body body: A }; 
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  const unions = context.sdkPackage.unions;

  strictEqual(models.length, 1);
  strictEqual(models[0].kind, "model");
  strictEqual(models[0].name, "PostRequest");
  strictEqual(models[0].properties[2].type, unions[0]);

  strictEqual(unions.length, 1);
  strictEqual(unions[0].kind, "nullable");
  strictEqual(unions[0].name, "A");
  strictEqual(unions[0].crossLanguageDefinitionId, "TestService.A");
  strictEqual(unions[0].type, models[0]);

  const method = context.sdkPackage.clients[0].methods[0];
  ok(method);
  const bodyParamType = method.parameters[0].type;
  strictEqual(bodyParamType.kind, "nullable");
  strictEqual(bodyParamType.crossLanguageDefinitionId, "TestService.A");
  deepStrictEqual(bodyParamType.type, models[0]);
  const responseBodyType = (method.response as SdkMethodResponse).type;
  ok(responseBodyType);
  strictEqual(responseBodyType.kind, "nullable");
  strictEqual(bodyParamType.crossLanguageDefinitionId, "TestService.A");
  deepStrictEqual(responseBodyType.type, models[0]);
});

it("nullable union circular", async function () {
  const [{ program }] = await SimpleTester.compileAndDiagnose(`
    @service
    namespace Test {
      union Test {
        null,
        Test,
      }

      op test(test: Test): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/union-circular",
  });
});

it("complicated union circular", async function () {
  const { program } = await SimpleTester.compile(`
    @service
    namespace Test {
      union A {
        "A",
        B,
      }
      
      union B {
        "B",
        C,
      }

      union C {
        "C",
        A,
      }

      op test(test: A): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  const diagnostic = {
    code: "@azure-tools/typespec-client-generator-core/union-circular",
  };
  // A has diagnostic
  expectDiagnostics(context.diagnostics, [diagnostic]);
});

it("mix types", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model ModelType {
      name: string;
    }

    @usage(Usage.input | Usage.output)
    model Test {
      prop: "none" | "auto" | ModelType;
    }

    @usage(Usage.input | Usage.output)
    model TestNullable {
      prop: "none" | "auto" | ModelType | null;
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  const model = models.find((x) => x.kind === "model" && x.name === "Test");
  ok(model);
  const nullableModel = models.find((x) => x.kind === "model" && x.name === "TestNullable");
  ok(nullableModel);
  const unionType = model.properties[0].type;
  strictEqual(unionType.kind, "union");
  strictEqual(unionType.name, "TestProp");
  strictEqual(unionType.isGeneratedName, true);
  strictEqual(unionType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(unionType.access, "public");
  for (const v of unionType.variantTypes) {
    if (v.kind === "model") {
      strictEqual(v.name, "ModelType");
    } else {
      strictEqual(v.kind, "constant");
    }
  }
  deepStrictEqual(context.sdkPackage.unions[0], unionType);

  const nullableProp = nullableModel.properties[0];
  strictEqual(nullableProp.type.kind, "nullable");
  strictEqual(nullableProp.type.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(nullableProp.type.access, "public");
  strictEqual(nullableProp.type.type.kind, "union");
  strictEqual(nullableProp.type.type.variantTypes.length, 3);
  strictEqual(
    nullableProp.type.crossLanguageDefinitionId,
    "TestService.TestNullable.prop.anonymous",
  );

  // now check without null with help of helper function
  const sdkType = nullableProp.type.type;
  strictEqual(sdkType.kind, "union");
  for (const v of sdkType.variantTypes) {
    if (v.kind === "model") {
      strictEqual(v.name, "ModelType");
    } else {
      strictEqual(v.kind, "constant");
    }
  }

  deepStrictEqual(context.sdkPackage.unions[1], nullableProp.type);
});

it("usage", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    union UnionAsEnum {
      "A",
      "B",
      string,
    }

    model Foo {
      prop: string;
    }

    union NullableUnion {
      Foo,
      null
    }

    model Bar {
      prop1: UnionAsEnum;
      prop2: NullableUnion;
    }

    @access(Access.internal)
    op func(
      @body body: Bar
    ): void;
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  const foo = models.find((x) => x.name === "Foo");
  ok(foo);
  strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Json);
  strictEqual(foo.access, "internal");

  const enums = context.sdkPackage.enums;
  strictEqual(enums.length, 1);
  const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
  ok(unionAsEnum);
  strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Json);
  strictEqual(unionAsEnum.access, "internal");

  const unions = context.sdkPackage.unions;
  strictEqual(unions.length, 1);
  strictEqual(unions[0].kind, "nullable");
  strictEqual(unions[0].usage, UsageFlags.Input | UsageFlags.Json);
  strictEqual(unions[0].access, "internal");
});

it("usage override", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    @access(Access.public)
    union UnionAsEnum {
      "A",
      "B",
      string,
    }

    @usage(Usage.input | Usage.output)
    @access(Access.public)
    model Foo {
      prop: string;
    }

    @usage(Usage.input | Usage.output)
    @access(Access.public)
    union NullableUnion {
      Foo,
      null
    }

    model Bar {
      prop1: UnionAsEnum;
      prop2: NullableUnion;
    }

    @access(Access.internal)
    op func(
      @body body: Bar
    ): void;
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  const foo = models.find((x) => x.name === "Foo");
  ok(foo);
  strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(foo.access, "public");
  const enums = context.sdkPackage.enums;
  strictEqual(enums.length, 1);
  const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
  ok(unionAsEnum);
  strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(unionAsEnum.access, "public");

  const unions = context.sdkPackage.unions;
  strictEqual(unions.length, 1);
  strictEqual(unions[0].kind, "nullable");
  strictEqual(unions[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(unions[0].access, "public");
});

it("usage override for orphan union as enum", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    union UnionAsEnum {
      "A",
      "B",
      string,
    }

    @usage(Usage.input | Usage.output)
    @access(Access.internal)
    union UnionAsEnumInternal {
      "A",
      "B",
      string,
    }
  `);

  const context = await createSdkContextForTester(program);
  const enums = context.sdkPackage.enums;
  strictEqual(enums.length, 2);
  const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
  ok(unionAsEnum);
  strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(unionAsEnum.access, "public");
  const unionAsEnumInternal = enums.find((x) => x.name === "UnionAsEnumInternal");
  ok(unionAsEnumInternal);
  strictEqual(unionAsEnumInternal.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(unionAsEnumInternal.access, "internal");
});

it("union with only one literal", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      name: TestUnion;
    }

    union TestUnion {
      "A"
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "enum");
  strictEqual(sdkType.name, "TestUnion");
  const values = sdkType.values;
  strictEqual(values.length, 1);
  strictEqual(values[0].value, "A");
  deepStrictEqual(context.sdkPackage.enums[0], sdkType);
});

it("default discriminated union", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      pet: Pet;
    }

    @discriminated
    union Pet { 
      cat: Cat, 
      dog: Dog 
    }

    model Cat { 
      name: string; 
      meow: boolean; 
    }
    
    model Dog { 
      name: string; 
      bark: boolean; 
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "Pet");
  strictEqual(sdkType.isGeneratedName, false);
  strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
  strictEqual(sdkType.access, "public");

  // Test discriminatedOptions
  ok(sdkType.discriminatedOptions);
  strictEqual(sdkType.discriminatedOptions.envelope, "object");
  strictEqual(sdkType.discriminatedOptions.discriminatorPropertyName, "kind");
  strictEqual(sdkType.discriminatedOptions.envelopePropertyName, "value");

  const variantTypes = sdkType.variantTypes;
  strictEqual(variantTypes.length, 2);
  strictEqual(variantTypes[0].kind, "model");
  strictEqual(variantTypes[0].name, "Cat");
  strictEqual(variantTypes[1].kind, "model");
  strictEqual(variantTypes[1].name, "Dog");
});

it("discriminated union with custom discriminator property", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      vehicle: Vehicle;
    }

    @discriminated(#{discriminatorPropertyName: "type"})
    union Vehicle { 
      car: Car, 
      bike: Bike 
    }

    model Car { 
      brand: string; 
      doors: int32; 
    }
    
    model Bike { 
      brand: string; 
      gears: int32; 
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "Vehicle");
  strictEqual(sdkType.isGeneratedName, false);

  // Test discriminatedOptions with custom discriminator
  ok(sdkType.discriminatedOptions);
  strictEqual(sdkType.discriminatedOptions.envelope, "object");
  strictEqual(sdkType.discriminatedOptions.discriminatorPropertyName, "type");
  strictEqual(sdkType.discriminatedOptions.envelopePropertyName, "value");

  const variantTypes = sdkType.variantTypes;
  strictEqual(variantTypes.length, 2);
  strictEqual(variantTypes[0].kind, "model");
  strictEqual(variantTypes[0].name, "Car");
  strictEqual(variantTypes[1].kind, "model");
  strictEqual(variantTypes[1].name, "Bike");
});

it("discriminated union with none envelope", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      shape: Shape;
    }

    @discriminated(#{envelope: "none"})
    union Shape { 
      circle: Circle, 
      square: Square 
    }

    model Circle { 
      radius: float32; 
    }
    
    model Square { 
      side: float32; 
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "Shape");
  strictEqual(sdkType.isGeneratedName, false);

  // Test discriminatedOptions with none envelope
  ok(sdkType.discriminatedOptions);
  strictEqual(sdkType.discriminatedOptions.envelope, "none");
  strictEqual(sdkType.discriminatedOptions.discriminatorPropertyName, "kind");
  strictEqual(sdkType.discriminatedOptions.envelopePropertyName, undefined);

  const variantTypes = sdkType.variantTypes;
  strictEqual(variantTypes.length, 2);
  strictEqual(variantTypes[0].kind, "model");
  strictEqual(variantTypes[0].name, "Circle");
  strictEqual(variantTypes[1].kind, "model");
  strictEqual(variantTypes[1].name, "Square");
});

it("discriminated union with custom envelope property", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      message: Message;
    }

    @discriminated(#{envelopePropertyName: "data"})
    union Message { 
      text: TextMessage, 
      image: ImageMessage 
    }

    model TextMessage { 
      content: string; 
    }
    
    model ImageMessage { 
      url: string; 
      alt: string; 
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "Message");
  strictEqual(sdkType.isGeneratedName, false);

  // Test discriminatedOptions with custom envelope property
  ok(sdkType.discriminatedOptions);
  strictEqual(sdkType.discriminatedOptions.envelope, "object");
  strictEqual(sdkType.discriminatedOptions.discriminatorPropertyName, "kind");
  strictEqual(sdkType.discriminatedOptions.envelopePropertyName, "data");

  const variantTypes = sdkType.variantTypes;
  strictEqual(variantTypes.length, 2);
  strictEqual(variantTypes[0].kind, "model");
  strictEqual(variantTypes[0].name, "TextMessage");
  strictEqual(variantTypes[1].kind, "model");
  strictEqual(variantTypes[1].name, "ImageMessage");
});

it("regular union without discriminator has no discriminatedOptions", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      value: string | int32 | boolean;
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "union");
  strictEqual(sdkType.name, "TestValue");
  strictEqual(sdkType.isGeneratedName, true);

  // Test that regular unions don't have discriminatedOptions
  strictEqual(sdkType.discriminatedOptions, undefined);

  const variantTypes = sdkType.variantTypes;
  strictEqual(variantTypes.length, 3);
  strictEqual(variantTypes[0].kind, "string");
  strictEqual(variantTypes[1].kind, "int32");
  strictEqual(variantTypes[2].kind, "boolean");
});

it("nullable discriminated union", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      optionalPet: Pet | null;
    }

    @discriminated
    union Pet { 
      cat: Cat, 
      dog: Dog 
    }

    model Cat { 
      name: string; 
      meow: boolean; 
    }
    
    model Dog { 
      name: string; 
      bark: boolean; 
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");
  strictEqual(nullableType.name, "TestOptionalPet");
  strictEqual(nullableType.isGeneratedName, true);

  const unionType = nullableType.type;
  strictEqual(unionType.kind, "union");
  strictEqual(unionType.name, "Pet");
  strictEqual(unionType.isGeneratedName, false);

  // Test discriminatedOptions are preserved in nullable wrapper
  ok(unionType.discriminatedOptions);
  strictEqual(unionType.discriminatedOptions.envelope, "object");
  strictEqual(unionType.discriminatedOptions.discriminatorPropertyName, "kind");
  strictEqual(unionType.discriminatedOptions.envelopePropertyName, "value");

  const variantTypes = unionType.variantTypes;
  strictEqual(variantTypes.length, 2);
  strictEqual(variantTypes[0].kind, "model");
  strictEqual(variantTypes[0].name, "Cat");
  strictEqual(variantTypes[1].kind, "model");
  strictEqual(variantTypes[1].name, "Dog");
});
