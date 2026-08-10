### Initialize TypeSpec Project

Follow [TypeSpec Getting Started](https://typespec.io/docs/) to initialize your TypeSpec project.

Make sure `npx tsp compile .` runs correctly.

### Generate Java

Run `npx tsp compile client.tsp --emit=@azure-tools/typespec-java`
or `npx tsp compile client.tsp --emit=@azure-tools/typespec-java --options='@azure-tools/typespec-java.emitter-output-dir=<target-folder>'`.

If the `emitter-output-dir` option is not provided, the generated Java code will be under the `tsp-output/@azure-tools/typespec-java` folder.

A typical `tspconfig.yaml` looks like:

```yaml
emit:
  - "@azure-tools/typespec-java"
options:
  "@azure-tools/typespec-java":
    emitter-output-dir: "{project-root}/azure-ai-language-authoring"
    service-name: "Authoring"
    generate-samples: true
    generate-tests: true
    partial-update: false
    api-version: "2023-11-01"
```
