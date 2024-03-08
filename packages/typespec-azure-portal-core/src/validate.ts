import { getAnyExtensionFromPath, Program } from "@typespec/compiler";
import { isFileExist } from "./decorators.js";
import { PortalCoreKeys, reportDiagnostic } from "./lib.js";

export async function $onValidate(program: Program) {
  const aboutEntries = program.stateMap(PortalCoreKeys.about).entries();
  const browseEntries = program.stateMap(PortalCoreKeys.browse).entries();
  for (const [target, aboutOptions] of aboutEntries) {
    const icon = aboutOptions.icon;
    if (icon) {
      const filePath = icon.filePath;
      const fileExtension = getAnyExtensionFromPath(filePath);
      if (fileExtension !== ".svg") {
        reportDiagnostic(program, {
          code: "invalid-type",
          messageId: "iconSvg",
          format: {
            filePath: filePath,
          },
          target,
        });
        return false;
      }
      if (!(await isFileExist(program.host, filePath))) {
        reportDiagnostic(program, {
          code: "file-not-found",
          format: {
            decoratorName: "about",
            propertyName: "icon",
            filePath: filePath,
          },
          target,
        });
        return false;
      }
    }
  }
  for (const [target, browseOptions] of browseEntries) {
    const argQuery = browseOptions.argQuery;
    if (argQuery && argQuery.filePath) {
      const filePath = argQuery.filePath;
      const fileExtension = getAnyExtensionFromPath(filePath);
      if (![".kql", ".kml"].includes(fileExtension)) {
        reportDiagnostic(program, {
          code: "invalid-type",
          messageId: "argQueryFile",
          format: {
            filePath: filePath,
          },
          target,
        });
        return false;
      }
      if (!(await isFileExist(program.host, filePath))) {
        reportDiagnostic(program, {
          code: "file-not-found",
          format: {
            decoratorName: "browse",
            propertyName: "argQuery",
            filePath: filePath,
          },
          target,
        });
        return false;
      }
    } else if (argQuery && typeof argQuery === "string") {
      const fileExtension = getAnyExtensionFromPath(argQuery);
      if (fileExtension !== "") {
        reportDiagnostic(program, {
          code: "invalid-type",
          messageId: "argQueryString",
          format: {
            query: argQuery,
          },
          target,
        });
      }
    }
  }
  return true;
}
