// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesReservedExpansion(t *testing.T) {
	client := newRoutesClient(t).NewRoutesPathParametersClient().NewRoutesPathParametersReservedExpansionClient()
	template, err := client.Template(context.Background(), "foo/bar baz", nil)
	require.NoError(t, err)
	require.Zero(t, template)
	annotation, err := client.Annotation(context.Background(), "foo/bar baz", nil)
	require.NoError(t, err)
	require.Zero(t, annotation)
}
