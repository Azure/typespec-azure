// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package bodyornocontentgroup_test

import (
	"bodyornocontentgroup"
	"context"
	"net/http"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestBodyOrNoContentClientGetBody(t *testing.T) {
	client, err := bodyornocontentgroup.NewBodyOrNoContentClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var httpResp *http.Response
	resp, err := client.GetBody(policy.WithCaptureResponse(context.Background(), &httpResp), nil)
	require.NoError(t, err)
	require.Equal(t, to.Ptr("hello"), resp.Content)
	require.Equal(t, to.Ptr("body-request"), resp.RequestID)
	require.NotNil(t, httpResp)
	require.Equal(t, http.StatusOK, httpResp.StatusCode)
	require.Equal(t, "body-request", httpResp.Header.Get("x-ms-request-id"))
}

func TestBodyOrNoContentClientGetNoContent(t *testing.T) {
	client, err := bodyornocontentgroup.NewBodyOrNoContentClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var httpResp *http.Response
	resp, err := client.GetNoContent(policy.WithCaptureResponse(context.Background(), &httpResp), nil)
	require.NoError(t, err)
	require.Zero(t, resp.BlobLayout)
	require.Equal(t, to.Ptr("no-content-request"), resp.RequestID)
	require.NotNil(t, httpResp)
	require.Equal(t, http.StatusNoContent, httpResp.StatusCode)
	require.Equal(t, "no-content-request", httpResp.Header.Get("x-ms-request-id"))
}
