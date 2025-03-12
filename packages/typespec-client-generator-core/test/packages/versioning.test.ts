import { Interface } from "@typespec/compiler";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getClient,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "../../src/decorators.js";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkMethodResponse,
  UsageFlags,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

describe("versioning", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("basic default version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }

  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }

  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;

  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
  `);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v3");

    strictEqual(sdkPackage.clients[0].methods.length, 3);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
    const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
    ok(get);
    deepStrictEqual(get.apiVersions, ["v2", "v3"]);
    const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
    ok(test);
    deepStrictEqual(test.apiVersions, ["v2", "v3"]);
    const returnValue = test.response;
    ok(returnValue);
    strictEqual((returnValue as SdkMethodResponse).type, undefined);
    strictEqual(sdkPackage.models.length, 2);
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
    const description = widget?.properties.find((x) => x.name === "description");
    ok(description);
    deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
    strictEqual(description.optional, true);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
    strictEqual(sdkPackage.enums.length, 1);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1", "v2", "v3"],
    );
  });

  it("basic latest version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "latest",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }

  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }

  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;

  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
  `);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v3");

    strictEqual(sdkPackage.clients[0].methods.length, 3);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
    const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
    ok(get);
    deepStrictEqual(get.apiVersions, ["v2", "v3"]);
    const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
    ok(test);
    deepStrictEqual(test.apiVersions, ["v2", "v3"]);
    const returnValue = test.response;
    ok(returnValue);
    strictEqual((returnValue as SdkMethodResponse).type, undefined);
    strictEqual(sdkPackage.models.length, 2);
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
    const description = widget?.properties.find((x) => x.name === "description");
    ok(description);
    deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
    strictEqual(description.optional, true);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1", "v2", "v3"],
    );
  });

  it("basic v3 version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "v3",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }

  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }

  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;

  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
  `);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v3");

    strictEqual(sdkPackage.clients[0].methods.length, 3);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
    const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
    ok(get);
    deepStrictEqual(get.apiVersions, ["v2", "v3"]);
    const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
    ok(test);
    deepStrictEqual(test.apiVersions, ["v2", "v3"]);
    const returnValue = test.response;
    ok(returnValue);
    strictEqual((returnValue as SdkMethodResponse).type, undefined);
    strictEqual(sdkPackage.models.length, 2);
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
    const description = widget?.properties.find((x) => x.name === "description");
    ok(description);
    deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
    strictEqual(description.optional, true);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1", "v2", "v3"],
    );
  });

  it("basic v2 version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "v2",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }

  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }

  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;

  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
  `);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v2");

    strictEqual(sdkPackage.clients[0].methods.length, 3);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1", "v2"]);
    const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
    ok(get);
    deepStrictEqual(get.apiVersions, ["v2"]);
    const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
    ok(test);
    deepStrictEqual(test.apiVersions, ["v2"]);
    const returnValue = test.response;
    ok(returnValue);
    strictEqual((returnValue as SdkMethodResponse).type?.kind, "model");
    strictEqual(sdkPackage.models.length, 3);
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1", "v2"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1", "v2"]);
    const name = widget?.properties.find((x) => x.name === "name");
    ok(name);
    deepStrictEqual(name.apiVersions, ["v1", "v2"]);
    strictEqual(name.optional, false);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1", "v2"]);
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
    deepStrictEqual(testModel.apiVersions, ["v2"]);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1", "v2"],
    );
  });

  it("basic v1 version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "v1",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }

  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }

  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;

  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
`);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v1");

    strictEqual(sdkPackage.clients[0].methods.length, 1);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1"]);
    strictEqual(sdkPackage.models.length, 2);
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1"]);
    const name = widget?.properties.find((x) => x.name === "name");
    ok(name);
    deepStrictEqual(name.apiVersions, ["v1"]);
    strictEqual(name.optional, false);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1"]);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1"],
    );
  });

  it("basic all version", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "all",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(`
  @service(#{
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  
  enum Versions {
    v1,
    v2,
    v3,
  }
  
  @error
  model Error {
    code: string;
    message?: string;
  }
  
  model Widget {
    @key
    @typeChangedFrom(Versions.v3, string)
    id: int32;
  
    @renamedFrom(Versions.v3, "name")
    @madeOptional(Versions.v3)
    description?: string;
  }
  @added(Versions.v2)
  @removed(Versions.v3)
  model Test {
    prop1: string;
  }
  @route("/test")
  @added(Versions.v2)
  @returnTypeChangedFrom(Versions.v3, Test)
  op test(): void | Error;
  op list(@query apiVersion: string): Widget[] | Error;
  
  @added(Versions.v2)
  @route("/widget/{id}")
  op get(...Resource.KeysOf<Widget>): Widget | Error;
`);

    const sdkPackage = runnerWithVersion.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionParam);
    strictEqual(apiVersionParam.clientDefaultValue, "v3");

    strictEqual(sdkPackage.clients[0].methods.length, 3);
    const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(list);
    deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
    const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
    ok(get);
    deepStrictEqual(get.apiVersions, ["v2", "v3"]);
    const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
    ok(test);
    deepStrictEqual(test.apiVersions, ["v2", "v3"]);
    const returnValue = test.response;
    ok(returnValue);
    strictEqual((returnValue as SdkMethodResponse).type, undefined);
    strictEqual(sdkPackage.models.length, 2); // TODO: since Test model has no usage, we could not get it, need to fix
    const widget = sdkPackage.models.find((x) => x.name === "Widget");
    ok(widget);
    deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
    strictEqual(widget?.properties.length, 2);
    const id = widget?.properties.find((x) => x.name === "id");
    ok(id);
    deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
    const description = widget?.properties.find((x) => x.name === "description");
    ok(description);
    deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
    strictEqual(description.optional, true);
    const error = sdkPackage.models.find((x) => x.name === "Error");
    ok(error);
    deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
    // const testModel = sdkPackage.models.find(x => x.name === "Test");
    // ok(testModel);
    // deepStrictEqual(testModel.apiVersions, ["v2"]);
    const versions = sdkPackage.enums.find((x) => x.name === "Versions");
    ok(versions);
    deepStrictEqual(
      versions.values.map((v) => v.value),
      ["v1", "v2", "v3"],
    );
  });

  it("define own api version param", async () => {
    await runner.compileWithBuiltInService(`
    model ApiVersionParam {
      @header apiVersion: Versions;
    }

    enum Versions {
      v1, v2
    }

    op getPet(...ApiVersionParam): void;
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.operation.parameters.length, 1);
    const apiVersionParam = method.operation.parameters[0];
    strictEqual(apiVersionParam.kind, "header");
    strictEqual(apiVersionParam.serializedName, "api-version");
    strictEqual(apiVersionParam.name, "apiVersion");
    strictEqual(apiVersionParam.onClient, false);
    strictEqual(apiVersionParam.isApiVersionParam, true);
  });

  it("default api version for interface extends", async () => {
    await runner.compile(`
      namespace Azure.ResourceManager {
        interface Operations {
          @get
          list(@query "api-version": string): void;
        }
      }
      
      @service
      @versioned(Versions)
      namespace Test {
        enum Versions {
          v1,
          v2,
        }
      
        interface Operations extends Azure.ResourceManager.Operations {}
      }      
    `);

    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
    const apiVersionClientParam = client.initialization.properties.find((x) => x.isApiVersionParam);
    ok(apiVersionClientParam);
    strictEqual(apiVersionClientParam.clientDefaultValue, "v2");

    const method = client.methods[0];
    strictEqual(method.parameters.length, 0);
    strictEqual(method.kind, "basic");

    const apiVersionOpParam = method.operation.parameters.find((x) => x.isApiVersionParam);
    ok(apiVersionOpParam);
    strictEqual(apiVersionOpParam.clientDefaultValue, "v2");
    strictEqual(apiVersionOpParam.correspondingMethodParams[0], apiVersionClientParam);
  });

  it("default api version for operation is", async () => {
    await runner.compile(`
      namespace Azure.ResourceManager {
        interface Operations {
          @get
          list(@query "api-version": string): void;
        }
      }
      
      @service
      @versioned(Versions)
      namespace Test {
        enum Versions {
          v1,
          v2,
        }
      
        op list is Azure.ResourceManager.Operations.list;
      }      
    `);

    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    const method = client.methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 0); // api-version will be on the client
    strictEqual(method.operation.parameters.length, 1);
    const apiVersionParam = method.operation.parameters[0];
    strictEqual(apiVersionParam.isApiVersionParam, true);
    strictEqual(apiVersionParam.clientDefaultValue, "v2");
    strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
    const clientApiVersionParam = client.initialization.properties.find((x) => x.isApiVersionParam);
    ok(clientApiVersionParam);
    strictEqual(apiVersionParam.correspondingMethodParams[0], clientApiVersionParam);
    strictEqual(clientApiVersionParam.clientDefaultValue, "v2");
  });
  it("add method", async () => {
    await runner.compileWithVersionedService(`
    @route("/v1")
    @post
    @added(Versions.v2)
    op v2(@header headerV2: string): void;
    `);

    const sdkPackage = runner.context.sdkPackage;
    deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.kind, "basic");
    deepStrictEqual(method.apiVersions, ["v2"]);
    strictEqual(method.parameters.length, 1);
    const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
    strictEqual(methodParam.name, "headerV2");
    strictEqual(methodParam.kind, "method");
    deepStrictEqual(methodParam.apiVersions, ["v2"]);

    strictEqual(method.operation.parameters.length, 1);
    const headerParam = method.operation.parameters[0];
    strictEqual(headerParam.name, "headerV2");
    strictEqual(headerParam.kind, "header");
    deepStrictEqual(headerParam.apiVersions, ["v2"]);
  });
  it("add parameter", async () => {
    await runner.compileWithVersionedService(`
    @route("/v1")
    @post
    op v1(@added(Versions.v2) @header headerV2: string): void;
    `);

    const sdkPackage = runner.context.sdkPackage;
    deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.kind, "basic");
    deepStrictEqual(method.apiVersions, ["v1", "v2"]);
    strictEqual(method.parameters.length, 1);
    const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
    strictEqual(methodParam.name, "headerV2");
    strictEqual(methodParam.kind, "method");
    deepStrictEqual(methodParam.apiVersions, ["v2"]);

    strictEqual(method.operation.parameters.length, 1);
    const headerParam = method.operation.parameters[0];
    strictEqual(headerParam.name, "headerV2");
    strictEqual(headerParam.kind, "header");
    deepStrictEqual(headerParam.apiVersions, ["v2"]);
  });

  it("model only used in new version", async () => {
    const tsp = `
    @service(#{
      title: "Contoso Widget Manager",
    })
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;
    
    enum Versions {
      v2023_11_01_preview: "2023-11-01-preview",
      v2023_11_01: "2023-11-01",
    }
    
    model PreviewModel {
      betaFeature: string;
    }
    
    model StableModel {
      stableFeature: string;
    }
    
    @added(Versions.v2023_11_01_preview)
    @removed(Versions.v2023_11_01)
    @route("/preview")
    op previewFunctionality(...PreviewModel): void;
    
    @route("/stable")
    op stableFunctionality(...StableModel): void;
  `;

    let runnerWithVersion = await createSdkTestRunner({
      "api-version": "2023-11-01-preview",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);

    strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
    strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 2);
    strictEqual(
      runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
      "previewFunctionality",
    );
    strictEqual(
      runnerWithVersion.context.sdkPackage.clients[0].methods[1].name,
      "stableFunctionality",
    );
    strictEqual(runnerWithVersion.context.sdkPackage.models.length, 2);
    strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "PreviewModel");
    strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
    strictEqual(runnerWithVersion.context.sdkPackage.models[1].name, "StableModel");
    strictEqual(runnerWithVersion.context.sdkPackage.models[1].access, "internal");

    runnerWithVersion = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);

    strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
    strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 1);
    strictEqual(
      runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
      "stableFunctionality",
    );
    strictEqual(runnerWithVersion.context.sdkPackage.models.length, 1);
    strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "StableModel");
    strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
    strictEqual(
      runnerWithVersion.context.sdkPackage.models[0].usage,
      UsageFlags.Spread | UsageFlags.Json,
    );
  });
  it("add client", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        endpoint: url,
      }
    )
    namespace Versioning;
    enum Versions {
      v1: "v1",
      v2: "v2",
    }
    op test(): void;

    @added(Versions.v2)
    @route("/interface-v2")
    interface InterfaceV2 {
      @post
      @route("/v2")
      test2(): void;
    }
    `,
    );
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);
    const versioningClient = sdkPackage.clients.find((x) => x.name === "VersioningClient");
    ok(versioningClient);
    strictEqual(versioningClient.methods.length, 2);

    strictEqual(versioningClient.initialization.properties.length, 1);
    const versioningClientEndpoint = versioningClient.initialization.properties.find(
      (x) => x.kind === "endpoint",
    );
    ok(versioningClientEndpoint);
    deepStrictEqual(versioningClientEndpoint.apiVersions, ["v1", "v2"]);

    const serviceMethod = versioningClient.methods.find((x) => x.kind === "basic");
    ok(serviceMethod);
    strictEqual(serviceMethod.name, "test");
    deepStrictEqual(serviceMethod.apiVersions, ["v1", "v2"]);

    const clientAccessor = versioningClient.methods.find((x) => x.kind === "clientaccessor");
    ok(clientAccessor);
    strictEqual(clientAccessor.name, "getInterfaceV2");
    deepStrictEqual(clientAccessor.apiVersions, ["v2"]);

    const interfaceV2 = versioningClient.methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
    ok(interfaceV2);
    strictEqual(interfaceV2.methods.length, 1);

    strictEqual(interfaceV2.initialization.properties.length, 1);
    const interfaceV2Endpoint = interfaceV2.initialization.properties.find(
      (x) => x.kind === "endpoint",
    );
    ok(interfaceV2Endpoint);
    deepStrictEqual(interfaceV2Endpoint.apiVersions, ["v2"]);

    strictEqual(interfaceV2.methods.length, 1);
    const test2Method = interfaceV2.methods.find((x) => x.kind === "basic");
    ok(test2Method);
    strictEqual(test2Method.name, "test2");
    deepStrictEqual(test2Method.apiVersions, ["v2"]);
  });
  it("default latest GA version with preview", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        endpoint: url,
      }
    )
    namespace Versioning;
    enum Versions {
      v2022_10_01_preview: "2022-10-01-preview",
      v2024_10_01: "2024-10-01",
    }
    op test(): void;

    @route("/interface-v2")
    interface InterfaceV2 {
      @post
      @route("/v2")
      test2(): void;
    }
    `,
    );
    const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
    strictEqual(sdkVersionsEnum.name, "Versions");
    strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
    strictEqual(sdkVersionsEnum.values.length, 1);
    strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
  });
  it("default latest preview version with GA", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        endpoint: url,
      }
    )
    namespace Versioning;
    enum Versions {
      v2024_10_01: "2024-10-01",
      v2024_11_01_preview: "2024-11-01-preview",
    }
    op test(): void;

    @route("/interface-v2")
    interface InterfaceV2 {
      @post
      @route("/v2")
      test2(): void;
    }
    `,
    );
    const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
    strictEqual(sdkVersionsEnum.name, "Versions");
    strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
    strictEqual(sdkVersionsEnum.values.length, 2);
    strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
    strictEqual(sdkVersionsEnum.values[1].value, "2024-11-01-preview");
  });

  it("specify api version with preview filter", async () => {
    const runnerWithVersion = await createSdkTestRunner({
      "api-version": "2024-10-01",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(
      `
    @service
    @versioned(Versions)
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        endpoint: url,
      }
    )
    namespace Versioning;
    enum Versions {
      v2023_10_01: "2023-10-01",
      v2023_11_01_preview: "2023-11-01-preview",
      v2024_10_01: "2024-10-01",
      v2024_11_01_preview: "2024-11-01-preview",
    }
    op test(): void;

    @route("/interface-v2")
    interface InterfaceV2 {
      @post
      @route("/v2")
      test2(): void;
    }
    `,
    );
    const sdkVersionsEnum = runnerWithVersion.context.sdkPackage.enums[0];
    strictEqual(sdkVersionsEnum.name, "Versions");
    strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
    strictEqual(sdkVersionsEnum.values.length, 2);
    strictEqual(sdkVersionsEnum.values[0].value, "2023-10-01");
    strictEqual(sdkVersionsEnum.values[1].value, "2024-10-01");
  });
});

describe("versioning impact for apis", () => {
  it("multiple clients", async () => {
    const tsp = `
    @service(#{
      title: "Contoso Widget Manager",
    })
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;
    
    enum Versions {
      v1,
      v2,
      v3,
    }
    
    @client({name: "AClient"})
    @test
    interface A {
      @route("/aa")
      op aa(): void;

      @added(Versions.v2)
      @removed(Versions.v3)
      @route("/ab")
      op ab(): void;
    }

    @client({name: "BClient"})
    @added(Versions.v2)
    @test
    interface B {
      @route("/ba")
      op ba(): void;

      @route("/bb")
      op bb(): void;
    }
  `;

    let runnerWithVersion = await createSdkTestRunner({
      "api-version": "v1",
      emitterName: "@azure-tools/typespec-python",
    });

    let { A, B } = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
    ok(getClient(runnerWithVersion.context, A));
    strictEqual(getClient(runnerWithVersion.context, B), undefined);

    let clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 1);
    let aClient = clients.find((x) => x.name === "AClient");
    ok(aClient);
    let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
    strictEqual(aOps.length, 1);
    let aa = aOps.find((x) => x.name === "aa");
    ok(aa);

    runnerWithVersion = await createSdkTestRunner({
      "api-version": "v2",
      emitterName: "@azure-tools/typespec-python",
    });

    let result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
    A = result.A;
    B = result.B;
    ok(getClient(runnerWithVersion.context, A));
    ok(getClient(runnerWithVersion.context, B));

    clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 2);
    aClient = clients.find((x) => x.name === "AClient");
    ok(aClient);
    aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
    strictEqual(aOps.length, 2);
    aa = aOps.find((x) => x.name === "aa");
    ok(aa);
    const ab = aOps.find((x) => x.name === "ab");
    ok(ab);
    let bClient = clients.find((x) => x.name === "BClient");
    ok(bClient);
    let bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
    strictEqual(bOps.length, 2);
    let ba = bOps.find((x) => x.name === "ba");
    ok(ba);
    let bb = bOps.find((x) => x.name === "bb");
    ok(bb);

    runnerWithVersion = await createSdkTestRunner({
      "api-version": "v3",
      emitterName: "@azure-tools/typespec-python",
    });

    result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
    A = result.A;
    B = result.B;
    ok(getClient(runnerWithVersion.context, A));
    ok(getClient(runnerWithVersion.context, B));

    clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 2);
    aClient = clients.find((x) => x.name === "AClient");
    ok(aClient);
    aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
    strictEqual(aOps.length, 1);
    aa = aOps.find((x) => x.name === "aa");
    ok(aa);
    bClient = clients.find((x) => x.name === "BClient");
    ok(bClient);
    bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
    strictEqual(bOps.length, 2);
    ba = bOps.find((x) => x.name === "ba");
    ok(ba);
    bb = bOps.find((x) => x.name === "bb");
    ok(bb);
  });

  it("multiple operation groups", async () => {
    const tsp = `
    @service(#{
      title: "Contoso Widget Manager",
    })
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;
    
    enum Versions {
      v1,
      v2,
      v3,
    }
    
    namespace A {
      @route("/a")
      op a(): void;
    }

    @added(Versions.v2)
    @removed(Versions.v3)
    interface B {
      @route("/b")
      op b(): void;
    }
  `;

    let runnerWithVersion = await createSdkTestRunner({
      "api-version": "v1",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);

    let clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 1);
    let client = clients.find((x) => x.name === "WidgetManagerClient");
    ok(client);
    let ops = listOperationGroups(runnerWithVersion.context, client);
    strictEqual(ops.length, 1);
    let aOp = ops.find((x) => x.type.name === "A");
    ok(aOp);
    let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
    strictEqual(aOps.length, 1);
    let a = aOps.find((x) => x.name === "a");
    ok(a);

    runnerWithVersion = await createSdkTestRunner({
      "api-version": "v2",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);

    clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 1);
    client = clients.find((x) => x.name === "WidgetManagerClient");
    ok(client);
    ops = listOperationGroups(runnerWithVersion.context, client);
    strictEqual(ops.length, 2);
    aOp = ops.find((x) => x.type.name === "A");
    ok(aOp);
    aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
    strictEqual(aOps.length, 1);
    a = aOps.find((x) => x.name === "a");
    ok(a);
    const bOp = ops.find((x) => x.type.name === "B");
    ok(bOp);
    const bOps = listOperationsInOperationGroup(runnerWithVersion.context, bOp);
    strictEqual(bOps.length, 1);
    const b = bOps.find((x) => x.name === "b");
    ok(b);

    runnerWithVersion = await createSdkTestRunner({
      "api-version": "v3",
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);

    clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 1);
    client = clients.find((x) => x.name === "WidgetManagerClient");
    ok(client);
    ops = listOperationGroups(runnerWithVersion.context, client);
    strictEqual(ops.length, 1);
    aOp = ops.find((x) => x.type.name === "A");
    ok(aOp);
    aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
    strictEqual(aOps.length, 1);
    a = aOps.find((x) => x.name === "a");
    ok(a);
  });
});
