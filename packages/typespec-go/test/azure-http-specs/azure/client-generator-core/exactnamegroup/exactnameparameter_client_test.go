// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package exactnamegroup

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExactNameParameterClient_Send(t *testing.T) {
	client, err := NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNameParameterClient().Send(context.Background(), "hello", nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
