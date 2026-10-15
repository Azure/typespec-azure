// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package versioningrenamedfromgroup_test

import (
	"context"
	"testing"
	"versioningrenamedfromgroup"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

const endpoint = "http://localhost:3000"

func newClient(t *testing.T) *versioningrenamedfromgroup.RenamedFromClient {
	client, err := versioningrenamedfromgroup.NewRenamedFromClientWithNoCredential(endpoint, nil)
	require.NoError(t, err)
	return client
}

func TestRenamedFromClient_NewOp(t *testing.T) {
	body := versioningrenamedfromgroup.NewModel{
		NewProp:  to.Ptr("foo"),
		EnumProp: to.Ptr(versioningrenamedfromgroup.NewEnumNewEnumMember),
		UnionProp: &versioningrenamedfromgroup.NewUnion{
			Int32: to.Ptr[int32](10),
		},
	}
	resp, err := newClient(t).NewOp(context.Background(), body, "bar", nil)
	require.NoError(t, err)
	require.NotNil(t, resp.NewProp)
	require.Equal(t, "foo", *resp.NewProp)
	require.NotNil(t, resp.EnumProp)
	require.Equal(t, versioningrenamedfromgroup.NewEnumNewEnumMember, *resp.EnumProp)
	require.NotNil(t, resp.UnionProp)
	require.NotNil(t, resp.UnionProp.Int32)
	require.Equal(t, int32(10), *resp.UnionProp.Int32)
}

func TestRenamedFromNewInterfaceClient_NewOpInNewInterface(t *testing.T) {
	body := versioningrenamedfromgroup.NewModel{
		NewProp:  to.Ptr("foo"),
		EnumProp: to.Ptr(versioningrenamedfromgroup.NewEnumNewEnumMember),
		UnionProp: &versioningrenamedfromgroup.NewUnion{
			Int32: to.Ptr[int32](10),
		},
	}
	resp, err := newClient(t).NewRenamedFromNewInterfaceClient().NewOpInNewInterface(context.Background(), body, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.NewProp)
	require.Equal(t, "foo", *resp.NewProp)
	require.NotNil(t, resp.EnumProp)
	require.Equal(t, versioningrenamedfromgroup.NewEnumNewEnumMember, *resp.EnumProp)
	require.NotNil(t, resp.UnionProp)
	require.NotNil(t, resp.UnionProp.Int32)
	require.Equal(t, int32(10), *resp.UnionProp.Int32)
}
