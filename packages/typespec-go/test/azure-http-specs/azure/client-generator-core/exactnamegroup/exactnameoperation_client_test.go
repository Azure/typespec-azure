// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package exactnamegroup

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExactNameOperationClient_MyOp(t *testing.T) {
	client, err := NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNameOperationClient().myOp(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
