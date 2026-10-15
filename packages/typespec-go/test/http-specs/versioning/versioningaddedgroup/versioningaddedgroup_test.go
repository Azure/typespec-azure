// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package versioningaddedgroup_test

import (
	"context"
	"testing"
	"versioningaddedgroup"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

const endpoint = "http://localhost:3000"

func newClient(t *testing.T) *versioningaddedgroup.AddedClient {
	client, err := versioningaddedgroup.NewAddedClientWithNoCredential(endpoint, nil)
	require.NoError(t, err)
	return client
}

func TestAddedClient_V1(t *testing.T) {
	body := versioningaddedgroup.ModelV1{
		Prop:      to.Ptr("foo"),
		EnumProp:  to.Ptr(versioningaddedgroup.EnumV1EnumMemberV2),
		UnionProp: &versioningaddedgroup.UnionV1{Int32: to.Ptr[int32](10)},
	}
	resp, err := newClient(t).V1(context.Background(), body, "bar", nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, "foo", *resp.Prop)
	require.NotNil(t, resp.EnumProp)
	require.Equal(t, versioningaddedgroup.EnumV1EnumMemberV2, *resp.EnumProp)
	require.NotNil(t, resp.UnionProp)
	require.NotNil(t, resp.UnionProp.Int32)
	require.Equal(t, int32(10), *resp.UnionProp.Int32)
}

func TestAddedClient_V2(t *testing.T) {
	body := versioningaddedgroup.ModelV2{
		Prop:      to.Ptr("foo"),
		EnumProp:  to.Ptr(versioningaddedgroup.EnumV2EnumMember),
		UnionProp: &versioningaddedgroup.UnionV2{String: to.Ptr("bar")},
	}
	resp, err := newClient(t).V2(context.Background(), body, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, "foo", *resp.Prop)
	require.NotNil(t, resp.EnumProp)
	require.Equal(t, versioningaddedgroup.EnumV2EnumMember, *resp.EnumProp)
	require.NotNil(t, resp.UnionProp)
	require.NotNil(t, resp.UnionProp.String)
	require.Equal(t, "bar", *resp.UnionProp.String)
}

func TestAddedInterfaceV2Client_V2InInterface(t *testing.T) {
	body := versioningaddedgroup.ModelV2{
		Prop:      to.Ptr("foo"),
		EnumProp:  to.Ptr(versioningaddedgroup.EnumV2EnumMember),
		UnionProp: &versioningaddedgroup.UnionV2{String: to.Ptr("bar")},
	}
	resp, err := newClient(t).NewAddedInterfaceV2Client().V2InInterface(context.Background(), body, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, "foo", *resp.Prop)
	require.NotNil(t, resp.EnumProp)
	require.Equal(t, versioningaddedgroup.EnumV2EnumMember, *resp.EnumProp)
	require.NotNil(t, resp.UnionProp)
	require.NotNil(t, resp.UnionProp.String)
	require.Equal(t, "bar", *resp.UnionProp.String)
}
