// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesQueryParameters(t *testing.T) {
	client := newRoutesClient(t).NewRoutesQueryParametersClient()
	template, err := client.TemplateOnly(context.Background(), "a", nil)
	require.NoError(t, err)
	require.Zero(t, template)
	explicit, err := client.Explicit(context.Background(), "a", nil)
	require.NoError(t, err)
	require.Zero(t, explicit)
	annotation, err := client.AnnotationOnly(context.Background(), "a", nil)
	require.NoError(t, err)
	require.Zero(t, annotation)
}
