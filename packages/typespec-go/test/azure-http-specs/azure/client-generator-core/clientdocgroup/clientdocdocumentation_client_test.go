// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package clientdocgroup_test

import (
	"clientdocgroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestClientDocDocumentationClient_Harvest(t *testing.T) {
	client, err := clientdocgroup.NewClientDocClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewClientDocDocumentationClient().Harvest(context.Background(), clientdocgroup.Plant{
		Name:    to.Ptr("Rose"),
		Species: to.Ptr("Rosa"),
	}, nil)
	require.NoError(t, err)
	require.Equal(t, to.Ptr("Rose"), resp.Name)
	require.Equal(t, to.Ptr("Rosa"), resp.Species)
}
