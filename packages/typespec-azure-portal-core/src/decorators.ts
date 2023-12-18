import { ArmResourceKind, getArmResourceKind } from "@azure-tools/typespec-azure-resource-manager";
import {
  StringLiteral,
  getDirectoryPath,
  getSourceLocation,
  normalizePath,
  resolvePath,
  validateDecoratorUniqueOnNode,
  type DecoratorContext,
  type Model,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import fs from "fs";
import { PortalCoreKeys } from "./keys.js";
import { reportDiagnostic } from "./lib.js";
import { AboutOptions, BrowseOptions, marketplaceOfferOptions } from "./types.js";

/**
 * This is a Browse decorator which will be use to put more info on the browse view.
 * @param target The model that is being decorated.
 * @param options BrowseOptions of the property.
 */
export function $browse(context: DecoratorContext, target: Model, options: BrowseOptions) {
  const { program } = context;
  if (
    getArmResourceKind(target) !== ("Tracked" as ArmResourceKind) &&
    getArmResourceKind(target) !== ("Proxy" as ArmResourceKind)
  ) {
    reportDiagnostic(program, {
      code: "invalidUsageDecorator",
      messageId: "browse",
      target,
    });
  }
  validateDecoratorUniqueOnNode(context, target, $browse);
  if (options && (options as Model).properties) {
    const query = (options as Model).properties.get("argQuery");
    if (query && query.type.kind === "Model") {
      const sourceLocation = getSourceLocation(target);
      const dirPath =
        sourceLocation && sourceLocation.file.path && getDirectoryPath(sourceLocation.file.path);
      let argQueryPath = query.type && (query.type as Model).properties.get("filePath");
      const argQueryPathValue =
        argQueryPath && argQueryPath.type && (argQueryPath.type as StringLiteral).value;
      let filePath = resolvePath(dirPath, argQueryPathValue); //if given path is fullpath, it will return the fullPath
      if (filePath && argQueryPath && argQueryPathValue) {
        filePath = normalizePath(filePath);
        if (!fs.existsSync(filePath)) {
          reportDiagnostic(program, {
            code: "fileNotFound",
            messageId: "browseargQuery",
            target,
          });
        }
        (argQueryPath.type as StringLiteral).value = filePath;
      }
    }
  }
  program.stateMap(PortalCoreKeys.browse).set(target, options);
}

export function getBrowse(program: Program, target: Type) {
  return program.stateMap(PortalCoreKeys.browse).get(target);
}

export function getBrowseArgQuery(program: Program, target: Type) {
  const browse = getBrowse(program, target);
  return browse.properties.get("argQuery");
}

/**
 * This is a About decorator that will be used to define icon, keywords and learnMoreDocs.
 * @param target The model that is being decorated.
 * @param options AboutOptions of the property.
 */
// making to Model and document AboutOptions
export function $about(context: DecoratorContext, target: Model, options: AboutOptions) {
  const { program } = context;
  validateDecoratorUniqueOnNode(context, target, $about);
  if (
    getArmResourceKind(target) !== ("Tracked" as ArmResourceKind) &&
    getArmResourceKind(target) !== ("Proxy" as ArmResourceKind)
  ) {
    reportDiagnostic(program, {
      code: "invalidUsageDecorator",
      messageId: "browse",
      target,
    });
  }
  if (options && (options as Model).properties) {
    const icon = (options as Model).properties.get("icon");
    const displayName = (options as Model).properties.get("displayName");
    const keywords = (options as Model).properties.get("keywords");
    const learnMoreDocs = (options as Model).properties.get("learnMoreDocs");
    if (icon) {
      if (icon.type.kind === "Model") {
        const sourceLocation = getSourceLocation(target);
        const dirPath =
          sourceLocation && sourceLocation.file.path && getDirectoryPath(sourceLocation.file.path);
        let iconPath = icon.type && (icon.type as Model).properties.get("filePath");
        const iconPathValue = iconPath && iconPath.type && (iconPath.type as StringLiteral).value;
        let filePath = resolvePath(dirPath, iconPathValue); //if given path is fullpath, it will return the fullPath
        if (filePath && iconPath && iconPathValue) {
          filePath = normalizePath(filePath);
          if (!fs.existsSync(filePath)) {
            reportDiagnostic(program, {
              code: "fileNotFound",
              messageId: "aboutIcon",
              target,
            });
          }
          (iconPath.type as StringLiteral).value = filePath;
        }
      }
    }
    if (displayName) {
      if (displayName.type.kind !== "String") {
        reportDiagnostic(program, {
          code: "invalidType",
          messageId: "aboutDisplayName",
          target,
        });
      }
    }
    if (keywords) {
      if (keywords.type.kind !== "Tuple") {
        reportDiagnostic(program, {
          code: "invalidType",
          messageId: "aboutKeywords",
          target,
        });
      } else {
        const invalidTypes =
          keywords.type.values &&
          keywords.type.values.filter((keyword) => keyword.kind !== "String");
        if (invalidTypes && invalidTypes.length > 0) {
          reportDiagnostic(program, {
            code: "invalidType",
            messageId: "aboutKeywordsItem",
            target,
          });
        }
      }
    }
    if (learnMoreDocs) {
      if (learnMoreDocs.type.kind !== "Tuple") {
        reportDiagnostic(program, {
          code: "invalidType",
          messageId: "aboutLearnMoreDocs",
          target,
        });
      } else {
        const invalidTypes =
          learnMoreDocs.type.values &&
          learnMoreDocs.type.values.filter((doc) => doc.kind !== "String");
        if (invalidTypes && invalidTypes.length > 0) {
          reportDiagnostic(program, {
            code: "invalidType",
            messageId: "aboutLearnMoreDocsItem",
            target,
          });
        }
      }
    }
  }
  program.stateMap(PortalCoreKeys.about).set(target, options);
}

export function getAbout(program: Program, target: Type) {
  return program.stateMap(PortalCoreKeys.about).get(target);
}

export function getAboutDisplayName(program: Program, target: Type) {
  const about = getAbout(program, target);
  return about.properties.get("displayName");
}

export function getAboutKeywords(program: Program, target: Type) {
  const about = getAbout(program, target);
  return about.properties.get("keywords");
}

export function getAboutLearnMoreDocs(program: Program, target: Type) {
  const about = getAbout(program, target);
  return about.properties.get("learnMoreDocs");
}

export function $marketplaceOffer(
  context: DecoratorContext,
  target: Model,
  options: marketplaceOfferOptions
) {
  const { program } = context;
  validateDecoratorUniqueOnNode(context, target, $marketplaceOffer);
  if (
    getArmResourceKind(target) !== ("Tracked" as ArmResourceKind) &&
    getArmResourceKind(target) !== ("Proxy" as ArmResourceKind)
  ) {
    reportDiagnostic(program, {
      code: "invalidUsageDecorator",
      messageId: "marketPlaceOffer",
      target,
    });
  }
  if (options && (options as Model).properties) {
    const id = (options as Model).properties.get("id");
    if (id) {
      if (id.type.kind !== "String") {
        reportDiagnostic(program, {
          code: "invalidType",
          messageId: "marketplaceOfferId",
          target,
        });
      }
    }
  }
  program.stateMap(PortalCoreKeys.marketplaceOffer).set(target, options);
}

// export function $patternValidationMessage(context:DecoratorContext, target: Scalar | ModelProperty, message: string) {
//   const { program } = context;
//   validateDecoratorUniqueOnNode(context, target, $patternValidationMessage);
//   validateDecoratorNotOnType(context, target, $pattern, $patternValidationMessage);
//   const patternSymbol = Symbol.for("TypeSpec.pattern");
//   const pattern = program.stateMap(patternSymbol).get(target);
//   const pat = getPattern(program, target);
//   program.stateMap(PortalCoreKeys.patternValidationMessage).set(target, message);
// }

// export function getPatternValidationMessage(program: Program, target: Type): string | undefined {
//   const result = program.stateMap(PortalCoreKeys.patternValidationMessage).get(target);
//   return result && result.value;
// }

export function $displayName(context: DecoratorContext, target: ModelProperty, name: string) {
  const { program } = context;
  validateDecoratorUniqueOnNode(context, target, $displayName);
  program.stateMap(PortalCoreKeys.displayName).set(target, name);
}

export function getDisplayName(program: Program, target: Type): string | undefined {
  return program.stateMap(PortalCoreKeys.displayName).get(target);
}

export function getDisplayNameValue(program: Program, target: Type): string | undefined {
  const result = program.stateMap(PortalCoreKeys.displayName).get(target);
  return result && result.value;
}

// const essentialsMap = new WeakMap<Program, string[]>();
// export function $essentials(context: DecoratorContext, target: ModelProperty) {

//   validateDecoratorUniqueOnNode(context, target, $essentials);
//   const { program } = context;

//   if (!essentialsMap.has(context.program)) {
//     essentialsMap.set(context.program, []);
//   }
//   const essentialsArray = essentialsMap.get(context.program) ?? [];

//   if(essentialsArray.length >= 5) {
//     reportDiagnostic(program, {
//       code: "essentials-maximum-usage",
//       messageId: "default",
//       target
//     })
//   }
//   if(!essentialsArray.includes(target.name) && !Object.keys(target).includes("sourceProperty")) {
//     essentialsArray.push(target.name);
//     program.stateSet(PortalCoreKeys.essentials).add({kind: "String", value: target.name} as StringLiteral);
//   }

// }

// export function isEssential(program: Program, target: ModelProperty) {
//   return program.stateSet(PortalCoreKeys.essentials).has(target);
// }

export function findAboutDisplayName(program: Program, target: Model) {
  return (
    program.stateSet(PortalCoreKeys.about).has(target) &&
    program.stateSet(PortalCoreKeys.about).keys()
  );
}

// function validateTargetingAString(
//   context: DecoratorContext,
//   target: Scalar | ModelProperty,
//   decoratorName: string
// ) {
//   const valid = isTypeIn(getPropertyType(target), (x) => isStringType(context.program, x));
//   if (!valid) {
//     reportDiagnostic(context.program, {
//       code: "decorator-wrong-target",
//       format: {
//         decorator: decoratorName,
//         to: `type it is not a string`,
//       },
//       target: context.decoratorTarget,
//     });
//   }
//   return valid;
// }
