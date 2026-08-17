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

func TestExtendsDifferentSpreadFloatClient_Get(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadFloatClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, addlpropsgroup.DifferentSpreadFloatDerived{
		Name:        to.Ptr("abc"),
		DerivedProp: to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{
			"prop": to.Ptr[float32](43.125),
		},
	}, resp.DifferentSpreadFloatDerived)
}

func TestExtendsDifferentSpreadFloatClient_Put(t *testing.T) {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewAdditionalPropertiesExtendsDifferentSpreadFloatClient().Put(context.Background(), addlpropsgroup.DifferentSpreadFloatDerived{
		Name:        to.Ptr("abc"),
		DerivedProp: to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{
			"prop": to.Ptr[float32](43.125),
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
