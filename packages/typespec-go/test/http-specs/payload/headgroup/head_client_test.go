// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package headgroup_test

import (
	"context"
	"headgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestHeadClient_ContentTypeHeaderInResponse(t *testing.T) {
	client, err := headgroup.NewHeadClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.ContentTypeHeaderInResponse(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
	require.Equal(t, to.Ptr("text/plain; charset=utf-8"), resp.ContentType)
	require.Equal(t, to.Ptr("hello"), resp.Metadata)
}
