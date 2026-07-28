---
title: Post-codegen customization
---

Generated Go SDKs are meant to be regenerated whenever the spec changes, so you should never edit the emitted files by hand—your changes would be lost on the next run. When you need to tweak the generated code (for example, to rename a symbol, add a build tag, or adjust a comment), use the emitter's `go-generate` option to run a **post-generation transform** as part of emission.

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
