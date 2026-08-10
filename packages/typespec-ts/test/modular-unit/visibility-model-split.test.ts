import { assert, describe, it } from "vitest";

import {
  emitModularModelsFromTypeSpec,
  emitModularOperationsFromTypeSpec,
} from "../util/emit-util.js";

/**
 * End-to-end tests for the experimental
 * `experimental-split-models-by-visibility` emitter option, which projects
 * request-body models to their write visibility so that required read-only
 * properties (e.g. ARM `@visibility(Lifecycle.Read)` name/id) no longer leak
 * into the generated input types.
 */
describe("visibility model split (experimental)", () => {
  it("keeps read-only props leaking into the body when the flag is OFF", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      model Widget {
        @visibility(Lifecycle.Read)
        id: string;
        name: string;
        weight: int32;
      }

      @post op create(@body body: Widget): Widget;
      `,
      {},
    );
    assert.ok(models);
    const text = models.getFullText();
    // Without the flag there is a single Widget interface (read-only id stays,
    // just marked `readonly`) and no split model.
    assert.isTrue(/interface Widget\b/.test(text), text);
    assert.isFalse(/WidgetCreate\b/.test(text), text);
  });

  it("splits the POST body into WidgetCreate and strips read-only props", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      model Widget {
        @visibility(Lifecycle.Read)
        id: string;
        name: string;
        weight: int32;
      }

      @post op create(@body body: Widget): Widget;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(models);
    const text = models.getFullText();
    // The write view is emitted as a separate WidgetCreate interface...
    assert.isTrue(/interface WidgetCreate\b/.test(text), text);
    // ...whose members do not include the read-only `id`.
    const createBody = text.slice(
      text.indexOf("interface WidgetCreate"),
      text.indexOf("}", text.indexOf("interface WidgetCreate")),
    );
    assert.isFalse(/\bid\b/.test(createBody), createBody);
    assert.isTrue(/\bname\b/.test(createBody), createBody);
    // The read model still carries the read-only `id`.
    assert.isTrue(/interface Widget\b[\s\S]*?readonly "?id"?/.test(text), text);
  });

  it("projects nested models for a PUT body (ACreateOrUpdate + BCreateOrUpdate)", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      model B {
        @visibility(Lifecycle.Read)
        bid: string;
        label: string;
      }

      model A {
        @visibility(Lifecycle.Read)
        aid: string;
        child: B;
      }

      @put op createOrUpdate(@body body: A): A;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(models);
    const text = models.getFullText();
    // PUT resolves to Create|Update -> CreateOrUpdate suffix, applied recursively.
    assert.isTrue(/interface ACreateOrUpdate\b/.test(text), text);
    assert.isTrue(/interface BCreateOrUpdate\b/.test(text), text);
    // The nested child property references the projected nested model.
    const aBody = text.slice(
      text.indexOf("interface ACreateOrUpdate"),
      text.indexOf("}", text.indexOf("interface ACreateOrUpdate")),
    );
    assert.isTrue(/BCreateOrUpdate/.test(aBody), aBody);
    assert.isFalse(/\baid\b/.test(aBody), aBody);
    // The read models A and B are still emitted with their read-only props.
    assert.isTrue(/interface A\b/.test(text), text);
    assert.isTrue(/interface B\b/.test(text), text);
  });

  it("keeps distinct generic model instantiations separate", async () => {
    const files = await emitModularOperationsFromTypeSpec(
      `
      model Patch<T> {
        properties?: T;
      }

      model FooProperties {
        value: string;
        @visibility(Lifecycle.Read)
        fooStatus: string;
      }

      model BarProperties {
        count: int32;
        @visibility(Lifecycle.Read)
        barStatus: string;
      }

      @route("/foo") @patch op updateFoo(@body body: Patch<FooProperties>): void;
      @route("/bar") @patch op updateBar(@body body: Patch<BarProperties>): void;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(files);
    const text = files.map((f) => f.getFullText()).join("\n");
    const fooType = /function updateFoo\([\s\S]*?body:\s*(\w+)/.exec(text)?.[1];
    const barType = /function updateBar\([\s\S]*?body:\s*(\w+)/.exec(text)?.[1];
    assert.ok(fooType, text);
    assert.ok(barType, text);
    assert.notEqual(fooType, barType, text);
  });

  it("projects model elements nested in arrays", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      model Item {
        @visibility(Lifecycle.Read)
        id: string;
        value: string;
      }

      model Batch {
        items: Item[];
      }

      @post op createBatch(@body body: Batch): Batch;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(models);
    const text = models.getFullText();
    assert.isTrue(/interface ItemCreate\b/.test(text), text);
    const batchCreate = text.slice(
      text.indexOf("interface BatchCreate"),
      text.indexOf("}", text.indexOf("interface BatchCreate")),
    );
    assert.isTrue(/"?items"?:\s*\(?ItemCreate\)?\[\]/.test(batchCreate), batchCreate);
    const itemCreate = text.slice(
      text.indexOf("interface ItemCreate"),
      text.indexOf("}", text.indexOf("interface ItemCreate")),
    );
    assert.isFalse(/\bid\b/.test(itemCreate), itemCreate);
  });

  it("projects a discriminated hierarchy (PetCreate + Cat/DogCreate + PetCreateUnion)", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      @discriminator("kind")
      model Pet {
        @visibility(Lifecycle.Read)
        petId: string;
        name: string;
      }

      model Cat extends Pet {
        kind: "cat";
        @visibility(Lifecycle.Read)
        livesLeft: int32;
        meowVolume: int32;
      }

      model Dog extends Pet {
        kind: "dog";
        barkVolume: int32;
      }

      @post op createPet(@body body: Pet): Pet;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(models);
    const text = models.getFullText();
    // The whole discriminator hierarchy is projected to the write view.
    assert.isTrue(/interface PetCreate\b/.test(text), text);
    // Subtypes are re-parented to the projected base (CatCreate extends PetCreate).
    assert.isTrue(/interface CatCreate extends PetCreate\b/.test(text), text);
    // Dog re-parents even though it adds no read-only props of its own.
    assert.isTrue(/interface DogCreate extends PetCreate\b/.test(text), text);
    // The polymorphic union alias is emitted over the projected subtypes...
    assert.isTrue(
      /type PetCreateUnion =[^;]*CatCreate[^;]*DogCreate[^;]*PetCreate/.test(text),
      text,
    );
    // ...and there is no unresolved polymorphic placeholder.
    assert.isFalse(/__PLACEHOLDER/.test(text), text);
    // The base's read-only petId and Cat's read-only livesLeft are dropped.
    const petCreate = text.slice(
      text.indexOf("interface PetCreate"),
      text.indexOf("}", text.indexOf("interface PetCreate")),
    );
    assert.isFalse(/\bpetId\b/.test(petCreate), petCreate);
    const catCreate = text.slice(
      text.indexOf("interface CatCreate"),
      text.indexOf("}", text.indexOf("interface CatCreate")),
    );
    assert.isFalse(/\blivesLeft\b/.test(catCreate), catCreate);
    // The read models are still emitted with their read-only props intact.
    assert.isTrue(/interface Pet\b[\s\S]*?readonly "?petId"?/.test(text), text);
  });

  it("repoints a nested model-typed spread parameter (detail -> DetailCreate)", async () => {
    const files = await emitModularOperationsFromTypeSpec(
      `
      model Detail {
        @visibility(Lifecycle.Read)
        detailId: string;
        note: string;
      }

      model Container {
        @visibility(Lifecycle.Read)
        containerId: string;
        title: string;
        detail: Detail;
      }

      @post op createContainer(...Container): Container;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(files);
    const text = files!.map((f) => f.getFullText()).join("\n");
    // The spread body maps each property to a client-method parameter. The
    // model-typed `detail` parameter is repointed to the projected write model,
    // dropping the nested read-only `detailId`, while `title` stays untouched.
    assert.isTrue(/detail:\s*DetailCreate\b/.test(text), text);
    assert.isFalse(/detail:\s*Detail\b(?!Create)/.test(text), text);
    assert.isTrue(/title:\s*string\b/.test(text), text);
    // The request body serializes via the split model's serializer, so the
    // produced DetailCreate is referenced rather than orphaned.
    assert.isTrue(/detailCreateSerializer\(detail\)/.test(text), text);
    assert.isFalse(/detailSerializer\(detail\)/.test(text), text);
  });

  it("repoints a cyclic self-reference to the write clone (NodeCreate.next -> NodeCreate)", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `
      model Node {
        @visibility(Lifecycle.Read)
        nodeId: string;
        label: string;
        next?: Node;
      }

      @post op createNode(@body body: Node): Node;
      `,
      { experimentalSplitModelsByVisibility: true } as any,
    );
    assert.ok(models);
    const text = models.getFullText();
    // The write view drops the read-only nodeId...
    assert.isTrue(/interface NodeCreate\b/.test(text), text);
    const createBody = text.slice(
      text.indexOf("interface NodeCreate"),
      text.indexOf("}", text.indexOf("interface NodeCreate")),
    );
    assert.isFalse(/\bnodeId\b/.test(createBody), createBody);
    // ...and the cyclic back-edge is patched to reference the write clone, not
    // the read model, so a nested create at any depth also sheds nodeId.
    assert.isTrue(/"?next"?\?:\s*NodeCreate\b/.test(createBody), createBody);
    // The corresponding serializer delegates `next` to nodeCreateSerializer.
    assert.isTrue(
      /nodeCreateSerializer[\s\S]*?next[\s\S]*?nodeCreateSerializer\(/.test(text),
      text,
    );
    // The read model keeps the read-only nodeId and its next stays Node.
    assert.isTrue(/interface Node\b[\s\S]*?readonly "?nodeId"?/.test(text), text);
  });
});
