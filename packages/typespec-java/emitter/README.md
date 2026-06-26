# Prerequisite

Install [Node.js](https://nodejs.org/en/download/) 20 or above. (Verify by running `node --version`)

Install [Java](https://docs.microsoft.com/java/openjdk/download) 11 or above. (Verify by running `java --version`)

Install [Maven](https://maven.apache.org/download.cgi). (Verify by running `mvn --version`)

Install [TypeSpec](https://typespec.io/).

# Initialize TypeSpec Project

Follow [TypeSpec Getting Started](https://typespec.io/docs/) to initialize your TypeSpec project.

Make sure `npx tsp compile .` runs correctly.

# Add typespec-java

Run the command `npm install @azure-tools/typespec-java`.

# Generate Java

Run `npx tsp compile client.tsp --emit=@azure-tools/typespec-java`
or `npx tsp compile client.tsp --emit=@azure-tools/typespec-java --options='@azure-tools/typespec-java.emitter-output-dir=<target-folder>'`.

If the `emitter-output-dir` option is not provided, the generated Java code will be under the `tsp-output/@azure-tools/typespec-java` folder.

# Emitter options

`@azure-tools/typespec-java` is the Azure (branded) emitter. It wraps the unbranded
[`@typespec/http-client-java`](https://github.com/microsoft/typespec/tree/main/packages/http-client-java)
emitter and adds Azure-specific emitter options. See
[the emitter options reference](https://azure.github.io/typespec-azure/docs/emitters/clients/typespec-java/reference)
for the full list.

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
