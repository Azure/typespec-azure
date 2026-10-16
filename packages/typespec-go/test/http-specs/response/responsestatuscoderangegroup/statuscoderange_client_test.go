package responsestatuscoderangegroup_test

import (
	"context"
	"io"
	"responsestatuscoderangegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/stretchr/testify/require"
)

func TestStatusCodeRangeClientErrorResponseStatusCodeInRange(t *testing.T) {
	client, err := responsestatuscoderangegroup.NewStatusCodeRangeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	_, err = client.ErrorResponseStatusCodeInRange(context.Background(), nil)
	var responseError *azcore.ResponseError
	require.ErrorAs(t, err, &responseError)
	require.Equal(t, 494, responseError.StatusCode)
	require.Equal(t, "request-header-too-large", responseError.ErrorCode)
	require.NotNil(t, responseError.RawResponse)
	body, err := io.ReadAll(responseError.RawResponse.Body)
	require.NoError(t, err)
	require.NoError(t, responseError.RawResponse.Body.Close())
	require.JSONEq(t, `{"code":"request-header-too-large","message":"Request header too large"}`, string(body))
}

func TestStatusCodeRangeClientErrorResponseStatusCode404(t *testing.T) {
	client, err := responsestatuscoderangegroup.NewStatusCodeRangeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	_, err = client.ErrorResponseStatusCode404(context.Background(), nil)
	var responseError *azcore.ResponseError
	require.ErrorAs(t, err, &responseError)
	require.Equal(t, 404, responseError.StatusCode)
	require.Equal(t, "not-found", responseError.ErrorCode)
	require.NotNil(t, responseError.RawResponse)
	body, err := io.ReadAll(responseError.RawResponse.Body)
	require.NoError(t, err)
	require.NoError(t, responseError.RawResponse.Body.Close())
	require.JSONEq(t, `{"code":"not-found","resourceId":"resource1"}`, string(body))
}
