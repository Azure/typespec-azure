// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesMatrixExplode(t *testing.T) {
	client := newRoutesClient(t).NewRoutesPathParametersClient().NewRoutesPathParametersMatrixExpansionClient().NewRoutesPathParametersMatrixExpansionExplodeClient()
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

func TestRoutesMatrixRecordEscapesKeys(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/matrix/explode/record;a=b%3Bc%2Fd=1;z=0", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersMatrixExpansionClient().NewRoutesPathParametersMatrixExpansionExplodeClient()
	_, err := client.Record(context.Background(), map[string]int32{
		"z": 0, "a=b;c/d": 1,
	}, nil)
	require.NoError(t, err)
}

func TestRoutesMatrixRecordRejectsEmpty(t *testing.T) {
	client := newRoutesClient(t).NewRoutesPathParametersClient().NewRoutesPathParametersMatrixExpansionClient().NewRoutesPathParametersMatrixExpansionExplodeClient()
	for _, value := range []map[string]int32{nil, {}} {
		_, err := client.Record(context.Background(), value, nil)
		require.EqualError(t, err, "parameter param cannot be empty")
	}
}

func TestRoutesMatrixPrimitiveEscapesComponents(t *testing.T) {
	root := newRoutesRequestClient(t, "/routes/path/matrix/explode/primitive;param=a+b=c&d@e:f$g%20%2F", url.Values{})
	client := root.NewRoutesPathParametersClient().NewRoutesPathParametersMatrixExpansionClient().NewRoutesPathParametersMatrixExpansionExplodeClient()
	_, err := client.Primitive(context.Background(), "a+b=c&d@e:f$g /", nil)
	require.NoError(t, err)
}
