// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package exactnamegroup_test

import (
	"context"
	"exactnamegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestExactNameEnumValueClient_Send(t *testing.T) {
	client, err := exactnamegroup.NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNameEnumValueClient().Send(context.Background(), exactnamegroup.EndpointConfig{
		Protocol: to.Ptr(exactnamegroup.AgentEndpointProtocolA2A),
	}, nil)
	require.NoError(t, err)
	require.Equal(t, exactnamegroup.EndpointConfig{
		Protocol: to.Ptr(exactnamegroup.AgentEndpointProtocolA2A),
	}, resp.EndpointConfig)
}

func TestExactNameModelClient_Send(t *testing.T) {
	client, err := exactnamegroup.NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNameModelClient().Send(context.Background(), exactnamegroup.My_model{
		Name: to.Ptr("test"),
	}, nil)
	require.NoError(t, err)
	require.Equal(t, exactnamegroup.My_model{
		Name: to.Ptr("test"),
	}, resp.My_model)
}

func TestExactNameOperationClient_MyOp(t *testing.T) {
	client, err := exactnamegroup.NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	_, err = client.NewExactNameOperationClient().MyOp(context.Background(), nil)
	require.NoError(t, err)
}

func TestExactNameParameterClient_Send(t *testing.T) {
	client, err := exactnamegroup.NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	_, err = client.NewExactNameParameterClient().Send(context.Background(), "hello", nil)
	require.NoError(t, err)
}

func TestExactNamePropertyClient_Send(t *testing.T) {
	client, err := exactnamegroup.NewExactNameClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewExactNamePropertyClient().Send(context.Background(), exactnamegroup.ScopedModel{
		MyName: to.Ptr("test"),
	}, nil)
	require.NoError(t, err)
	require.Equal(t, exactnamegroup.ScopedModel{
		MyName: to.Ptr("test"),
	}, resp.ScopedModel)
}
