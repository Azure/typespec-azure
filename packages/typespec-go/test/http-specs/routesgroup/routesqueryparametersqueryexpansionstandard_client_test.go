// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"net/url"
	"routesgroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesQueryStandard(t *testing.T) {
	client := newRoutesClient(t).NewRoutesQueryParametersClient().NewRoutesQueryParametersQueryExpansionClient().NewRoutesQueryParametersQueryExpansionStandardClient()
	primitive, err := client.Primitive(context.Background(), "a", nil)
	require.NoError(t, err)
	require.Zero(t, primitive)
	array, err := client.Array(context.Background(), []string{"a", "b"}, nil)
	require.NoError(t, err)
	require.Zero(t, array)
	record, err := client.Record(context.Background(), map[string]int32{"b": 2, "a": 1}, nil)
	require.NoError(t, err)
	require.Zero(t, record)
	model, err := client.Model(context.Background(), routesgroup.ExpandParameters{Field: "status", Value: "active"}, nil)
	require.NoError(t, err)
	require.Zero(t, model)
}

func TestRoutesQueryModelEscapesValues(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/query/query-expansion/standard/model", url.Values{
		"param": {"field,a & b,value,x+y=z"},
	})
	client := root.NewRoutesQueryParametersClient().NewRoutesQueryParametersQueryExpansionClient().NewRoutesQueryParametersQueryExpansionStandardClient()
	_, err := client.Model(context.Background(), routesgroup.ExpandParameters{Field: "a & b", Value: "x+y=z"}, nil)
	require.NoError(t, err)
}

func TestRoutesQueryStandardModelPreservesZeroValues(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/query/query-expansion/standard/model", url.Values{
		"param": {"field,,value,"},
	})
	client := root.NewRoutesQueryParametersClient().NewRoutesQueryParametersQueryExpansionClient().NewRoutesQueryParametersQueryExpansionStandardClient()
	_, err := client.Model(context.Background(), routesgroup.ExpandParameters{}, nil)
	require.NoError(t, err)
}
