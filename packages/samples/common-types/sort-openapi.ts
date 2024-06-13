import { sortOpenAPIDocument } from "@azure-tools/typespec-autorest";
import { readFile, readdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));

async function findJsonFiles(folder: string): Promise<string[]> {
  const items = await readdir(folder, { withFileTypes: true });

  return (
    await Promise.all(
      items.map(async (item) => {
        if (item.isDirectory()) {
          const files = await findJsonFiles(resolve(folder, item.name));
          return files.map((x) => resolve(folder, x));
        }

        if (item.name.endsWith(".json")) {
          return [resolve(folder, item.name)];
        } else {
          return [];
        }
      })
    )
  ).flat();
}

const files = await findJsonFiles(resolve(dir, "existing"));
console.log("Files", files);

for (const file of files) {
  const content = await readFile(file);
  const document = JSON.parse(content.toString());
  const sorted = sortOpenAPIDocument(document);
  await writeFile(file, JSON.stringify(sorted, null, 2));
}
