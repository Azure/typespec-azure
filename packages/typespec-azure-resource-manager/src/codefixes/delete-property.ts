import { defineCodeFix, getSourceLocation, type CodeFix } from "@typespec/compiler";
import { skipTrivia, type ModelPropertyNode } from "@typespec/compiler/ast";

export function createDeletePropertyCodeFix(node: ModelPropertyNode): CodeFix {
  return defineCodeFix({
    id: "delete-property",
    label: `Delete property '${node.id.sv}'`,
    fix(context) {
      const location = getSourceLocation(node);
      const text = location.file.text;
      const limit = node.parent?.end ?? text.length;
      const cursor = skipTrivia(text, location.end, limit);

      const hasSeparator = cursor < limit && (text[cursor] === ";" || text[cursor] === ",");
      return context.replaceText(
        { ...location, end: hasSeparator ? cursor + 1 : location.end },
        "",
      );
    },
  });
}
