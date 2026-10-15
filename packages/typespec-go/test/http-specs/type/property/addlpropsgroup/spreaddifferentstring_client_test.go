// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package addlpropsgroup_test

import (
	"addlpropsgroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestSpreadDifferentStringClient_Get(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesSpreadDifferentStringClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, addlpropsgroup.DifferentSpreadStringRecord{
		ID: to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*string{
			"prop": to.Ptr("abc"),
		},
	}, resp.DifferentSpreadStringRecord)
}

func TestSpreadDifferentStringClient_Put(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesSpreadDifferentStringClient().Put(context.Background(), addlpropsgroup.DifferentSpreadStringRecord{
		ID: to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*string{
			"prop": to.Ptr("abc"),
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
