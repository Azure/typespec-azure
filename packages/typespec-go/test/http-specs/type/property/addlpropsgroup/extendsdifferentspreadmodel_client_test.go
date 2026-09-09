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

func TestExtendsDifferentSpreadModelClient_Get(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadModelClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, addlpropsgroup.DifferentSpreadModelDerived{
		KnownProp:   to.Ptr("abc"),
		DerivedProp: &addlpropsgroup.ModelForRecord{State: to.Ptr("ok")},
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{
			"prop": {State: to.Ptr("ok")},
		},
	}, resp.DifferentSpreadModelDerived)
}

func TestExtendsDifferentSpreadModelClient_Put(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadModelClient().Put(context.Background(), addlpropsgroup.DifferentSpreadModelDerived{
		KnownProp:   to.Ptr("abc"),
		DerivedProp: &addlpropsgroup.ModelForRecord{State: to.Ptr("ok")},
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{
			"prop": {State: to.Ptr("ok")},
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
