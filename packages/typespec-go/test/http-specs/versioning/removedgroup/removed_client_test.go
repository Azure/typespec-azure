// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package removedgroup_test

import (
	"context"
	"testing"

	"removedgroup"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestRemovedClientModelV3V1(t *testing.T) {
	client, err := removedClient("v1")
	require.NoError(t, err)

	resp, err := client.ModelV3(context.Background(), removedgroup.ModelV3{ID: to.Ptr("123"), EnumProp: to.Ptr(removedgroup.EnumV3EnumMemberV1)}, nil)
	require.NoError(t, err)
	require.Equal(t, removedgroup.ModelV3{ID: to.Ptr("123"), EnumProp: to.Ptr(removedgroup.EnumV3EnumMemberV1)}, resp.ModelV3)
}

func TestRemovedClientModelV3V2Preview(t *testing.T) {
	client, err := removedClient("v2preview")
	require.NoError(t, err)

	resp, err := client.ModelV3(context.Background(), removedgroup.ModelV3{ID: to.Ptr("123")}, nil)
	require.NoError(t, err)
	require.Equal(t, removedgroup.ModelV3{ID: to.Ptr("123")}, resp.ModelV3)
}

func TestRemovedClientModelV3V2(t *testing.T) {
	client, err := removedClient("v2")
	require.NoError(t, err)

	resp, err := client.ModelV3(context.Background(), removedgroup.ModelV3{ID: to.Ptr("123"), EnumProp: to.Ptr(removedgroup.EnumV3EnumMemberV1)}, nil)
	require.NoError(t, err)
	require.Equal(t, removedgroup.ModelV3{ID: to.Ptr("123"), EnumProp: to.Ptr(removedgroup.EnumV3EnumMemberV1)}, resp.ModelV3)
}

func TestRemovedClientV2(t *testing.T) {
	client, err := removedClient("v2")
	require.NoError(t, err)

	body := removedgroup.ModelV2{
		Prop:      to.Ptr("foo"),
		EnumProp:  to.Ptr(removedgroup.EnumV2EnumMemberV2),
		UnionProp: &removedgroup.UnionV2{String: to.Ptr("bar")},
	}
	resp, err := client.V2(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.ModelV2)
}

func removedClient(apiVersion string) (*removedgroup.RemovedClient, error) {
	options := &removedgroup.RemovedClientOptions{}
	options.APIVersion = apiVersion
	return removedgroup.NewRemovedClientWithNoCredential("http://localhost:3000", options)
}
