import type { SidebarItem } from "@typespec/astro-utils/sidebar";

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
    label: "Convert Swagger to TypeSpec",
    autogenerate: {
      directory: "migrate-swagger",
    },
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
      ),
      createLibraryReferenceStructure("libraries/azure-portal-core", "Azure.Portal", false),
    ],
  },
  {
    label: "🖨️ Emitters",
    items: [
      createLibraryReferenceStructure("emitters/typespec-autorest", "Autorest / Swagger", false),
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
