import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: metadata", () => {
  it("will expose create visibility properties on PATCH model using @requestVisibility", async () => {
    const res = await openApiFor(`
      model M {
        @visibility("read") r: string;
        @visibility("read", "create") rc?: string;
        @visibility("read", "update", "create") ruc?: string;
      }
      @parameterVisibility("create", "update")
      @route("/") @patch op createOrUpdate(...M): M; 
    `);

    const response = res.paths["/"].patch.responses["200"].schema;
    const request = res.paths["/"].patch.parameters[0].schema;

    deepStrictEqual(response, { $ref: "#/definitions/M" });
    deepStrictEqual(request, { $ref: "#/definitions/MCreateOrUpdate" });
    deepStrictEqual(res.definitions, {
      M: {
        type: "object",
        properties: {
          r: { type: "string", readOnly: true },
          rc: { type: "string", "x-ms-mutability": ["read", "create"] },
          ruc: { type: "string", "x-ms-mutability": ["read", "update", "create"] },
        },
        required: ["r"],
      },
      MCreateOrUpdate: {
        type: "object",
        properties: {
          rc: { type: "string", "x-ms-mutability": ["read", "create"] },
          ruc: { type: "string", "x-ms-mutability": ["read", "update", "create"] },
        },
      },
    });
  });

  it("will expose create visibility properties on PUT model", async () => {
    const res = await openApiFor(`
      model M {
        @visibility("read") r: string;
        @visibility("read", "create") rc?: string;
        @visibility("read", "update", "create") ruc?: string;
      }
      @route("/") @put op createOrUpdate(...M): M; 
    `);

    const response = res.paths["/"].put.responses["200"].schema;
    const request = res.paths["/"].put.parameters[0].schema;

    deepStrictEqual(response, { $ref: "#/definitions/M" });
    deepStrictEqual(request, { $ref: "#/definitions/M" });
    deepStrictEqual(res.definitions, {
      M: {
        type: "object",
        properties: {
          r: { type: "string", readOnly: true },
          rc: { type: "string", "x-ms-mutability": ["read", "create"] },
          ruc: { type: "string", "x-ms-mutability": ["read", "update", "create"] },
        },
        required: ["r"],
      },
    });
  });

  it("ensures properties are required for array updates", async () => {
    const res = await openApiFor(`
      model Person {
        @visibility("read") id: string;
        @visibility("create") secret: string;
        name: string;
      
        @visibility("read", "create")
        test: string;
      
        @visibility("read", "update")
        other: string;
      
        @visibility("read", "create", "update")
        relatives: PersonRelative[];
      }
      
      model PersonRelative {
        person: Person;
        relationship: string;
      }
      @route("/") @patch op update(...Person): Person; 
    `);

    const response = res.paths["/"].patch.responses["200"].schema;
    const request = res.paths["/"].patch.parameters[0].schema;

    deepStrictEqual(response, { $ref: "#/definitions/Person" });
    deepStrictEqual(request, { $ref: "#/definitions/PersonUpdate" });
    deepStrictEqual(res.definitions.PersonUpdate, {
      type: "object",
      properties: {
        name: { type: "string" },
        other: { type: "string", "x-ms-mutability": ["read", "update"] },
        relatives: {
          type: "array",
          "x-ms-identifiers": [],
          "x-ms-mutability": ["read", "update", "create"],
          items: { $ref: "#/definitions/PersonRelative" },
        },
      },
    });
    deepStrictEqual(res.definitions.PersonRelative, {
      type: "object",
      properties: {
        person: { $ref: "#/definitions/Person" },
        relationship: { type: "string" },
      },
      required: ["person", "relationship"],
    });
    deepStrictEqual(res.definitions.Person, {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
        other: { type: "string", "x-ms-mutability": ["read", "update"] },
        relatives: {
          type: "array",
          "x-ms-identifiers": [],
          "x-ms-mutability": ["read", "update", "create"],
          items: { $ref: "#/definitions/PersonRelative" },
        },
        secret: { type: "string", "x-ms-mutability": ["create"] },
        test: { type: "string", "x-ms-mutability": ["read", "create"] },
      },
      required: ["id", "secret", "name", "test", "other", "relatives"],
    });
  });

  it("can share read, update, create visibility via x-ms-mutability or readonly", async () => {
    const res = await openApiFor(`
    model M {
      @visibility("read") r?: string;
      @visibility("create") c?: string;
      @visibility("update") u?: string;
      @visibility("update", "create") uc?: string;
      @visibility("read", "update", "create") ruc?: string;
      
    }
    @route("/") @post op create(...M): M; 
  `);

    const request = res.paths["/"].post.parameters[0].schema;
    deepStrictEqual(request, { $ref: "#/definitions/M" });

    const response = res.paths["/"].post.responses["200"].schema;
    deepStrictEqual(response, { $ref: "#/definitions/M" });

    deepStrictEqual(res.definitions, {
      M: {
        type: "object",
        properties: {
          r: { type: "string", readOnly: true }, // x-ms-mutability: ["read"] not used when readOnly: true can suffice
          c: { type: "string", "x-ms-mutability": ["create"] },
          u: { type: "string", "x-ms-mutability": ["update"] },
          uc: { type: "string", "x-ms-mutability": ["update", "create"] },
          ruc: { type: "string", "x-ms-mutability": ["read", "update", "create"] },
        },
      },
    });
  });

  it("does not emit invisible, unshared readonly properties", async () => {
    const res = await openApiFor(`
    model M {
      @visibility("read") r?: string;
      @visibility("query") q?: string;
      @visibility("delete") d?: string;
    }
    @route("/") @get op get(...M): M; 
  `);

    const request = res.paths["/"].get.parameters[0].schema;
    deepStrictEqual(request, { $ref: "#/definitions/MQuery" });

    const response = res.paths["/"].get.responses["200"].schema;
    deepStrictEqual(response, { $ref: "#/definitions/M" });

    deepStrictEqual(res.definitions, {
      MQuery: {
        type: "object",
        properties: {
          q: { type: "string" },
        },
      },
      M: {
        type: "object",
        properties: {
          r: { type: "string", readOnly: true },
        },
      },
    });
  });

  it("bubbles up visibility changes to referencers", async () => {
    const res = await openApiFor(
      `
    model M {
      @visibility("read") r?: string;
      @visibility("create") c?: string;
      @visibility("update") u?: string;
      @visibility("delete") d?: string;
      @visibility("query") q?: string;
    }

    // base model
    model D extends M {}
    
    // property type
    model R {
      m?: M; 
    }
    // array element type
    model A {
      a?: M[];
    }

    @route("/M")
    interface IM {
      @get get(...M): M;
      @post create(...M): M;
      @put createOrUpdate(...M): M;
      @patch update(...M): M;
      @delete delete(...M): void; 
    }

    @route("/D")
    interface ID {
      @get get(...D): D;
      @post create(...D): D;
      @put createOrUpdate(...D): D;
      @patch update(...D): D;
      @delete delete(...D): void; 
    }
  
    @route("/R") 
    interface IR {
      @get op get(id: string): R;
      @post op create(...R): R;
      @put op createOrUpdate(...R): R;
      @patch op update(...R): R;
      @delete op delete(...D): void; 
    }

    `,
      undefined,
      { "omit-unreachable-types": true }
    );

    deepStrictEqual(res.definitions, {
      M: {
        type: "object",
        properties: {
          r: {
            type: "string",
            readOnly: true,
          },
          c: {
            type: "string",
            "x-ms-mutability": ["create"],
          },
          u: {
            type: "string",
            "x-ms-mutability": ["update"],
          },
        },
      },
      MDelete: {
        type: "object",
        properties: {
          d: {
            type: "string",
          },
        },
      },
      MQuery: {
        type: "object",
        properties: {
          q: {
            type: "string",
          },
        },
      },
      D: {
        type: "object",
        allOf: [
          {
            $ref: "#/definitions/M",
          },
        ],
      },
      DDelete: {
        type: "object",
        allOf: [
          {
            $ref: "#/definitions/MDelete",
          },
        ],
      },
      DQuery: {
        type: "object",
        allOf: [
          {
            $ref: "#/definitions/MQuery",
          },
        ],
      },
      R: {
        type: "object",
        properties: {
          m: {
            $ref: "#/definitions/M",
          },
        },
      },
    });
  });

  it("puts inapplicable metadata in schema", async () => {
    const res = await openApiFor(
      `
      model Parameters {
       @query q: string;
       @path p: string;
       @header h: string;
      }
      @route("/single") @get op single(...Parameters): string;
      @route("/batch") @get op batch(@bodyRoot body: Parameters[]): string;
      `
    );
    deepStrictEqual(res.paths, {
      "/single/{p}": {
        get: {
          operationId: "Single",
          parameters: [
            { $ref: "#/parameters/Parameters.q" },
            { $ref: "#/parameters/Parameters.p" },
            { $ref: "#/parameters/Parameters.h" },
          ],
          responses: {
            "200": {
              description: "The request has succeeded.",
              schema: { type: "string" },
            },
          },
        },
      },
      "/batch": {
        get: {
          operationId: "Batch",
          responses: {
            "200": {
              description: "The request has succeeded.",
              schema: { type: "string" },
            },
          },
          parameters: [
            {
              in: "body",
              name: "body",
              required: true,
              schema: {
                type: "array",
                items: { $ref: "#/definitions/Parameters" },
                "x-ms-identifiers": [],
              },
            },
          ],
        },
      },
    });
    deepStrictEqual(res.parameters, {
      "Parameters.q": {
        name: "q",
        in: "query",
        required: true,
        type: "string",
        "x-ms-parameter-location": "method",
      },
      "Parameters.p": {
        name: "p",
        in: "path",
        required: true,
        type: "string",
        "x-ms-parameter-location": "method",
      },
      "Parameters.h": {
        name: "h",
        in: "header",
        required: true,
        type: "string",
        "x-ms-parameter-location": "method",
      },
    });

    deepStrictEqual(res.definitions, {
      Parameters: {
        properties: {
          h: {
            type: "string",
          },
          p: {
            type: "string",
          },
          q: {
            type: "string",
          },
        },
        required: ["q", "p", "h"],
        type: "object",
      },
    });
  });

  it("uses item suffix if array element has inapplicable metadata and is used with more than one visibility.", async () => {
    const res = await openApiFor(
      `
      model Thing {
        @header etag: string;
        name: string;
        @visibility("delete") d: string;
      }
      @route("/") @post op createMultiple(...Thing): Thing[];
      `
    );

    const request = res.paths["/"].post.parameters[1].schema;
    deepStrictEqual(request, { $ref: "#/definitions/Thing" });

    const response = res.paths["/"].post.responses["200"].schema;
    deepStrictEqual(response, {
      type: "array",
      items: { $ref: "#/definitions/ThingItem" },
      "x-ms-identifiers": [],
    });

    deepStrictEqual(res.parameters, {
      "Thing.etag": {
        name: "etag",
        in: "header",
        required: true,
        type: "string",
        "x-ms-parameter-location": "method",
      },
    });

    deepStrictEqual(res.definitions, {
      Thing: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      },
      ThingItem: {
        type: "object",
        properties: {
          etag: { type: "string" },
          name: { type: "string" },
        },
        required: ["etag", "name"],
      },
    });
  });

  it("handles cycle in untransformed model", async () => {
    const res = await openApiFor(
      `
      model Thing {
       inner?: Thing;
      }
      @route("/") @get op get(): Thing;
      `
    );

    const response = res.paths["/"].get.responses["200"].schema;
    deepStrictEqual(response, { $ref: "#/definitions/Thing" });

    deepStrictEqual(res.definitions, {
      Thing: {
        type: "object",
        properties: {
          inner: {
            $ref: "#/definitions/Thing",
          },
        },
      },
    });
  });

  it("handles cycle in transformed model", async () => {
    const res = await openApiFor(
      `
      model Thing {
        @visibility("delete") d?: string;
        @visibility("query") q?: string;
        inner?: Thing;
      }

      @route("/") @get op get(...Thing): Thing;
      `
    );

    const request = res.paths["/"].get.parameters[0].schema;
    deepStrictEqual(request, { $ref: "#/definitions/ThingQuery" });

    const response = res.paths["/"].get.responses["200"].schema;
    deepStrictEqual(response, { $ref: "#/definitions/Thing" });

    deepStrictEqual(res.definitions, {
      Thing: {
        type: "object",
        properties: {
          inner: { $ref: "#/definitions/Thing" },
        },
      },
      ThingQuery: {
        type: "object",
        properties: {
          q: { type: "string" },
          inner: { $ref: "#/definitions/ThingQuery" },
        },
      },
    });
  });

  it("supports nested metadata and removes properties with @bodyIgnore ", async () => {
    const res = await openApiFor(
      `
      model Pet {
        @bodyIgnore  headers: {
          @header h1: string;
          moreHeaders: {
            @header h2: string;
          }
        };

        @path
        id: string;
        name: string;
      }
      
      @route("/pets")
      @post op create(...Pet): Pet;
      `
    );

    deepStrictEqual(res.paths, {
      "/pets/{id}": {
        post: {
          operationId: "Create",
          parameters: [
            {
              $ref: "#/parameters/Pet.id",
            },
            {
              name: "h1",
              in: "header",
              required: true,
              type: "string",
            },
            {
              name: "h2",
              in: "header",
              required: true,
              type: "string",
            },
            {
              name: "body",
              in: "body",
              schema: { $ref: "#/definitions/PetCreate" },
              required: true,
            },
          ],
          responses: {
            "200": {
              description: "The request has succeeded.",
              headers: {
                h1: {
                  type: "string",
                },
                h2: {
                  type: "string",
                },
              },
              schema: {
                $ref: "#/definitions/Pet",
              },
            },
          },
        },
      },
    });

    deepStrictEqual(res.definitions, {
      PetCreate: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
        required: ["name"],
      },
      Pet: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
        },
        required: ["id", "name"],
      },
    });
  });

  describe("body required", () => {
    it("implicit body is marked as required", async () => {
      const res = await openApiFor(
        `
      model Pet {
        name: string;
        age: int32;
      }
      op single(...Pet): void;
      `
      );
      strictEqual(res.paths["/"].post.parameters[0].required, true);
    });

    it("explicit body is marked as required if property is required", async () => {
      const res = await openApiFor(
        `
      model Pet {
        name: string;
        age: int32;
      }
      op single(@body pet: Pet): void;
      `
      );
      strictEqual(res.paths["/"].post.parameters[0].required, true);
    });

    it("explicit body is marked as optional if property is optional", async () => {
      const res = await openApiFor(
        `
      model Pet {
        name: string;
        age: int32;
      }
      op single(@body pet?: Pet): void;
      `
      );
      strictEqual(res.paths["/"].post.parameters[0].required, false);
    });
  });
});
