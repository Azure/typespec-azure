package responsebodyornocontentgroup_test

import (
	"context"
	"net/http"
	"responsebodyornocontentgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestBodyOrNoContentClientGetBody(t *testing.T) {
	client, err := responsebodyornocontentgroup.NewBodyOrNoContentClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var rawResponse *http.Response
	ctx := runtime.WithCaptureResponse(context.Background(), &rawResponse)
	resp, err := client.GetBody(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, to.Ptr("hello"), resp.Content)
	require.Equal(t, to.Ptr("body-request"), resp.RequestID)
	require.NotNil(t, rawResponse)
	require.Equal(t, http.StatusOK, rawResponse.StatusCode)
	require.Equal(t, "body-request", rawResponse.Header.Get("x-ms-request-id"))
}

func TestBodyOrNoContentClientGetNoContent(t *testing.T) {
	client, err := responsebodyornocontentgroup.NewBodyOrNoContentClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var rawResponse *http.Response
	ctx := runtime.WithCaptureResponse(context.Background(), &rawResponse)
	resp, err := client.GetNoContent(ctx, nil)
	require.NoError(t, err)
	require.Zero(t, resp.BlobLayout)
	require.Equal(t, to.Ptr("no-content-request"), resp.RequestID)
	require.NotNil(t, rawResponse)
	require.Equal(t, http.StatusNoContent, rawResponse.StatusCode)
	require.Equal(t, "no-content-request", rawResponse.Header.Get("x-ms-request-id"))
}
