import { XmlTestLibrary } from "@typespec/xml/testing";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});

it("default input json serialization option", async function () {
  await runner.compileWithBuiltInService(`
    model Blob {
      id: string;
    }

    op test(@body body: Blob): void;
  `);
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].serializationOptions.json?.name, "Blob");
  strictEqual(models[0].properties[0].kind, "property");
  strictEqual(models[0].properties[0].serializationOptions.json?.name, "id");
});

it("default output json serialization option", async function () {
  await runner.compileWithBuiltInService(`
    model Blob {
      id: string;
    }

    op test(): Blob;
  `);
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].serializationOptions.json?.name, "Blob");
  strictEqual(models[0].properties[0].kind, "property");
  strictEqual(models[0].properties[0].serializationOptions.json?.name, "id");
});

it("json serialization with @encodedName", async () => {
  await runner.compileWithBuiltInService(`
    model Blob {
      @encodedName("application/json", "newId")
      id: string;
    }

    op test(): Blob;
  `);
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].serializationOptions.json?.name, "Blob");
  strictEqual(models[0].properties[0].kind, "property");
  strictEqual(models[0].properties[0].serializationOptions.json?.name, "newId");
});

it("@attribute", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Blob {
      @attribute id: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Blob};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "Blob");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "id");
  strictEqual(model.properties[0].serializationOptions.xml?.attribute, true);
});

it("@name", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @name("XmlBook")
    model Book {
      @name("XmlId") id: string;
      content: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Book};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlBook");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "XmlId");
});

it("xml operation with mixed explicit and default property names", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Container {
      @Xml.name("XmlId")
      id: string;
      value: string;
      @encodedName("application/xml", "XmlContent")
      content: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Container};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "Container");

  // Property with @Xml.name gets the explicit name
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "XmlId");

  // Property without any xml decorator gets the property name as xml name
  strictEqual(model.properties[1].kind, "property");
  strictEqual(model.properties[1].serializationOptions.xml?.name, "value");

  // Property with @encodedName gets the encoded name
  strictEqual(model.properties[2].kind, "property");
  strictEqual(model.properties[2].serializationOptions.xml?.name, "XmlContent");
});

it("xml operation model without any xml decorators uses default names", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Container {
      id: string;
      value: string;
      content: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Container};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  // Model without any xml decorator gets the model name as xml name
  strictEqual(model.serializationOptions.xml?.name, "Container");

  // All properties without any xml decorator get property names as xml names
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "id");

  strictEqual(model.properties[1].kind, "property");
  strictEqual(model.properties[1].serializationOptions.xml?.name, "value");

  strictEqual(model.properties[2].kind, "property");
  strictEqual(model.properties[2].serializationOptions.xml?.name, "content");
});

it("@ns", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @ns("https://example.com/ns1", "ns1")
    model Foo {
      @ns("https://example.com/ns1", "ns1")
      bar1: string;
    
      @ns("https://example.com/ns2", "ns2")
      bar2: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Foo};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.ns?.namespace, "https://example.com/ns1");
  strictEqual(model.serializationOptions.xml?.ns?.prefix, "ns1");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(
    model.properties[0].serializationOptions.xml?.ns?.namespace,
    "https://example.com/ns1",
  );
  strictEqual(model.properties[0].serializationOptions.xml?.ns?.prefix, "ns1");
  strictEqual(model.properties[1].kind, "property");
  strictEqual(
    model.properties[1].serializationOptions.xml?.ns?.namespace,
    "https://example.com/ns2",
  );
  strictEqual(model.properties[1].serializationOptions.xml?.ns?.prefix, "ns2");
});

it("@nsDeclarations", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @Xml.nsDeclarations
    enum Namespaces {
      ns1: "https://example.com/ns1",
      ns2: "https://example.com/ns2",
    }
    
    @Xml.ns(Namespaces.ns1)
    model Foo {
      @Xml.ns(Namespaces.ns1)
      bar1: string;
    
      @Xml.ns(Namespaces.ns2)
      bar2: string;
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Foo};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.ns?.namespace, "https://example.com/ns1");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(
    model.properties[0].serializationOptions.xml?.ns?.namespace,
    "https://example.com/ns1",
  );
  strictEqual(model.properties[1].kind, "property");
  strictEqual(
    model.properties[1].serializationOptions.xml?.ns?.namespace,
    "https://example.com/ns2",
  );
});

it("@unwrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Pet {
      @unwrapped tags: string[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
});

it("array of primitive types unwrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      tags: string[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "tags");
});

it("array of primitive types unwrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      @encodedName("application/xml", "ItemsTags")
      tags: string[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "ItemsTags");
});

it("array of primitive types wrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      tags: string[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "string");
});

it("array of primitive types wrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @encodedName("application/xml", "ItemsTags")
      tags: string[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "string");
});

it("array of scalar types unwrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    scalar tag extends string;

    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      tags: tag[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "tags");
});

it("array of scalar types unwrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    scalar tag extends string;

    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      @encodedName("application/xml", "ItemsTags")
      tags: tag[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "ItemsTags");
});

it("array of scalar types wrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    scalar tag extends string;

    @encodedName("application/xml", "XmlPet")
    model Pet {
      tags: tag[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "tag");
});

it("array of scalar types wrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "ItemsName")
    scalar tag extends string;

    @encodedName("application/xml", "XmlPet")
    model Pet {
      @encodedName("application/xml", "ItemsTags")
      tags: tag[];
    }

    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "ItemsName");
});

it("array of complex type unwrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      tags: Tag[];
    }

    @encodedName("application/xml", "XmlTag")
    model Tag {
      name: string;
    }
      
    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "tags");
});

it("array of complex type unwrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @Xml.unwrapped
      @encodedName("application/xml", "ItemsTag")
      tags: Tag[];
    }

    @encodedName("application/xml", "XmlTag")
    model Tag {
      name: string;
    }
      
    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTag");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "ItemsTag");
});

it("array of complex type wrapped", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      tags: Tag[];
    }

    model Tag {
      name: string;
    }
      
    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "tags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "Tag");
});

it("array of complex type wrapped with rename", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlPet")
    model Pet {
      @encodedName("application/xml", "ItemsTags")
      tags: Tag[];
    }

    @encodedName("application/xml", "XmlTag")
    model Tag {
      name: string;
    }
      
    op test(): {@header("content-type") contentType: "application/xml"; @body body: Pet};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlPet");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "ItemsTags");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, false);
  strictEqual(model.properties[0].serializationOptions.xml?.itemsName, "XmlTag");
});

it("orphan model with xml serialization", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output)
    @encodedName("application/xml", "XmlTag")
    model Tag {
      @Xml.name("XmlName")
      name: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlTag");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "XmlName");
});

it("orphan model xml property without explicit @Xml.name uses property name", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output)
    @encodedName("application/xml", "XmlTag")
    model Tag {
      value: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlTag");
  strictEqual(model.properties[0].kind, "property");
  // Property without @Xml.name should still get xml serialization options with property name as xml name
  strictEqual(model.properties[0].serializationOptions.xml?.name, "value");
});

it("orphan model xml with mixed explicit and default property names", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output)
    @encodedName("application/xml", "XmlContainer")
    model Container {
      @Xml.name("XmlId")
      id: string;
      value: string;
      @encodedName("application/xml", "XmlContent")
      content: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlContainer");

  // Property with @Xml.name gets the explicit name
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "XmlId");

  // Property without any xml decorator gets the property name as xml name
  strictEqual(model.properties[1].kind, "property");
  strictEqual(model.properties[1].serializationOptions.xml?.name, "value");

  // Property with @encodedName gets the encoded name
  strictEqual(model.properties[2].kind, "property");
  strictEqual(model.properties[2].serializationOptions.xml?.name, "XmlContent");
});

it("orphan model with json serialization", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output)
    model Tag {
      @encodedName("application/json", "rename")
      name: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.json?.name, "rename");
});

it("@unwrapped for string property", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output)
    model BlobName {
      @unwrapped content: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "content");
  strictEqual(model.properties[0].serializationOptions.xml?.unwrapped, true);
});

it("different xml content type", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @encodedName("application/xml", "XmlTag")
    model Tag {
      @Xml.name("XmlName")
      name: string;
    }

    op test(): {@header("content-type") contentType: "text/xml; charset=utf-8"; @body body: Tag};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.serializationOptions.xml?.name, "XmlTag");
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "XmlName");
});

it("different json content type", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Tag {
      @encodedName("application/json", "rename")
      name: string;
    }

    op test(): {@header("content-type") contentType: "application/json; serialization=json"; @body body: Tag};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.json?.name, "rename");
});

it("model used in both json and xml operations gets both serialization options", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    model Container {
      @encodedName("application/json", "jsonId")
      @encodedName("application/xml", "xmlId")
      id: string;
      value: string;
    }

    op jsonOp(@body body: Container): void;
    op xmlOp(): {@header("content-type") contentType: "application/xml"; @body body: Container};
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];

  // Model gets both json and xml serialization options
  strictEqual(model.serializationOptions.json?.name, "Container");
  strictEqual(model.serializationOptions.xml?.name, "Container");

  // Property with both @encodedName decorators gets different names for json and xml
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.json?.name, "jsonId");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "xmlId");

  // Property without decorators gets property name as both json and xml names
  strictEqual(model.properties[1].kind, "property");
  strictEqual(model.properties[1].serializationOptions.json?.name, "value");
  strictEqual(model.properties[1].serializationOptions.xml?.name, "value");
});

it("orphan model with both json and xml usage gets both serialization options", async function () {
  runner = await createSdkTestRunner({
    librariesToAdd: [XmlTestLibrary],
    autoUsings: ["TypeSpec.Xml"],
  });

  await runner.compileWithBuiltInService(`
    @usage(Usage.input | Usage.output | Usage.json | Usage.xml)
    model Container {
      @encodedName("application/json", "jsonId")
      @encodedName("application/xml", "xmlId")
      id: string;
      value: string;
    }
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];

  // Orphan model with both usages gets both json and xml serialization options
  strictEqual(model.serializationOptions.json?.name, "Container");
  strictEqual(model.serializationOptions.xml?.name, "Container");

  // Property with both @encodedName decorators gets different names for json and xml
  strictEqual(model.properties[0].kind, "property");
  strictEqual(model.properties[0].serializationOptions.json?.name, "jsonId");
  strictEqual(model.properties[0].serializationOptions.xml?.name, "xmlId");

  // Property without decorators gets property name as both json and xml names
  strictEqual(model.properties[1].kind, "property");
  strictEqual(model.properties[1].serializationOptions.json?.name, "value");
  strictEqual(model.properties[1].serializationOptions.xml?.name, "value");
});
