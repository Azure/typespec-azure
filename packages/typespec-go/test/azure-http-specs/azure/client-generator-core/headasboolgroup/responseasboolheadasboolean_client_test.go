// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package headasboolgroup_test

import (
	"context"
	"headasboolgroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResponseAsBoolHeadAsBooleanClient_Exists(t *testing.T) {
	client, err := headasboolgroup.NewResponseAsBoolClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewResponseAsBoolHeadAsBooleanClient().Exists(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
}

func TestResponseAsBoolHeadAsBooleanClient_NotExists(t *testing.T) {
	client, err := headasboolgroup.NewResponseAsBoolClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewResponseAsBoolHeadAsBooleanClient().NotExists(context.Background(), nil)
	require.NoError(t, err)
	require.False(t, resp.Success)
}
