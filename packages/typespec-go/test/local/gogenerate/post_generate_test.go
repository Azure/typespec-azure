// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package gogenerate_test

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestPostGenerationTransform verifies the emitter's `go-generate` option ran the
// //go:generate transform (see after_generate.go) during emission, post-processing
// the generated source: the transform annotates the REQUIRED marker in zz_models.go
// with "(transformed)". If the transform had not run, the marker would be the plain
// "// REQUIRED;" that the generator emits.
func TestPostGenerationTransform(t *testing.T) {
	content, err := os.ReadFile("zz_models.go")
	require.NoError(t, err)
	require.Contains(t, string(content), "REQUIRED (transformed)",
		"expected the //go:generate transform to have run during emission")
}
