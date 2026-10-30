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
		"param": {"field,a,value,b & c,value,x+y=z"},
	}, "param=field,a%2Cvalue%2Cb%20%26%20c,value,x%2By%3Dz")
	client := root.NewRoutesQueryParametersClient().NewRoutesQueryParametersQueryExpansionClient().NewRoutesQueryParametersQueryExpansionStandardClient()
	_, err := client.Model(context.Background(), routesgroup.ExpandParameters{Field: "a,value,b & c", Value: "x+y=z"}, nil)
	require.NoError(t, err)
}

func TestRoutesQueryRecordPreservesComponentBoundaries(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/query/query-expansion/standard/record", url.Values{
		"param": {"%2C,2,a,b + c,1"},
	}, "param=%252C,2,a%2Cb%20%2B%20c,1")
	client := root.NewRoutesQueryParametersClient().NewRoutesQueryParametersQueryExpansionClient().NewRoutesQueryParametersQueryExpansionStandardClient()
	_, err := client.Record(context.Background(), map[string]int32{"a,b + c": 1, "%2C": 2}, nil)
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
