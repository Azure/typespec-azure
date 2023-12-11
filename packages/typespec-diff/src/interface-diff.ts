import { Interface } from "@typespec/compiler";
import { createDiffFunction } from "./diff.js";
import { diffOperation } from "./operation-diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffMaps } from "./utils.js";

export const diffInterface = createDiffFunction(
  (oldInterface: Interface, newInterface: Interface, ctx: DiffContext) => {
    diffMaps(oldInterface.operations, newInterface.operations, ctx, {
      onAddition: (name: string, newType, ctx) => {
        reportMessage(
          {
            code: "AddedOperation",
            params: {
              operationName: name,
            },
            newType,
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedOperation",
            params: {
              operationName: name,
            },
            oldType,
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffOperation(oldType, newType, ctx);
      },
    });
  }
);
