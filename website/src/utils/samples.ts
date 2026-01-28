import { parse } from "yaml";

export interface Sample {
  id: string;
  title: string;
  description: string;
  files: Record<string, string>;
}

export function prepareFiles(files: Record<string, any>): Record<string, any> {
  const cleanedFiles: Record<string, any> = {};
  for (const [path, content] of Object.entries(files)) {
    const cleanedPath = path.replace(/^.*?packages\/samples\/specs\//, "");
    cleanedFiles[cleanedPath] = content.default;
  }
  return cleanedFiles;
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
  return Object.entries(sampleConfigFiles).map(([path, content]) => {
    const dir = path.replace("/sample-config.yaml", "");
    const sampleConfig = parse(content);

    if (!sampleConfig.title) {
      throw new Error(`Sample config at ${path} is missing title field.`);
    }
    if (!sampleConfig.description) {
      throw new Error(`Sample config at ${path} is missing description field.`);
    }
    return {
      id: dir,
      title: sampleConfig.title,
      description: sampleConfig.description,
      files: { "main.tsp": sampleFiles[`${dir}/main.tsp`] },
    };
  });
}
