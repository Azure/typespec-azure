package streamingssegroup_test

import (
	"context"
	"streamingssegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestSseRetrieveClientStream(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseRetrieveClient().Stream(context.Background(), streamingssegroup.RetrievalRequest{
		Query: to.Ptr("what is typespec?"),
	}, nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType,
		"event: partialResult\ndata: {\"text\": \"partial one\"}\n\n"+
			"event: partialResult\ndata: {\"text\": \"partial two\"}\n\n"+
			"event: finalResult\ndata: {\"references\": [\"doc1\", \"doc2\"]}\n\n"+
			"data: [DONE]\n\n")
}
