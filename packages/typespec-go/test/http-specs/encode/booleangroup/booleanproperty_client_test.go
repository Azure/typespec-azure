// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package booleangroup_test

import (
	"booleangroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestBooleanPropertyClient_TrueLower(t *testing.T) {
	client, err := booleangroup.NewBooleanClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewBooleanPropertyClient().TrueLower(
		context.Background(),
		booleangroup.BoolAsStringProperty{Value: to.Ptr(true)},
		nil,
	)
	require.NoError(t, err)
	require.True(t, *resp.Value)
}

func TestBooleanPropertyClient_FalseLower(t *testing.T) {
	client, err := booleangroup.NewBooleanClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewBooleanPropertyClient().FalseLower(
		context.Background(),
		booleangroup.BoolAsStringProperty{Value: to.Ptr(false)},
		nil,
	)
	require.NoError(t, err)
	require.False(t, *resp.Value)
}

func TestBooleanPropertyClient_TrueUpper(t *testing.T) {
	client, err := booleangroup.NewBooleanClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewBooleanPropertyClient().TrueUpper(
		context.Background(),
		booleangroup.BoolAsStringProperty{Value: to.Ptr(true)},
		nil,
	)
	require.NoError(t, err)
	require.True(t, *resp.Value)
}

func TestBooleanPropertyClient_FalseMixed(t *testing.T) {
	client, err := booleangroup.NewBooleanClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewBooleanPropertyClient().FalseMixed(
		context.Background(),
		booleangroup.BoolAsStringProperty{Value: to.Ptr(false)},
		nil,
	)
	require.NoError(t, err)
	require.False(t, *resp.Value)
}
