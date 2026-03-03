import type { Badge, SidebarItem } from "@typespec/astro-utils/sidebar";
import { type DirectoryNode, type SampleNode, getSampleStructure } from "../utils/samples";

function createLibraryReferenceStructure(
  libDir: string,
  labelName: string,
  hasLinterRules: boolean,
  extra: SidebarItem[] = [],
): any {
  const rules = {
    label: "Rules",
    autogenerate: { directory: `${libDir}/rules` },
  };
  return {
    label: labelName,
    index: `${libDir}/reference`,
    items: [
      ...(hasLinterRules ? [rules] : []),
      {
        autogenerate: { directory: `${libDir}/reference` },
      },
      ...(extra ?? []),
    ],
  };
}

const sidebar: SidebarItem[] = [
  "intro",
  {
    label: "Get started",
    items: [
      "getstarted/installation",
      "getstarted/createproject",
      "getstarted/versioning",
      {
        label: "Azure Data Plane Service",
        autogenerate: {
          directory: "getstarted/azure-core",
        },
      },
      {
        label: "ARM Service",
        autogenerate: {
          directory: "getstarted/azure-resource-manager",
        },
      },
    ],
  },
  {
    label: "Howtos & Examples",
    items: [
      {
        autogenerate: {
          directory: "howtos",
        },
      },
      "reference/azure-style-guide",
    ],
  },
  {
    label: "Convert OpenAPI to TypeSpec",
    items: [
      "migrate-swagger/01-get-started",
      {
        label: "TroubleShooting",
        autogenerate: {
          directory: "migrate-swagger/faq",
        },
      },
      {
        label: "Checklists",
        autogenerate: {
          directory: "migrate-swagger/checklists",
        },
      },
    ],
  },
  {
    label: " Samples",
    items: buildSamplesSidebar((await getSampleStructure()).tree),
  },
  {
    label: "📚 Libraries",
    items: [
      createLibraryReferenceStructure("libraries/azure-core", "Azure.Core", true),
      createLibraryReferenceStructure(
        "libraries/azure-resource-manager",
        "Azure.ResourceManager",
        true,
      ),
      createLibraryReferenceStructure(
        "libraries/typespec-client-generator-core",
        "Azure.ClientGenerator.Core",
        false,
        ["libraries/typespec-client-generator-core/guideline"],
      ),
      createLibraryReferenceStructure("libraries/azure-portal-core", "Azure.Portal", false),
    ],
  },
  {
    label: "🖨️ Emitters",
    items: [
      createLibraryReferenceStructure("emitters/typespec-autorest", "Autorest / Swagger", false),
      {
        label: "Clients",
        items: [
          createLibraryReferenceStructure("emitters/clients/typespec-java", "Java", false),
          createLibraryReferenceStructure("emitters/clients/typespec-go", "Go", false),
          createLibraryReferenceStructure("emitters/clients/typespec-python", "Python", false),
          createLibraryReferenceStructure("emitters/clients/typespec-csharp", "CSharp", false),
          createLibraryReferenceStructure("emitters/clients/typespec-ts", "JavaScript", false),
        ],
      },
    ],
  },
  {
    label: "🔎 Troubleshoot",
    autogenerate: {
      directory: "troubleshoot",
    },
  },
  {
    label: "🚀 Release Notes",
    autogenerate: {
      order: "desc",
      directory: "release-notes",
    },
  },
];

export default sidebar;

function buildSamplesSidebar(tree: Record<string, SampleNode | DirectoryNode>): SidebarItem[] {
  function prettifyFolderName(name: string): string {
    return name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function buildItems(node: Record<string, SampleNode | DirectoryNode>): SidebarItem[] {
    // Sort entries by order, then alphabetically by key
    const sortedEntries = Object.entries(node).sort(([keyA, a], [keyB, b]) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return keyA.localeCompare(keyB);
    });

    return sortedEntries.map(([key, value]) => {
      const badge: Badge | undefined = value.danger ? { text: "⚠", variant: "danger" } : undefined;

      if (value.kind === "sample") {
        return {
          label: value.title,
          link: `/docs/samples/${value.id}`,
          badge,
        } as any;
      } else {
        return {
          label: value.label ?? prettifyFolderName(key),
          badge,
          items: buildItems(value.children),
        };
      }
    });
  }

  return buildItems(tree);
}
