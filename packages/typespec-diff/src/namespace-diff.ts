import { Namespace } from "@typespec/compiler";
import { createDiffFunction } from "./diff.js";
import { diffEnum } from "./enum-diff.js";
import { diffInterface } from "./interface-diff.js";
import { diffModels } from "./model-diff.js";
import { diffOperation } from "./operation-diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffUnions } from "./union-diff.js";
import { diffMaps } from "./utils.js";

export const diffNamespace = createDiffFunction(
  (oldNs: Namespace, newNs: Namespace, ctx: DiffContext) => {
    // // diff Namespace
    diffMaps(oldNs.namespaces, newNs.namespaces, ctx, {
      onAddition: (name: string, newType: Namespace, ctx) => {
        reportMessage(
          {
            code: "AddedNamespace",
            params: {
              namespaceName: name,
            },
            newType,
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedNamespace",
            params: {
              namespaceName: name,
            },
            oldType,
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffNamespace(oldType, newType, ctx);
      },
    });
    // diff interfaces
    diffMaps(oldNs.interfaces, newNs.interfaces, ctx, {
      onAddition: (name: string, newType, ctx) => {
        reportMessage(
          {
            code: "AddedInterface",
            newType,
            params: {
              interfaceName: name,
            },
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedInterface",
            oldType,
            params: {
              interfaceName: name,
            },
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffInterface(oldType, newType, ctx);
      },
    });

    // diff operaions
    diffMaps(oldNs.operations, newNs.operations, ctx, {
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

    // diff models
    diffMaps(oldNs.models, newNs.models, ctx, {
      onAddition: (name: string, newType, ctx) => {
        reportMessage(
          {
            code: "AddedModel",
            params: {
              modelName: name,
            },
            newType,
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedModel",
            params: {
              modelName: name,
            },
            oldType,
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffModels(oldType, newType, ctx);
      },
    });
    // diff enums
    diffMaps(oldNs.enums, newNs.enums, ctx, {
      onAddition: (name: string, newType, ctx) => {
        reportMessage(
          {
            code: "AddedEnum",
            params: {
              enumName: name,
            },
            newType,
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedEnum",
            params: {
              enumName: name,
            },
            oldType,
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffEnum(oldType, newType, ctx);
      },
    });

    // diff unions
    diffMaps(oldNs.unions, newNs.unions, ctx, {
      onAddition: (name: string, newType, ctx) => {
        reportMessage(
          {
            code: "AddedUnion",
            params: {
              unionName: name,
            },
            newType,
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedUnion",
            params: {
              unionName: name,
            },
            oldType,
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffUnions(oldType, newType, ctx);
      },
    });
  }
);
