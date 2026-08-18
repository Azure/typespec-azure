/* eslint-disable no-console */
import { execa } from "execa";
import { randomInt } from "node:crypto";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const emitterTestsRoot = join(packageRoot, "emitter-tests");
const emitterName = "@azure-tools/typespec-java";
const traceArguments = [
  "--trace",
  "import-resolution",
  "--trace",
  "projection",
  "--trace",
  "typespec-java",
];

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function getGenerationOptions(typeSpecFile: string): string[] {
  const normalized = typeSpecFile.replaceAll("\\", "/");
  const options = [
    `${emitterName}.emitter-output-dir={project-root}/tsp-output/${randomInt(2 ** 31)}`,
  ];

  if (/type\/enum\/extensible\//.test(normalized)) {
    options.push(`${emitterName}.namespace=type.enums.extensible`);
  } else if (/type\/enum\/fixed\//.test(normalized)) {
    options.push(`${emitterName}.namespace=type.enums.fixed`);
  } else if (/azure\/example\/basic\//.test(normalized)) {
    options.push(`${emitterName}.examples-dir={project-root}/specs/azure/example/basic/examples`);
  } else if (/azure\/client-generator-core\/client-initialization\//.test(normalized)) {
    options.push(`${emitterName}.enable-subclient=true`);
  } else if (/resiliency\/srv-driven\/old\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.namespace=resiliency.servicedriven.v1`,
      `${emitterName}.advanced-versioning=true`,
    );
  } else if (/resiliency\/srv-driven\/main\.tsp$/.test(normalized)) {
    options.push(`${emitterName}.advanced-versioning=true`);
  } else if (/azure\/resource-manager\/.*\/main\.tsp$/.test(normalized)) {
    options.push(`${emitterName}.generate-tests=false`);
  } else if (/azure\/resource-manager\/multi-service-shared-models\//.test(normalized)) {
    options.push(`${emitterName}.metadata-suffix=shared-models`);
  } else if (/tsp\/versioning\.tsp$/.test(normalized)) {
    options.push(`${emitterName}.api-version=2022-09-01`);
  } else if (/tsp\/error\.tsp$/.test(normalized)) {
    options.push(`${emitterName}.use-default-http-status-code-to-exception-type-mapping=false`);
  } else if (/type\/(array|dictionary)/.test(normalized)) {
    options.push(`${emitterName}.use-object-for-unknown=true`);
  } else if (/tsp\/arm\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.service-name=Arm Resource Provider`,
      `${emitterName}.api-version=2023-11-01`,
      `${emitterName}.enable-sync-stack=true`,
      `${emitterName}.rename-model=TopLevelArmResourceListResult:ResourceListResult,CustomTemplateResourcePropertiesAnonymousEmptyModel:AnonymousEmptyModel`,
      `${emitterName}.remove-inner=NginxConfigurationResponse`,
      `${emitterName}.generate-async-methods=true`,
      `${emitterName}.float32-as-double=false`,
      `${emitterName}.uuid-as-string=false`,
    );
  } else if (/tsp\/arm-stream-style-serialization\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.service-name=Arm Resource Provider`,
      `${emitterName}.property-include-always=FunctionConfiguration.input`,
      `${emitterName}.client-side-validations=true`,
    );
  } else if (/tsp\/arm-customization\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.customization-class=../../customization/src/main/java/KeyVaultCustomization.java`,
    );
  } else if (/tsp\/arm-versioned\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.advanced-versioning=true`,
      `${emitterName}.generate-async-methods=true`,
      `${emitterName}.enable-sync-stack=false`,
    );
  } else if (/tsp\/subclient\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.enable-subclient=true`,
      `${emitterName}.include-api-view-properties=false`,
    );
  }

  if (/tsp\/naming\.tsp$/.test(normalized)) {
    options.push(
      `${emitterName}.rename-model=RunObjectLastError1:RunObjectLastErrorRenamed,RunObjectLastErrorCode:RunObjectLastErrorCodeRenamed`,
      `${emitterName}.customization-class=../../customization/src/main/java/CustomizationTest.java`,
    );
  }

  return options;
}

async function compile(typeSpecFile: string, options: string[], timeout: number): Promise<void> {
  const arguments_ = [
    "exec",
    "tsp",
    "compile",
    typeSpecFile,
    ...options.flatMap((option) => ["--option", option]),
    ...traceArguments,
  ];
  const command = `pnpm ${arguments_.join(" ")}`;
  const start = performance.now();
  const result = await execa("pnpm", arguments_, {
    cwd: packageRoot,
    reject: false,
    timeout,
  });
  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  console.log(`
========================
${command}
========================
${result.exitCode === 0 ? "SUCCEEDED" : "FAILED"} (Time elapsed: ${elapsed}s)
${result.exitCode === 0 ? "" : output}
`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to generate from tsp ${typeSpecFile}`);
  }
}

async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  action: (value: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const value = values[next++];
      await action(value);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function removeGeneratedDirectories(root: string): Promise<void> {
  if (!(await pathExists(root))) {
    return;
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const path = join(root, entry.name);
      if (entry.name === "generated") {
        await rm(path, { recursive: true, force: true });
      } else {
        await removeGeneratedDirectories(path);
      }
    }
  }
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: {
      parallelization: { type: "string", short: "p", default: String(availableParallelism()) },
      "skip-build": { type: "boolean", default: false },
    },
  });
  const parallelization = Math.max(1, Number.parseInt(values.parallelization, 10) || 1);
  console.log(`Parallelization: ${parallelization}`);

  if (!values["skip-build"]) {
    await execa("pnpm", ["build"], { cwd: packageRoot, stdio: "inherit" });
  }

  const existingPartialUpdate = join(
    emitterTestsRoot,
    "existingcode",
    "src",
    "main",
    "java",
    "tsptest",
    "partialupdate",
  );
  await mkdir(dirname(existingPartialUpdate), { recursive: true });
  const generatedPartialUpdate = join(
    emitterTestsRoot,
    "src",
    "main",
    "java",
    "tsptest",
    "partialupdate",
  );
  if (await pathExists(generatedPartialUpdate)) {
    await cp(generatedPartialUpdate, existingPartialUpdate, { recursive: true, force: true });
  }

  await Promise.all([
    rm(join(emitterTestsRoot, "src", "main"), { recursive: true, force: true }),
    rm(join(emitterTestsRoot, "src", "samples"), { recursive: true, force: true }),
    rm(join(emitterTestsRoot, "tsp-output"), { recursive: true, force: true }),
    removeGeneratedDirectories(join(emitterTestsRoot, "src", "test")),
  ]);

  const typeSpecRoot = join(emitterTestsRoot, "tsp");
  const localFiles = (await readdir(typeSpecRoot))
    .filter((name) => name.endsWith(".tsp") && !name.includes("partialupdate"))
    .map((name) => join(typeSpecRoot, name));
  await runWithConcurrency(localFiles, parallelization, async (originalFile) => {
    const clientFile = originalFile.replace(/main\.tsp$/, "client.tsp");
    const typeSpecFile =
      clientFile !== originalFile && (await pathExists(clientFile)) ? clientFile : originalFile;
    await compile(typeSpecFile, getGenerationOptions(typeSpecFile), 600_000);
  });

  await compile(
    join(typeSpecRoot, "partialupdate.tsp"),
    [`${emitterName}.emitter-output-dir={project-root}/existingcode`],
    600_000,
  );
  await mkdir(dirname(generatedPartialUpdate), { recursive: true });
  await cp(existingPartialUpdate, generatedPartialUpdate, { recursive: true, force: true });
  await rm(join(emitterTestsRoot, "existingcode"), { recursive: true, force: true });

  const specsRoot = join(emitterTestsRoot, "specs");
  await cp(join(packageRoot, "node_modules", "@typespec", "http-specs", "specs"), specsRoot, {
    recursive: true,
    force: true,
  });
  await cp(
    join(packageRoot, "node_modules", "@azure-tools", "azure-http-specs", "specs"),
    specsRoot,
    { recursive: true, force: true },
  );

  const planResult = await execa(
    "node",
    [join(emitterTestsRoot, "resolve-spector-specs.js"), specsRoot],
    { cwd: emitterTestsRoot },
  );
  const specPlan: { tspFile: string; options: string[] }[] = JSON.parse(planResult.stdout);
  await runWithConcurrency(specPlan, parallelization, (spec) =>
    compile(
      spec.tspFile,
      [
        `${emitterName}.emitter-output-dir={project-root}/tsp-output/${randomInt(2 ** 31)}`,
        ...spec.options,
      ],
      1_200_000,
    ),
  );
  await rm(specsRoot, { recursive: true, force: true });

  const outputRoot = join(emitterTestsRoot, "tsp-output");
  for (const output of await readdir(outputRoot)) {
    const source = join(outputRoot, output, "src");
    if (await pathExists(source)) {
      await cp(source, join(emitterTestsRoot, "src"), {
        recursive: true,
        force: true,
        filter: (path) => !["ReadmeSamples.java", "module-info.java"].includes(basename(path)),
      });
    }
  }
  await rm(outputRoot, { recursive: true, force: true });
}

await main();
