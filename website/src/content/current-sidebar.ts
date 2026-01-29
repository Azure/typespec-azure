import type { Badge, SidebarItem } from "@typespec/astro-utils/sidebar";
import { getDirectoryConfigs, getSamples } from "../utils/samples";

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
    items: buildSamplesSidebar(await getSamples(), await getDirectoryConfigs()),
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

// Helper to build nested sidebar structure for samples
type SampleLeaf = { id: string; title: string; danger?: string; order?: number };
type DirectoryNode = {
  __isDir: true;
  label?: string;
  danger?: string;
  order?: number;
  children: SampleSidebarTree;
};
type SampleSidebarTree = {
  [segment: string]: SampleSidebarTree | SampleLeaf | DirectoryNode;
};

interface DirectoryConfigInput {
  id: string;
  label: string;
  danger?: string;
  order?: number;
}

function buildSamplesSidebar(
  samples: { id: string; title: string; danger?: string; order?: number }[],
  directoryConfigs: DirectoryConfigInput[],
): SidebarItem[] {
  // Build a map of directory configs by path
  const dirConfigMap = new Map<string, DirectoryConfigInput>();
  for (const config of directoryConfigs) {
    dirConfigMap.set(config.id, config);
  }

  // Build a tree from sample ids
  const root: SampleSidebarTree = {};
  for (const sample of samples) {
    const parts = sample.id.split("/");
    let node: SampleSidebarTree = root;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (i === parts.length - 1) {
        node[part] = {
          id: sample.id,
          title: sample.title,
          danger: sample.danger,
          order: sample.order,
        };
      } else {
        if (!node[part] || isSampleLeaf(node[part])) {
          const dirConfig = dirConfigMap.get(currentPath);
          node[part] = {
            __isDir: true,
            label: dirConfig?.label,
            danger: dirConfig?.danger,
            order: dirConfig?.order,
            children: {},
          };
        }
        const dirNode = node[part] as DirectoryNode;
        node = dirNode.children;
      }
    }
  }

  function isSampleLeaf(node: SampleSidebarTree | SampleLeaf | DirectoryNode): node is SampleLeaf {
    return (
      (node as any).id !== undefined &&
      (node as any).title !== undefined &&
      (node as any).__isDir === undefined
    );
  }

  function isDirectoryNode(
    node: SampleSidebarTree | SampleLeaf | DirectoryNode,
  ): node is DirectoryNode {
    return (node as any).__isDir === true;
  }

  function prettifyFolderName(name: string): string {
    return name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function getOrder(value: SampleSidebarTree | SampleLeaf | DirectoryNode): number {
    if (isSampleLeaf(value) || isDirectoryNode(value)) {
      return value.order ?? 0;
    }
    return 0;
  }

  function buildItems(node: SampleSidebarTree, path: string[] = []): SidebarItem[] {
    // Sort entries by order, then alphabetically by key
    const sortedEntries = Object.entries(node).sort(([keyA, valueA], [keyB, valueB]) => {
      const orderA = getOrder(valueA);
      const orderB = getOrder(valueB);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return keyA.localeCompare(keyB);
    });

    return sortedEntries.map(([key, value]) => {
      if (isSampleLeaf(value)) {
        const badge: Badge | undefined = value.danger
          ? { text: "⚠", variant: "danger" }
          : undefined;
        return {
          label: value.title,
          link: `/docs/samples/${value.id}`,
          badge,
        } as any;
      } else if (isDirectoryNode(value)) {
        const badge: Badge | undefined = value.danger
          ? { text: "⚠", variant: "danger" }
          : undefined;
        return {
          label: value.label ?? prettifyFolderName(key),
          badge,
          items: buildItems(value.children, [...path, key]),
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
