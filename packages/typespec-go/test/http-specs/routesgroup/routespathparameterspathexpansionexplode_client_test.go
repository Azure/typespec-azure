// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesPathExplode(t *testing.T) {
	client := newRoutesClient(t).NewRoutesPathParametersClient().NewRoutesPathParametersPathExpansionClient().NewRoutesPathParametersPathExpansionExplodeClient()
	primitive, err := client.Primitive(context.Background(), "a", nil)
	require.NoError(t, err)
	require.Zero(t, primitive)
	array, err := client.Array(context.Background(), []string{"a", "b"}, nil)
	require.NoError(t, err)
	require.Zero(t, array)
	record, err := client.Record(context.Background(), map[string]int32{"b": 2, "a": 1}, nil)
	require.NoError(t, err)
	require.Zero(t, record)
}

func TestRoutesPathPrimitiveEscapesComponents(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/path/explode/primitive/a+b=c&d@e:f$g%20%2F", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersPathExpansionClient().NewRoutesPathParametersPathExpansionExplodeClient()
	_, err := client.Primitive(context.Background(), "a+b=c&d@e:f$g /", nil)
	require.NoError(t, err)
}
