import { parse } from "yaml";

export interface Sample {
  id: string;
  title: string;
  description: string;
  /** Optional danger message for legacy samples that should not be used for new specs */
  danger?: string;
  /** Optional order for sorting in sidebar (lower numbers first, defaults to 0) */
  order?: number;
  files: Record<string, string>;
}

export interface DirectoryConfig {
  /** Directory path relative to specs folder */
  id: string;
  /** Display label for the directory */
  label: string;
  /** Optional danger message for legacy directories */
  danger?: string;
  /** Optional order for sorting in sidebar (lower numbers first, defaults to 0) */
  order?: number;
}

export function prepareFiles(files: Record<string, any>): Record<string, any> {
  const cleanedFiles: Record<string, any> = {};
  for (const [path, content] of Object.entries(files)) {
    const cleanedPath = path.replace(/^.*?packages\/samples\/specs\//, "");
    cleanedFiles[cleanedPath] = content.default;
  }
  return cleanedFiles;
}

export async function getDirectoryConfigs(): Promise<DirectoryConfig[]> {
  const sampleConfigFiles = prepareFiles(
    import.meta.glob(`../../../packages/samples/specs/**/sample-config.yaml`, {
      eager: true,
      query: "?raw",
    }),
  );

  const configs: DirectoryConfig[] = [];
  for (const [path, content] of Object.entries(sampleConfigFiles)) {
    const sampleConfig = parse(content);
    if (sampleConfig.directory === true) {
      const dir = path.replace("/sample-config.yaml", "");
      configs.push({
        id: dir,
        label: sampleConfig.label ?? dir,
        danger: sampleConfig.danger,
        order: sampleConfig.order,
      });
    }
  }
  return configs;
}

export async function getSamples(): Promise<Sample[]> {
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
  const samples: Sample[] = [];
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
    for (const [filePath, content] of Object.entries(sampleFiles)) {
      if (filePath.startsWith(`${dir}/`)) {
        const fileName = filePath.replace(`${dir}/`, "");
        files[fileName] = content;
      }
    }

    samples.push({
      id: dir,
      title: sampleConfig.title,
      description: sampleConfig.description,
      danger: sampleConfig.danger,
      order: sampleConfig.order,
      files,
    });
  }
  return samples;
}
