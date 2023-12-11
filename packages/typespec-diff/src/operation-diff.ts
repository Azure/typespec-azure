import { Operation } from "@typespec/compiler";
import { getResponsesForOperation, HttpOperationResponse } from "@typespec/http";
import { getOperationId } from "@typespec/openapi";
import { diffDecorators } from "./decorator-diff.js";
import { createDiffFunction } from "./diff.js";
import { diffParameters } from "./parameter-diff.js";
import { diffReturns } from "./return-diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { getArrayDiff, getHttpOperation, isLongRunningOperation } from "./utils.js";

export const diffOperation = createDiffFunction(
  (oldOp: Operation, newOp: Operation, ctx: DiffContext) => {
    const [oldHttpOp, newHttpOp] = [
      getHttpOperation(ctx.oldProgram, oldOp),
      getHttpOperation(ctx.newProgram, newOp),
    ];
    if (oldHttpOp?.path !== newHttpOp?.path) {
      reportMessage(
        {
          code: "ChangedPath",
          newType: newOp,
          oldType: oldOp,
          params: {
            oldPath: oldHttpOp?.path ?? "",
            newPath: newHttpOp?.path ?? "",
          },
        },
        ctx
      );
    }
    const [oldOperationId, newOperationId] = [
      getOperationId(ctx.oldProgram, oldOp),
      getOperationId(ctx.newProgram, newOp),
    ];
    if (oldOperationId !== newOperationId) {
      reportMessage(
        {
          code: "ModifiedOperationId",
          params: {
            oldOperationId: oldOperationId ?? "",
            newOperationId: newOperationId ?? "",
            operationName: oldOp.name,
          },
        },
        ctx
      );
    }
    diffParameters(oldOp.parameters, newOp.parameters, oldOp, newOp, {
      ...ctx,
      direction: "Request",
    });
    const [oldResponses] = getResponsesForOperation(ctx.oldProgram, oldOp);
    const [newResponses] = getResponsesForOperation(ctx.newProgram, newOp);
    oldResponses.forEach((re) => {
      if (!newResponses.find((newRe) => newRe.statusCodes === re.statusCodes)) {
        reportMessage(
          {
            code: "RemovedResponseCode",
            params: {
              responseCode: String(re.statusCodes),
              operationName: oldOp.name,
            },
            newType: newOp,
            oldType: oldOp,
          },
          ctx
        );
      }
    });
    newResponses.forEach((re) => {
      const oldResponse = oldResponses.find((oldRe) => oldRe.statusCodes === re.statusCodes);
      if (!oldResponse) {
        reportMessage(
          {
            code: "AddedResponseCode",
            params: {
              responseCode: String(re.statusCodes),
              operationName: oldOp.name,
            },
            newType: newOp,
            oldType: oldOp,
          },
          ctx
        );
      } else {
        diffResponseCode(oldResponse, re, oldOp, newOp, ctx);
      }
    });

    const oldOpLroStatus = isLongRunningOperation(ctx.oldProgram, oldOp);
    const newOpLroStatus = isLongRunningOperation(ctx.newProgram, newOp);
    if (oldOpLroStatus !== newOpLroStatus) {
      const code = oldOpLroStatus
        ? "RemovedLongrunningOperationSupport"
        : "AddedLongrunningOperationSupport";
      reportMessage(
        { code, params: { operationName: oldOp.name }, oldType: oldOp, newType: newOp },
        ctx
      );
    }

    diffReturns(oldOp.returnType, newOp.returnType, { ...ctx, direction: "Response" });
    diffDecorators(oldOp, newOp, ctx);
  }
);

function diffResponseCode(
  oldResponse: HttpOperationResponse,
  newResponse: HttpOperationResponse,
  oldOp: Operation,
  newOp: Operation,
  ctx: DiffContext
) {
  function getAllContentTypes(response: HttpOperationResponse) {
    return response.responses
      .map((re) => re.body?.contentTypes || [])
      .reduce((pre, cur, index, arr) => {
        pre.push(...cur);
        return pre;
      }, []);
  }
  function getAllHeaders(response: HttpOperationResponse) {
    return response.responses
      .map((re) => (re.headers ? Object.keys(re.headers) : []))
      .reduce((pre, cur, index, arr) => {
        pre.push(...cur);
        return pre;
      }, []);
  }
  const oldContentTypes = getAllContentTypes(oldResponse);
  const newContentTypes = getAllContentTypes(newResponse);

  const [additionContent, removeContent] = getArrayDiff(oldContentTypes, newContentTypes);

  if (removeContent.length) {
    reportMessage(
      {
        code: "RemovedBodyContentType",
        params: { operationName: oldOp.name, contentType: removeContent.join(",") },
        newType: newOp,
        oldType: oldOp,
      },
      ctx
    );
  }

  if (additionContent.length) {
    reportMessage(
      {
        code: "AddedBodyContentType",
        params: { operationName: oldOp.name, contentType: additionContent.join(",") },
        newType: newOp,
        oldType: oldOp,
      },
      ctx
    );
  }
  const [additionHeaders, removeHeaders] = getArrayDiff(
    getAllHeaders(oldResponse),
    getAllHeaders(newResponse)
  );
  if (additionHeaders.length) {
    reportMessage(
      {
        code: "AddedResponseHeader",
        params: { operationName: oldOp.name, responseHeader: additionHeaders.join(",") },
        newType: newOp,
        oldType: oldOp,
      },
      ctx
    );
  }
  if (removeHeaders.length) {
    reportMessage(
      {
        code: "RemovedResponseHeader",
        params: { operationName: oldOp.name, responseHeader: removeHeaders.join(",") },
        newType: newOp,
        oldType: oldOp,
      },
      ctx
    );
  }
}
