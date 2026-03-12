import { parse } from "yaml";

export interface SampleConfig {
  id: string;
  /** Sample title */
  title: string;
  description: string;
  /** Include sample in llms.txt generation */
  llmstxt?: boolean;
  /** Optional danger message for legacy samples that should not be used for new specs */
  danger?: string;
  /** Optional order for sorting in sidebar (lower numbers first, defaults to 0) */
  order?: number;
  files: Record<string, string>;
}

export interface SampleDirectoryConfig {
  directory: true;
  /** Directory path relative to specs folder */
  id: string;
  /** Optional display label for the directory */
  label?: string;
  /** Optional danger message for legacy directories */
  danger?: string;
  /** Optional order for sorting in sidebar (lower numbers first, defaults to 0) */
  order?: number;
}

/** A sample node in the tree structure */
export interface SampleNode {
  kind: "sample";
  id: string;
  title: string;
  danger?: string;
  order?: number;
}

/** A directory node in the tree structure */
export interface DirectoryNode {
  kind: "directory";
  label?: string;
  danger?: string;
  order?: number;
  children: Record<string, SampleNode | DirectoryNode>;
}

/** The complete sample structure with both flat list and nested tree */
export interface SampleStructure {
  /** Flat list of all samples */
  samples: SampleConfig[];
  /** Nested tree structure for navigation */
  tree: Record<string, SampleNode | DirectoryNode>;
}

export function prepareFiles(files: Record<string, any>): Record<string, any> {
  const cleanedFiles: Record<string, any> = {};
  for (const [path, content] of Object.entries(files)) {
    const cleanedPath = path.replace(/^.*?packages\/samples\/specs\//, "");
    cleanedFiles[cleanedPath] = content.default;
  }
  return cleanedFiles;
}

export async function getSampleStructure(): Promise<SampleStructure> {
  const sampleConfigFiles = prepareFiles(
    import.meta.glob(`../../../packages/samples/specs/**/sample-config.yaml`, {
      eager: true,
      query: "?raw",
    }),
  );
  const sampleFiles = prepareFiles(
    import.meta.glob(`../../../packages/samples/specs/**/*.tsp`, {
      eager: true,
      query: "?raw",
    }),
  );

  // Build directory config map
  const dirConfigMap = new Map<string, SampleDirectoryConfig>();
  for (const [path, content] of Object.entries(sampleConfigFiles)) {
    const sampleConfig = parse(content);
    if (sampleConfig.directory === true) {
      const dir = path.replace("/sample-config.yaml", "");
      dirConfigMap.set(dir, {
        directory: true,
        id: dir,
        label: sampleConfig.label,
        danger: sampleConfig.danger,
        order: sampleConfig.order,
      });
    }
  }

  // Build samples list and tree
  const samples: SampleConfig[] = [];
  const tree: Record<string, SampleNode | DirectoryNode> = {};

  for (const [path, content] of Object.entries(sampleConfigFiles)) {
    const dir = path.replace("/sample-config.yaml", "");
    const sampleConfig = parse(content);

    // Skip directory configs
    if (sampleConfig.directory === true) {
      continue;
    }

    if (!sampleConfig.title) {
      throw new Error(`Sample config at ${path} is missing title field.`);
    }
    if (!sampleConfig.description) {
      throw new Error(`Sample config at ${path} is missing description field.`);
    }
    const mainTsp = sampleFiles[`${dir}/main.tsp`];
    if (!mainTsp) {
      throw new Error(`Sample at ${dir} is missing main.tsp file.`);
    }

    // Collect all .tsp files for this sample
    const files: Record<string, string> = {};
    for (const [filePath, fileContent] of Object.entries(sampleFiles)) {
      if (filePath.startsWith(`${dir}/`)) {
        const fileName = filePath.replace(`${dir}/`, "");
        files[fileName] = fileContent;
      }
    }

    const sample: SampleConfig = {
      id: dir,
      title: sampleConfig.title,
      description: sampleConfig.description,
      llmstxt: sampleConfig.llmstxt === true,
      danger: sampleConfig.danger,
      order: sampleConfig.order,
      files,
    };
    samples.push(sample);

    // Add to tree
    const parts = dir.split("/");
    let node = tree;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (i === parts.length - 1) {
        // Last part - create sample node
        node[part] = {
          kind: "sample",
          id: sample.id,
          title: sample.title,
          danger: sample.danger,
          order: sample.order,
        };
      } else {
        // Intermediate part - ensure directory exists
        if (!node[part] || node[part].kind !== "directory") {
          const dirConfig = dirConfigMap.get(currentPath);
          node[part] = {
            kind: "directory",
            label: dirConfig?.label,
            danger: dirConfig?.danger,
            order: dirConfig?.order,
            children: {},
          };
        }
        node = (node[part] as DirectoryNode).children;
      }
    }
  }

  return { samples, tree };
}

export function renderSampleAsMarkdown(sample: SampleConfig): string {
  const lines: string[] = [];

  if (sample.danger) {
    lines.push(`> **Danger**: ${sample.danger}`);
    lines.push("");
  }

  const sortedFiles = Object.entries(sample.files).sort(([a], [b]) => {
    if (a === "main.tsp") return -1;
    if (b === "main.tsp") return 1;
    return a.localeCompare(b);
  });

  for (const [fileName, content] of sortedFiles) {
    lines.push(`## ${fileName}`);
    lines.push("```typespec");
    lines.push(content);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n").trim();
}
