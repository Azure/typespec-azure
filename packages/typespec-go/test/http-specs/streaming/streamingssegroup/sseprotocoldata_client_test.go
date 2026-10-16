package streamingssegroup_test

import (
	"context"
	"streamingssegroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSseProtocolDataClientWithEnvelope(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().NewSseProtocolDataClient().WithEnvelope(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType, "event: withEnvelope\ndata: hello\n\n")
}

func TestSseProtocolDataClientWithoutEnvelope(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseProtocolClient().NewSseProtocolDataClient().WithoutEnvelope(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType,
		"event: withoutEnvelope\ndata: {\"metadata\": {\"source\": \"test\"}, \"contents\": \"world\"}\n\n")
}
