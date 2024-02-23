import { Program } from "@typespec/compiler";
import { isFileExist } from "./decorators.js";
import { PortalCoreKeys, reportDiagnostic } from "./lib.js";

export async function $onValidate(program: Program) {
  const aboutEntries = program.stateMap(PortalCoreKeys.about).entries();
  const browseEntries = program.stateMap(PortalCoreKeys.browse).entries();
  for (const [target, aboutOption] of aboutEntries) {
    const icon = aboutOption.icon;
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
  for (const [target, browseOption] of browseEntries) {
    const argQuery = browseOption.argQuery;
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
