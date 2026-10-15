// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package main

import (
	"log"
	"os"
	"regexp"
)

// regexReplace rewrites every match of regex in fileName with replace. It is the
// building block for post-generation transforms invoked via the emitter's
// `go-generate` option (see ../../after_generate.go).
func regexReplace(fileName string, regex string, replace string) {
	file, err := os.ReadFile(fileName)
	if err != nil {
		log.Fatal(err)
	}

	r := regexp.MustCompile(regex)
	file = r.ReplaceAll(file, []byte(replace))

	err = os.WriteFile(fileName, file, 0644)
	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	// Demonstrates a post-generation edit: annotate the REQUIRED marker so a test
	// can confirm the transform ran during emission.
	regexReplace("zz_models.go", `REQUIRED`, "REQUIRED (transformed)")
}
