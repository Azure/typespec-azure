async function generateCommonTypesSwagger(packages) {
  const basicLatestDir = join(e2eTestDir, "basic-latest");
  const outputDir = join(basicLatestDir, "tsp-output");
  console.log("Clearing basic-latest output");
  rmSync(outputDir, { recursive: true, force: true });
  console.log("Cleared basic-latest output");

  console.log("Installing basic-latest dependencies");
  await runTypeSpec(packages["@typespec/compiler"], ["install"], { cwd: basicLatestDir });
  console.log("Installed basic-latest dependencies");

  console.log("Running tsp compile .");
  await runTypeSpec(
    packages["@typespec/compiler"],
    ["compile", ".", "--emit", "@typespec/openapi3"],
    {
      cwd: basicLatestDir,
    }
  );
  console.log("Completed tsp compile .");

  expectOpenApiOutput(outputDir);
}
