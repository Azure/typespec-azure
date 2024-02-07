import { Program } from "@typespec/compiler";
import { isFileExist } from "./decorators.js";
import { PortalCoreKeys } from "./keys.js";
import { reportDiagnostic } from "./lib.js";

export async function $onValidate(program: Program) {
  const aboutEntries = program.stateMap(PortalCoreKeys.about).entries();
  const browseEntries = program.stateMap(PortalCoreKeys.browse).entries();
  for (const [target, aboutOptions] of aboutEntries) {
    const icon = aboutOptions.icon;
    if (icon) {
      const filePath = icon.filePath;
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
      }
    }
  }
  for (const [target, browseOptions] of browseEntries) {
    const argQuery = browseOptions.argQuery;
    if (argQuery && argQuery.filePath) {
      const filePath = argQuery.filePath;
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
      }
    }
  }
}
