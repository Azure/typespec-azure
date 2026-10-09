// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package azurecondreqgroup_test

import (
	"azurecondreqgroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestConditionalRequestClient_PostIfMatch(t *testing.T) {
	client, err := azurecondreqgroup.NewConditionalRequestClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.PostIfMatch(context.Background(), &azurecondreqgroup.ConditionalRequestClientPostIfMatchOptions{
		IfMatch: to.Ptr(azcore.ETag(`"valid"`)),
	})
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestConditionalRequestClient_PostIfNoneMatch(t *testing.T) {
	client, err := azurecondreqgroup.NewConditionalRequestClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.PostIfNoneMatch(context.Background(), &azurecondreqgroup.ConditionalRequestClientPostIfNoneMatchOptions{
		IfNoneMatch: to.Ptr(azcore.ETag(`"invalid"`)),
	})
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestConditionalRequestClient_PostCustomIfMatch(t *testing.T) {
	client, err := azurecondreqgroup.NewConditionalRequestClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.PostCustomIfMatch(context.Background(), &azurecondreqgroup.ConditionalRequestClientPostCustomIfMatchOptions{
		IfMatch: to.Ptr(azcore.ETag(`"valid"`)),
	})
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestConditionalRequestClient_PostCustomIfNoneMatch(t *testing.T) {
	client, err := azurecondreqgroup.NewConditionalRequestClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.PostCustomIfNoneMatch(context.Background(), &azurecondreqgroup.ConditionalRequestClientPostCustomIfNoneMatchOptions{
		IfNoneMatch: to.Ptr(azcore.ETag(`"invalid"`)),
	})
	require.NoError(t, err)
	require.Zero(t, resp)
}
