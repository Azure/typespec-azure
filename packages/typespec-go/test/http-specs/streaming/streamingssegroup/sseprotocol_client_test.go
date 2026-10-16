package streamingssegroup_test

import (
	"context"
	"net/http"
	"streamingssegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/stretchr/testify/require"
)

func TestSseProtocolClientID(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().ID(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "id: event-1\nevent: message\ndata: {\"message\": \"hello\"}\n\n")
}

func TestSseProtocolClientInvalidID(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().InvalidID(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "id: invalid\x00id\nevent: message\ndata: {\"message\": \"hello\"}\n\n")
}

func TestSseProtocolClientRetry(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().Retry(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "retry: 1000\nevent: message\ndata: {\"message\": \"hello\"}\n\n")
}

func TestSseProtocolClientInvalidRetry(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().InvalidRetry(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "retry: not-a-number\nevent: message\ndata: {\"message\": \"hello\"}\n\n")
}

func TestSseProtocolClientReconnectWithExplicitLastEventID(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	protocolClient := client.NewSseProtocolClient()
	initial, err := protocolClient.Reconnect(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, initial.Body, initial.ContentType, "id: event-1\nevent: message\ndata: {\"message\": \"hello\"}\n\n")
	require.NoError(t, initial.Body.Close())

	ctx := policy.WithHTTPHeader(context.Background(), http.Header{"Last-Event-ID": []string{"event-1"}})
	resp, err := protocolClient.Reconnect(ctx, nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "id: event-2\nevent: message\ndata: {\"message\": \"world\"}\n\n")
}
