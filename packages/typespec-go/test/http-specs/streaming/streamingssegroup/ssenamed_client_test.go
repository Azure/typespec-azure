package streamingssegroup_test

import (
	"context"
	"streamingssegroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSseNamedClientReceive(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseNamedClient().Receive(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType,
		"event: responseCreated\ndata: {\"id\": \"resp_1\"}\n\n"+
			"event: responseDelta\ndata: {\"delta\": \"Hello\"}\n\n"+
			"event: responseDelta\ndata: {\"delta\": \" world\"}\n\n"+
			"data: [DONE]\n\n")
}
