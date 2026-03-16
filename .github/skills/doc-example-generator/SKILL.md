---
name: doc-example-generator
description: >
  Generate verified code examples for TypeSpec documentation. Use this skill to create TypeSpec
  examples that compile successfully, then run each language emitter to extract real API surface
  code for the <ClientTabs> blocks in user-facing docs.
---

# Doc Example Generator

You are a code-example generation agent for TypeSpec documentation. Your goal is to produce verified, real-world code examples that:

1. **TypeSpec code compiles** — every `.tsp` example passes `tsp compile` with no errors
2. **Language tabs show real emitter output** — each language's code is extracted from actual emitter-generated output, not hand-written

## Scope and Guardrails

This skill operates in a **temporary working directory** to compile and generate code. It does **NOT** commit the temp directory — only the resulting `<ClientTabs>` block is used in documentation.

## Workflow

### Step 1: Set Up Temporary Project

1. Create a temp directory (e.g., `/tmp/tsp-doc-example-<feature>/` or a workspace-relative `.tmp/` folder)
2. Copy the `package.json` from this skill's directory (`package.json` next to this file) into the temp directory

3. Run `npm install --legacy-peer-deps` to install all dependencies

### Step 2: Write and Validate TypeSpec Example

1. Create a `main.tsp` file containing the example code. The example must:
   - Use the `@service` to decorate the main service namespace
   - Include `import` and `using` statements for all required libraries
   - Be self-contained — no external file dependencies beyond installed packages
   - Demonstrate the specific feature being documented

2. If the example involves client customization decorators (e.g., `@clientName`, `@access`, `@usage` from `@azure-tools/typespec-client-generator-core`), create a separate `client.tsp` that imports `main.tsp` and applies the decorators using augment syntax (`@@decorator`). This mirrors the recommended user pattern.

3. Copy the `tspconfig.yaml` from this skill's directory (`tspconfig.yaml` next to this file) into the temp directory. Add extra emitter options only if the example specifically needs them.

4. Run `npx tsp compile .` and verify it succeeds with **zero errors**
   - **Critical:** If a `client.tsp` file exists, you MUST use it as the entry point: `npx tsp compile client.tsp`. Compiling with `.` only picks up `main.tsp` and will NOT apply augment decorators from `client.tsp`.
   - For `@azure-typespec/http-client-csharp` emitter, you need to add an empty `metadata.json` file in the output directory to trigger code generation. Create an empty file at `tsp-output/@azure-typespec/http-client-csharp/metadata.json` before running compilation.
   - If compilation fails, fix the `.tsp` files and re-compile until it passes
   - Do NOT proceed to Step 3 until compilation is clean
   

### Step 3: Generate Language Code

1. After successful compilation, the emitter output will be in the `tsp-output/` directory, organized by emitter package name
2. For each language, locate the generated output directory:
   - Python: `tsp-output/@azure-tools/typespec-python/`
   - C#: `tsp-output/@azure-typespec/http-client-csharp/`
   - TypeScript: `tsp-output/@azure-tools/typespec-ts/`
   - Java: `tsp-output/@azure-tools/typespec-java/`
   - Go: `tsp-output/@azure-tools/typespec-go/`

### Step 4: Extract Key API Surface Code

For each language's generated output, extract **only the key API surface** — the public types, method signatures, and usage patterns that illustrate the feature being documented. Do NOT include:

- Internal implementation details or private methods
- Boilerplate imports/headers (unless they clarify the example)
- Full file contents — only the relevant class, method, or type declarations

**What to extract depends on the documentation goal:**

| Documentation Topic            | What to Extract                                                       |
| ------------------------------ | --------------------------------------------------------------------- |
| Model renaming / customization | The renamed class/struct/type declaration showing the new name        |
| Access control                 | The public API showing which operations/models are exposed or hidden  |
| Client structure               | Client class declarations and operation group hierarchy               |
| Method signatures              | The method/function signatures showing parameters, return types       |
| Type customization             | Model/enum/union type declarations showing the customized shape       |
| Paging                         | The paging method signature and page result type                      |
| Long-running operations        | The LRO method signature and poller/operation types                   |
| General feature                | The public types and operations most directly affected by the feature |

**General extraction rules:**

1. Show the **public class/struct/interface declaration** with its key members
2. Show **method signatures** (name, parameters, return type) without method bodies
3. Include a brief **usage snippet** (instantiate client, call the method) when it clarifies behavior
4. For Go: include the constructor function and key exported types
5. For Python: include the class definition with key methods and a usage comment
6. For Java: include the builder pattern if client-related, otherwise just the class and methods
7. For C#: include both async and sync method signatures when relevant
8. For TypeScript: include the interface/type definition and function signature

### Step 5: Assemble the `<ClientTabs>` Block

Combine the TypeSpec source and extracted language code into a `<ClientTabs>` block following this exact format:

````mdx
<ClientTabs>

```typespec title="main.tsp"
// TypeSpec code from main.tsp
```

```typespec title="client.tsp"
// TypeSpec code from client.tsp if applicable
```

```python
# Extracted Python API surface
```

```csharp
// Extracted C# API surface
```

```typescript
// Extracted TypeScript API surface
```

```java
// Extracted Java API surface
```

```go
// Extracted Go API surface
```

</ClientTabs>
````

**Formatting rules:**

- The TypeSpec block always comes first
- Language blocks follow in this order: python, csharp, typescript, java, go
- If a feature is not supported by a language, use a comment: `// NOT_SUPPORTED` or `# NOT_SUPPORTED`
- If the TypeSpec example uses separate `main.tsp` and `client.tsp` files, include both in the TypeSpec block with a `title` attribute:

  ````mdx
  ```typespec title=main.tsp
  // main service definition
  ```

  ```typespec title=client.tsp
  // client customization decorators
  ```
  ````

### Step 6: Clean Up

1. Delete the temporary project directory
2. Return the assembled `<ClientTabs>` block to be inserted into documentation

## Error Handling

- **TypeSpec compilation fails:** Fix the `.tsp` code. Check decorator signatures against the relevant library's `.tsp` definitions. Re-compile until clean.
- **Emitter generation fails for one language:** Note the failure, use `// TODO: fill in <language> example manually — emitter generation failed (<brief reason>)` as a placeholder in that language's tab. Do not block other languages.
- **Generated output is empty or unexpected:** Verify the `tspconfig.yaml` emitter configuration. Check that the example uses patterns the emitter supports.
- **Cannot determine what to extract:** Default to extracting the main client class and any models/operations that are directly affected by the feature being documented.
- **`@clientName` or other TCGC augment decorators not taking effect:** You are likely compiling `main.tsp` instead of `client.tsp`. The entry point must be the file that imports everything — use `npx tsp compile client.tsp`.

## Emitter Runtime Requirements

Some emitters require language-specific runtimes to generate code. If a runtime is missing, the emitter may report an error or produce no output.

| Emitter    | Runtime Requirements                                      | Fallback                              |
| ---------- | --------------------------------------------------------- | ------------------------------------- |
| Python     | Python 3.9+ (or set `use-pyodide: true` in tspconfig)     | `use-pyodide: true` uses WASM Python  |
| Java       | JDK 17+ and Apache Maven                                  | No fallback — skip if unavailable     |
| C#         | .NET SDK                                                  | Emitter produces only `metadata.json` |
| TypeScript | Node.js (always available); set `azure-sdk-for-js: false` | May produce empty output — see note   |
| Go         | Go 1.20+; set `module` option in tspconfig                | No fallback — skip if unavailable     |

> **Note on TypeScript:** The TS emitter may produce empty output (0ms) even when reporting success. Ensure `azure-sdk-for-js: false` and `is-typespec-test: true` are set in tspconfig options. If output is still empty, the emitter may require additional setup for standalone use.

## Quality Checklist

Before returning the `<ClientTabs>` block, verify:

- [ ] TypeSpec code compiles with zero errors
- [ ] All five language tabs are present
- [ ] Language code is extracted from real emitter output (not hand-written)
- [ ] Only key API surface is shown (no internal implementation details)
- [ ] The extracted code clearly demonstrates the documented feature or customization
- [ ] Code formatting is clean and consistent with existing doc examples
- [ ] Temporary project directory has been cleaned up
