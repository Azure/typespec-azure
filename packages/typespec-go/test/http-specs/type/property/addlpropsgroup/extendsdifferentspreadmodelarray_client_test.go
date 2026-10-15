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

func TestExtendsDifferentSpreadModelArrayClient_Get(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadModelArrayClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, addlpropsgroup.DifferentSpreadModelArrayDerived{
		KnownProp: to.Ptr("abc"),
		DerivedProp: []*addlpropsgroup.ModelForRecord{
			{State: to.Ptr("ok")},
			{State: to.Ptr("ok")},
		},
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{
			"prop": {
				{State: to.Ptr("ok")},
				{State: to.Ptr("ok")},
			},
		},
	}, resp.DifferentSpreadModelArrayDerived)
}

func TestExtendsDifferentSpreadModelArrayClient_Put(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadModelArrayClient().Put(context.Background(), addlpropsgroup.DifferentSpreadModelArrayDerived{
		KnownProp: to.Ptr("abc"),
		DerivedProp: []*addlpropsgroup.ModelForRecord{
			{State: to.Ptr("ok")},
			{State: to.Ptr("ok")},
		},
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{
			"prop": {
				{State: to.Ptr("ok")},
				{State: to.Ptr("ok")},
			},
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
