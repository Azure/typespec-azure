import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "./test-host.js";

it("chooses XML as the default consumes/produces when an API has only XML payloads", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model Payload {}

      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.consumes, ["application/xml"]);
  deepStrictEqual(openapi.produces, ["application/xml"]);

  deepStrictEqual(openapi.paths["/"].get.consumes, undefined);
  deepStrictEqual(openapi.paths["/"].get.produces, undefined);
});

it("chooses JSON and XML as the default consumes/produces when an API has JSON and XML payloads", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model JsonPayload {}
      model XmlPayload {}

      @route("/json")
      @get op getJson(
        @header contentType: "application/json",
        @body body: JsonPayload;
      ): {
        @header contentType: "application/json";
        @body body: JsonPayload;
      };

      @route("/xml")
      @get op getXml(
        @header contentType: "application/xml",
        @body body: XmlPayload;
      ): {
        @header contentType: "application/xml";
        @body body: XmlPayload;
      };
    `);

  deepStrictEqual(openapi.consumes, ["application/json", "application/xml"]);
  deepStrictEqual(openapi.produces, ["application/json", "application/xml"]);

  deepStrictEqual(openapi.paths["/json"].get.consumes, ["application/json"]);
  deepStrictEqual(openapi.paths["/json"].get.produces, ["application/json"]);
  deepStrictEqual(openapi.paths["/xml"].get.consumes, ["application/xml"]);
  deepStrictEqual(openapi.paths["/xml"].get.produces, ["application/xml"]);
});

it("applies XML name, namespace, and prefix to a model", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      @Xml.name("CustomName")
      @Xml.ns("http://example.com/ns", "ex")
      model Payload {
        @Xml.name("RenamedProperty")
        @Xml.ns("http://example.com/propns", "prop")
        property: string;
      }

      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.definitions["Payload"]["xml"], {
    name: "CustomName",
    namespace: "http://example.com/ns",
    prefix: "ex",
  });
  deepStrictEqual(openapi.definitions["Payload"].properties["RenamedProperty"].xml, {
    namespace: "http://example.com/propns",
    prefix: "prop",
  });
});

it("treats XMl name as secondary in property schemas when the spec is not only XML", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model Payload {
        @Xml.name("RenamedProperty")
        property: string;
      }

      @route("/json")
      @get op getJson(
        @header contentType: "application/json",
        @body body: Payload;
      ): {
        @header contentType: "application/json";
        @body body: Payload;
      };

      @route("/xml")
      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.definitions["Payload"].properties["property"].xml, {
    name: "RenamedProperty",
  });
});

it("wraps XML arrays by default", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model Payload {
        items: string[];
      }

      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.definitions["Payload"].properties["items"].xml, {
    wrapped: true,
  });
});

it("can unwrap XML arrays", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model Payload {
        @Xml.unwrapped
        items: string[];
      }

      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.definitions["Payload"].properties["items"].xml, {
    wrapped: false,
  });
});

it("can mark a property as XML text using x-ms-text", async () => {
  const openapi = await openApiFor(`
      @service(#{title: "My Service"})
      namespace Foo;

      model Payload {
        @Xml.unwrapped
        content?: string;
      }

      @get op getXml(
        @header contentType: "application/xml",
        @body body: Payload;
      ): {
        @header contentType: "application/xml";
        @body body: Payload;
      };
    `);

  deepStrictEqual(openapi.definitions["Payload"].properties["content"].xml["x-ms-text"], true);
});
