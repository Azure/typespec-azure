import { getTypeName, isArrayModelType, isTemplateDeclaration, Model } from "@typespec/compiler";
import { diffArray } from "./array-diff.js";
import { diffDecorators } from "./decorator-diff.js";
import { createDiffFunction } from "./diff.js";
import { diffModelProperties } from "./model-property-diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffMaps, isPagedCollection, isSameType } from "./utils.js";

export const diffModels = createDiffFunction(
  (oldModel: Model, newModel: Model, ctx: DiffContext) => {
    if (isTemplateDeclaration(newModel)) {
      return;
    }
    if (oldModel.baseModel && !newModel.baseModel) {
      reportMessage(
        {
          code: "RemovedBaseModel",
          params: { baseModelName: oldModel.baseModel.name, modelName: oldModel.name },
          oldType: oldModel,
          newType: newModel,
        },
        ctx
      );
    }

    if (!oldModel.baseModel && newModel.baseModel) {
      reportMessage(
        {
          code: "AddedBaseModel",
          params: { baseModelName: newModel.baseModel.name, modelName: oldModel.name },
          oldType: oldModel,
          newType: newModel,
        },
        ctx
      );
    }

    if (oldModel.baseModel && newModel.baseModel) {
      const diffs = diffModels(oldModel.baseModel, newModel.baseModel, ctx);
      if (diffs.length) {
        reportMessage(
          {
            code: "DifferentBaseModel",
            params: { modelName: oldModel.name },
            oldType: oldModel,
            newType: newModel,
          },
          ctx
        );
      }
    }

    if (oldModel.indexer?.key && newModel.indexer?.key) {
      if (
        isArrayModelType(ctx.oldProgram, oldModel) &&
        isArrayModelType(ctx.newProgram, newModel)
      ) {
        if (!isSameType(oldModel.indexer.value, newModel.indexer.value)) {
          reportMessage(
            {
              code: "ChangedArrayItemType",
              params: {
                oldType: getTypeName(oldModel.indexer.value),
                newType: getTypeName(newModel.indexer.value),
              },
              oldType: oldModel,
              newType: newModel,
            },
            ctx
          );
        }
        // diff minItems & maxItems
        diffArray(oldModel, newModel, ctx);
      }
    }

    diffMaps(oldModel.properties, newModel.properties, ctx, {
      onAddition: (name: string, newType, ctx) => {
        const code = !newType.optional ? "AddedRequiredProperty" : "AddedOptionalProperty";
        reportMessage(
          {
            code,
            newType,
            params: {
              propertyName: name,
              version: ctx.versions.newVersion,
            },
          },
          ctx
        );
      },
      onRemove(name, oldType, ctx) {
        reportMessage(
          {
            code: "RemovedProperty",
            oldType,
            params: {
              propertyName: name,
              version: ctx.versions.newVersion,
            },
          },
          ctx
        );
      },
      onUpdate(oldType, newType, ctx) {
        diffModelProperties(oldType, newType, ctx);
      },
    });

    if (ctx.direction === "Response") {
      const oldPaginationStatus = isPagedCollection(oldModel);
      const newPaginationStatus = isPagedCollection(newModel);
      if (oldPaginationStatus !== newPaginationStatus) {
        const code = oldPaginationStatus ? "RemovedPaginationSupport" : "AddedPaginationSupport";
        reportMessage(
          {
            code,
            params: {
              modelName: oldModel.name,
            },
            oldType: oldModel,
            newType: newModel,
          },
          ctx
        );
      }
    }

    diffDecorators(oldModel, newModel, ctx);
  }
);
