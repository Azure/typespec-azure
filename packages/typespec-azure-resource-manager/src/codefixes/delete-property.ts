import { defineCodeFix, getSourceLocation, type CodeFix } from "@typespec/compiler";
import type { ModelPropertyNode } from "@typespec/compiler/ast";

export function createDeletePropertyCodeFix(node: ModelPropertyNode): CodeFix {
  return defineCodeFix({
    id: "delete-property",
    label: `Delete property '${node.id.sv}'`,
    fix(context) {
      const location = getSourceLocation(node);
      const text = location.file.text;
      const limit = node.parent?.end ?? text.length;
      let cursor = location.end;

      // Scan trivia forwards only. A comment's punctuation is never a property separator.
      while (cursor < limit) {
        if (/\s/.test(text[cursor])) {
          cursor++;
        } else if (text.startsWith("//", cursor)) {
          cursor += 2;
          while (cursor < limit && text[cursor] !== "\r" && text[cursor] !== "\n") {
            cursor++;
          }
        } else if (text.startsWith("/*", cursor)) {
          const end = text.indexOf("*/", cursor + 2);
          if (end === -1 || end + 2 > limit) {
            break;
          }
          cursor = end + 2;
        } else {
          break;
        }
      }

      const hasSeparator = cursor < limit && (text[cursor] === ";" || text[cursor] === ",");
      return context.replaceText(
        { ...location, end: hasSeparator ? cursor + 1 : location.end },
        "",
      );
    },
  });
}
