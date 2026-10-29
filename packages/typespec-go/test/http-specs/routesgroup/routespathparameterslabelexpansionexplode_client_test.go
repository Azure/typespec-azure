// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesLabelExplode(t *testing.T) {
	client := newRoutesClient(t).NewRoutesPathParametersClient().NewRoutesPathParametersLabelExpansionClient().NewRoutesPathParametersLabelExpansionExplodeClient()
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

func TestRoutesLabelArrayEscapesComponents(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/label/explode/array.a%2Fb%2Cc%3Bd=e%20f+.z", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersLabelExpansionClient().NewRoutesPathParametersLabelExpansionExplodeClient()
	_, err := client.Array(context.Background(), []string{"a/b,c;d=e f+", "z"}, nil)
	require.NoError(t, err)
}

func TestRoutesLabelArrayPreservesEmptyElements(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/label/explode/array.a..b", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersLabelExpansionClient().NewRoutesPathParametersLabelExpansionExplodeClient()
	_, err := client.Array(context.Background(), []string{"a", "", "b"}, nil)
	require.NoError(t, err)
}

func TestRoutesLabelPrimitiveEscapesComponents(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/label/explode/primitive.a+b=c&d@e:f$g%20%2F", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersLabelExpansionClient().NewRoutesPathParametersLabelExpansionExplodeClient()
	_, err := client.Primitive(context.Background(), "a+b=c&d@e:f$g /", nil)
	require.NoError(t, err)
}
