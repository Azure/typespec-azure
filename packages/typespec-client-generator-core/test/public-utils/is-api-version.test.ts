import { ignoreDiagnostics, Operation } from "@typespec/compiler";
import { getHttpOperation, getServers } from "@typespec/http";
import { ok } from "assert";
import { beforeEach, it } from "vitest";
import { isApiVersion } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { getServiceNamespace } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("is api version query", async () => {
  const { func } = (await runner.compile(`
    @test op func(@query("api-version") myApiVersion: string): void;
  `)) as { func: Operation };

  const queryParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(runner.context, queryParam.param));
});

it("is api version path", async () => {
  const { func } = (await runner.compile(`
    @test op func(@path apiVersion: string): void;
  `)) as { func: Operation };

  const pathParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(runner.context, pathParam.param));
});

it("not api version param", async () => {
  const { func } = (await runner.compile(`
    @test op func(@path foo: string): void;
  `)) as { func: Operation };

  const pathParam = ignoreDiagnostics(getHttpOperation(runner.context.program, func)).parameters
    .parameters[0];
  ok(!isApiVersion(runner.context, pathParam.param));
});

it("api version in host param", async () => {
  await runner.compile(`
    @service(#{
      title: "ApiVersion",
    })
    @server(
      "{endpoint}/{ApiVersion}",
      "Api Version",
      {
        endpoint: string,

        @doc("Api Version")
        @path
        ApiVersion: APIVersions,
      }
    )
    namespace MyService;
    enum APIVersions {
      v1_0: "v1.0",
    }
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const server = getServers(runner.context.program, serviceNamespace)?.[0];
  const hostParam = server?.parameters.get("ApiVersion");

  ok(hostParam && isApiVersion(runner.context, hostParam));
});

it("api version in host param with versioning", async () => {
  await runner.compile(`
    @service
    @versioned(Versions)
    @server(
      "{endpoint}/test/api-version:{version}",
      "Testserver endpoint",
      {
        endpoint: url,
        version: Versions,
      }
    )
    namespace Test;

    enum Versions {
      v1: "v1",
      v2: "v2",
    }
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const server = getServers(runner.context.program, serviceNamespace)?.[0];
  const hostParam = server?.parameters.get("version");

  ok(hostParam && isApiVersion(runner.context, hostParam));
});
