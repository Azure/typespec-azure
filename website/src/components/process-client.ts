import type { Element, ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";
import { rehype } from "rehype";
import { CONTINUE, EXIT, visit } from "unist-util-visit";

/**
 * Update this list to register a new language
 * For icons see https://starlight.astro.build/reference/icons/#all-icons
 */
const KnownLanguages = {
  python: {
    label: "Python",
    icon: "seti:python",
  },
  csharp: {
    label: "CSharp",
    icon: "seti:c-sharp",
  },
  typescript: {
    label: "TypeScript",
    icon: "seti:typescript",
  },
  java: {
    label: "Java",
    icon: "seti:java",
  },
} as const;

type Language = keyof typeof KnownLanguages;

function getLanguage(el: ElementContent): Language | "typespec" {
  let resolved;
  visit(el, "element", (node) => {
    if (node.tagName !== "pre" || !node.properties) {
      return CONTINUE;
    }
    const language = node.properties.dataLanguage as string;
    if (!language) {
      throw new Error("Missing language code code block");
    }
    if (language !== "typespec" && !KnownLanguages[language as Language]) {
      throw new Error(`Unknown language '${language}' used in code block in <ClientTabs>`);
    }

    resolved = language;
    return EXIT;
  });
  if (!resolved) {
    throw new Error("Couldn't find language");
  }
  return resolved;
}

const tabsProcessor = rehype()
  .data("settings", { fragment: true })
  .use(() => {
    return (tree: Element, file) => {
      const results: any[] = (file.data.results = []);
      for (const item of tree.children) {
        if (!(item as any).properties.className.includes("expressive-code")) {
          throw `Unexpected item ${item} should only have code blocks`;
        }
        const language = getLanguage(item);
        results.push({ language, html: toHtml(item) });
      }
    };
  });

export interface Result {
  typespec: string;
  outputs: Array<{
    language: Language;
    label: string;
    icon: string;
    html: string;
  }>;
}
export function processPanels(html: string): Result {
  const file = tabsProcessor.processSync({ value: html });
  const codeBlocks = file.data.results as any[];
  let typespec;
  const outputs: Result["outputs"] = [];
  for (const item of codeBlocks) {
    if (item.language === "typespec") {
      typespec = item.html;
    } else {
      outputs.push({
        language: item.language as any,
        label: KnownLanguages[item.language as Language].label,
        icon: KnownLanguages[item.language as Language].icon,
        html: item.html,
      });
    }
  }
  if (typespec === undefined) {
    throw new Error("Missing typespec code block");
  }

  return { typespec, outputs };
}
