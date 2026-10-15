---
title: Post-codegen customization
---

Generated Go SDKs are meant to be regenerated whenever the spec changes, so you should never edit the emitted files by hand—your changes would be lost on the next run. When a customization genuinely cannot be expressed in TypeSpec, use the emitter's `go-generate` option to run a **post-generation transform** as part of emission, so the change is reapplied on every regeneration.

## Prefer client customization in `client.tsp`

Post-generation transforms are a last resort. Before reaching for `go-generate`, check whether the change can be expressed with the client customization decorators from `@azure-tools/typespec-client-generator-core` in your `client.tsp`. Customizing there is language-aware, validated by the compiler, visible to every emitter, and stays correct as the spec evolves—whereas a transform is an opaque text rewrite that silently breaks when the generated code changes shape.

Many common customizations are already supported, for example:

- renaming clients, methods, models, properties, and enum values with `@clientName` (see [Renaming Types](https://azure.github.io/typespec-azure/docs/howtos/generate-client-libraries/09renaming/));
- restructuring the client hierarchy, adding sub-clients, or moving methods between clients with `@client`, `@operationGroup`, and `@clientLocation` (see [Clients](https://azure.github.io/typespec-azure/docs/howtos/generate-client-libraries/03client/));
- reshaping the public surface with `@override`, `@access`, and `@usage` (see [Basic methods](https://azure.github.io/typespec-azure/docs/howtos/generate-client-libraries/04method/));
- replacing generated doc comments with `@clientDoc`;
- scoping any of the above to Go only by passing the `"go"` scope argument, so other languages are unaffected.

See [How to generate client libraries](https://azure.github.io/typespec-azure/docs/howtos/generate-client-libraries/00howtogen/) for the full set of customizations.

Reach for `go-generate` only when the change has no TypeSpec equivalent—for example, adding Go build tags or otherwise editing generated content in ways the emitter has no concept of.

## How it works

When the `go-generate` option is set, the emitter runs the following steps, in order, after it finishes writing the generated code:

1. Emit the SDK into the `emitter-output-dir`.
2. Run `go generate <go-generate-file>` in the `emitter-output-dir`, executing any `//go:generate` directives in that file.
3. Run `gofmt -s -w .` to reformat the (possibly transformed) code.
4. Run `go mod tidy`.

Because the transform runs before formatting and `go mod tidy`, your changes end up properly formatted and any new imports are reconciled automatically.

:::note
The Go toolchain must be on your `PATH`. If `go` is not available and `go-generate` is set, emission fails with an error. If the file named by `go-generate` does not exist under the `emitter-output-dir`, emission also fails.
:::

## Configuring the option

Set `go-generate` to the path of a Go file, relative to the `emitter-output-dir`, that contains one or more `//go:generate` directives:

```yaml
emit:
  - "@azure-tools/typespec-go"
options:
  "@azure-tools/typespec-go":
    module: "github.com/Azure/azure-sdk-for-go/sdk/example/armexample"
    go-generate: "after_generate.go"
```

## Example transform

Create the file referenced by `go-generate` (here `after_generate.go`) at the root of the output directory. It only needs the `//go:generate` directive and a valid `package` clause; the directive points at the program that performs the edits:

```go
//go:generate go run ./generate/transforms.go

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package armexample
```

Then implement the transform program it invokes—`generate/transforms.go`—as a standalone `package main` that rewrites the generated files. A common pattern is a small regex-based find-and-replace helper:

```go
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package main

import (
	"log"
	"os"
	"regexp"
)

// regexReplace rewrites every match of regex in fileName with replace.
func regexReplace(fileName string, regex string, replace string) {
	file, err := os.ReadFile(fileName)
	if err != nil {
		log.Fatal(err)
	}

	file = regexp.MustCompile(regex).ReplaceAll(file, []byte(replace))

	if err := os.WriteFile(fileName, file, 0644); err != nil {
		log.Fatal(err)
	}
}

func main() {
	// Example: adjust a generated marker in zz_models.go.
	regexReplace("zz_models.go", `REQUIRED`, "REQUIRED (transformed)")
}
```

On the next `tsp compile`, the emitter runs `go generate after_generate.go`, which executes `transforms.go` and applies your edits to the freshly generated code. Because the transform is part of emission, the customization is reproducible and survives every regeneration.
