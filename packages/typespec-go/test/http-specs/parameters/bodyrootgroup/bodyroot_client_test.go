// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package bodyrootgroup_test

import (
	"bodyrootgroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestBodyRootClient_Nested(t *testing.T) {
	client, err := bodyrootgroup.NewBodyRootClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.Nested(context.Background(), bodyrootgroup.BodyRootModel{
		Category:      to.Ptr("widget"),
		LinkType:      to.Ptr("hard"),
		WasSuccessful: to.Ptr(true),
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
