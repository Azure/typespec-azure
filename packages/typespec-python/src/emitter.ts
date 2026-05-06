import { EmitContext } from "@typespec/compiler";
import { $onEmit as httpClientPythonOnEmit } from "@typespec/http-client-python";
import { PythonAzureEmitterOptions } from "./lib.js";

export async function $onEmit(context: EmitContext<PythonAzureEmitterOptions>) {
  // set flavor to azure if not set for python azure emitter
  if (context.options.flavor === undefined) {
    context.options.flavor = "azure";
  }
  await httpClientPythonOnEmit(context);
}
