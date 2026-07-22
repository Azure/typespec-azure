// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package exactnamegroup

import (
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestExactNameEnumValueClient_Send(t *testing.T) {
	client, err := NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNameEnumValueClient().Send(context.Background(), EndpointConfig{Protocol: to.Ptr(AgentEndpointProtocolA2A)}, nil)
	require.NoError(t, err)
	require.Equal(t, to.Ptr(AgentEndpointProtocolA2A), resp.Protocol)
}
