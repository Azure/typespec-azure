// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package clientapivergroup_test

import (
	"clientapivergroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/stretchr/testify/require"
)

func TestSendAPIVersion(t *testing.T) {
	client, err := clientapivergroup.NewClientAPIVersionsClientWithNoCredential("http://localhost:3000", &clientapivergroup.ClientAPIVersionsClientOptions{
		ClientOptions: azcore.ClientOptions{
			APIVersion: "2022-10-01",
		},
	})
	require.NoError(t, err)
	_, err = client.SendAPIVersion(context.Background(), nil)
	require.NoError(t, err)
}
