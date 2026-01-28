import type { SidebarItem } from "@typespec/astro-utils/sidebar";
import { getSamples } from "../utils/samples";

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
    label: " Samples",
    items: buildSamplesSidebar(await getSamples()),
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

// Helper to build nested sidebar structure for samples
type SampleSidebarTree = {
  [segment: string]: SampleSidebarTree | { id: string; title: string };
};

function buildSamplesSidebar(samples: { id: string; title: string }[]): SidebarItem[] {
  // Build a tree from sample ids
  const root: SampleSidebarTree = {};
  for (const sample of samples) {
    const parts = sample.id.split("/");
    let node: SampleSidebarTree = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        node[part] = { id: sample.id, title: sample.title };
      } else {
        if (!node[part] || isSampleLeaf(node[part])) {
          node[part] = {};
        }
        node = node[part] as SampleSidebarTree;
      }
    }
  }

  function isSampleLeaf(
    node: SampleSidebarTree | { id: string; title: string },
  ): node is { id: string; title: string } {
    return (node as any).id !== undefined && (node as any).title !== undefined;
  }

  function prettifyFolderName(name: string): string {
    return name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function buildItems(node: SampleSidebarTree, path: string[] = []): SidebarItem[] {
    return Object.entries(node).map(([key, value]) => {
      if (isSampleLeaf(value)) {
        return {
          label: value.title,
          slug: `/samples/${value.id}`,
        };
      } else {
        return {
          label: prettifyFolderName(key),
          items: buildItems(value, [...path, key]),
        };
      }
    });
  }
  return buildItems(root);
}
