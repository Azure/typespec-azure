import { ok, strictEqual } from "assert";
import { it } from "vitest";
import {
  createSdkContextForTester,
  SimpleTesterWithService,
} from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("replaces the generated method response without changing HTTP responses", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @error
    model Error {
      code: string;
    }

    model Widget {
      name: string;
    }

    @post op create(): Widget | Error;

    alias CustomizedCreate = replaceResponse(TestService.create, void);
    @@override(TestService.create, CustomizedCreate);
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.response.type, undefined);
  strictEqual(method.operation.responses.length, 1);
  const response = method.operation.responses[0];
  ok(response.type);
  strictEqual(response.type.kind, "model");
  strictEqual(response.type.name, "Widget");
  strictEqual(method.operation.exceptions.length, 1);
});

it("uses a different response type supplied by @override", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model Widget {
      name: string;
    }

    model DeleteResult {
      deleted: boolean;
    }

    @post op create(): Widget;

    op customizedCreate(): DeleteResult;
    @@override(TestService.create, TestService.customizedCreate);
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  ok(method.response.type);
  strictEqual(method.response.type.kind, "model");
  strictEqual(method.response.type.name, "DeleteResult");
  ok(method.operation.responses[0].type);
  strictEqual(method.operation.responses[0].type.name, "Widget");
});
