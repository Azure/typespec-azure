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

func TestSpreadStringClient_Get(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesSpreadStringClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, addlpropsgroup.SpreadStringRecord{
		Name: to.Ptr("SpreadSpringRecord"),
		AdditionalProperties: map[string]*string{
			"prop": to.Ptr("abc"),
		},
	}, resp.SpreadStringRecord)
}

func TestSpreadStringClient_Put(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesSpreadStringClient().Put(context.Background(), addlpropsgroup.SpreadStringRecord{
		Name: to.Ptr("SpreadSpringRecord"),
		AdditionalProperties: map[string]*string{
			"prop": to.Ptr("abc"),
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
