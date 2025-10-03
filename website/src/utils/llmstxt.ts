import { populateTopicDocs, type DocEntry, type TopicProps } from "@typespec/astro-utils/llmstxt";
import { getCollection } from "astro:content";

export type LlmsDocsDetails = {
  docs: DocEntry[];
  libraryNames: Set<string>;
};

export async function collectLlmsDocs() {
  const libraryNames = new Set<string>();
  const docs = await getCollection("docs", (entry) => {
    if (!entry.data.llmstxt) return false;

    const libraryName = getLibraryName(entry.id);
    if (libraryName) {
      libraryNames.add(libraryName);
    }

    return true;
  });

  return {
    docs,
    libraryNames,
  };
}

export type GenerateLlmsTopicsProps = {
  libraryNames: Set<string>;
} & (
  | {
      docs: DocEntry[];
      skipPopulateDocs?: boolean;
    }
  | {
      docs?: never;
      skipPopulateDocs: true;
    }
);

export function generateLlmsTopics(
  props: {
    libraryNames: Set<string>;
  } & {
    docs: DocEntry[];
    skipPopulateDocs?: boolean;
  },
): TopicProps[];
export function generateLlmsTopics(
  props: {
    libraryNames: Set<string>;
  } & {
    docs?: never;
    skipPopulateDocs: true;
  },
): Omit<TopicProps, "docs">[];
export function generateLlmsTopics({
  libraryNames,
  docs,
  skipPopulateDocs,
}: GenerateLlmsTopicsProps): TopicProps[] | Omit<TopicProps, "docs">[] {
  const topics = [
    {
      title: "Getting Started - ARM",
      id: "typespec-azure-resource-manager-getting-started",
      description: "Overview of writing Azure Resource Manager (ARM) services in TypeSpec",
      pathPrefix: "docs/getstarted/azure-resource-manager/",
    },
    {
      title: "Getting Started - Azure Data Plane",
      id: "typespec-azure-data-plane-getting-started",
      description: "Overview of writing Azure Data Plane services in TypeSpec",
      pathPrefix: "docs/getstarted/azure-core/",
    },
    {
      title: "How Tos - ARM",
      id: "typespec-azure-resource-manager-how-tos",
      description: "Explanations of how to do common ARM-related tasks in TypeSpec",
      pathPrefix: "docs/howtos/arm/",
    },
    {
      title: "How Tos - Azure Data Plane",
      id: "typespec-azure-data-plane-how-tos",
      description: "Explanations of how to do common Azure Data Plane-related tasks in TypeSpec",
      pathPrefix: "docs/howtos/azure-core/",
    },
    {
      title: "How Tos - Generate Client Libraries",
      id: "typespec-azure-clients-how-tos",
      description: "Explanations of how to generate client libraries for Azure services",
      pathPrefix: "docs/howtos/generate-client-libraries/",
    },
    {
      title: "How Tos - Versioning",
      id: "typespec-azure-versioning-how-tos",
      description: "Explanations of how to version Azure services",
      pathPrefix: "docs/howtos/versioning/",
    },
  ];

  for (const libraryName of libraryNames) {
    const typespecLibraryName = libraryName.startsWith("typespec")
      ? libraryName
      : `typespec-${libraryName}`;
    topics.push({
      title: `@azure-tools/${typespecLibraryName}`,
      id: `${typespecLibraryName}-library`,
      description: `Documentation for the @azure-tools/${typespecLibraryName} library.`,
      pathPrefix: `docs/libraries/${libraryName}/`,
    });
  }

  if (skipPopulateDocs) {
    return topics;
  }

  return populateTopicDocs(topics, docs);
}

function getLibraryName(id: string): string | undefined {
  const match = id.match(/docs\/libraries\/([^/]+)\//);
  return match ? match[1] : undefined;
}
