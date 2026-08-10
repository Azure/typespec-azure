import type { DecoratorContext, EnumMember, Program } from "@typespec/compiler";
import { useStateSet } from "@typespec/compiler/utils";
import { getVersionForEnumMember } from "@typespec/versioning";
import type { PreviewVersionDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, createDiagnostic } from "../lib.js";

const [isPreviewVersion, markPreviewVersion] = useStateSet<EnumMember>(
  AzureCoreStateKeys.previewVersion,
);

export { isPreviewVersion };

export const $previewVersion: PreviewVersionDecorator = (
  context: DecoratorContext,
  target: EnumMember,
) => {
  markPreviewVersion(context.program, target);
};

export function checkPreviewVersion(program: Program) {
  const previewVersions = program.stateSet(
    AzureCoreStateKeys.previewVersion,
  ) as Iterable<EnumMember>;

  for (const target of previewVersions) {
    const resolvedVersion = getVersionForEnumMember(program, target);

    // Validate that the target is a member of a Version enum
    if (!resolvedVersion) {
      program.reportDiagnostic(
        createDiagnostic({
          code: "preview-version-invalid-enum-member",
          target,
        }),
      );
      return;
    }

    // Validate that the target is the last member of the Version enum
    const totalMembers = resolvedVersion.enumMember.enum.members.size;
    if (resolvedVersion.index !== totalMembers - 1) {
      program.reportDiagnostic(
        createDiagnostic({
          code: "preview-version-last-member",
          target,
        }),
      );
      return;
    }
  }
}
