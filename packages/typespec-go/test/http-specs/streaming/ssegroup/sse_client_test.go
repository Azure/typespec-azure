// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package ssegroup_test

import (
	"context"
	"errors"
	"io"
	"ssegroup"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"github.com/stretchr/testify/require"
)

func newSseClient(t *testing.T) *ssegroup.SseClient {
	t.Helper()
	client, err := ssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client
}

func drain[T any](t *testing.T, s *streaming.SSEReader[T]) []T {
	t.Helper()
	var out []T
	for {
		v, err := s.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		out = append(out, v)
	}
	return out
}

func TestSseUnnamedClientReceive(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseUnnamedClient().OpenReceive(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 3)
	for i, want := range []string{"one", "two", "three"} {
		require.NotNil(t, events[i].Info)
		require.Equal(t, want, *events[i].Info.Desc)
	}
}

func TestSseNamedClientReceive(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseNamedClient().OpenReceive(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	// the terminal [DONE] event ends the stream and is not surfaced as a value
	events := drain(t, stream)
	require.Len(t, events, 3)

	require.NotNil(t, events[0].ResponseCreated)
	require.Equal(t, "resp_1", *events[0].ResponseCreated.ID)
	require.NotNil(t, events[1].ResponseDelta)
	require.Equal(t, "Hello", *events[1].ResponseDelta.Delta)
	require.NotNil(t, events[2].ResponseDelta)
	require.Equal(t, " world", *events[2].ResponseDelta.Delta)
}

func TestSseRetrieveClientStream(t *testing.T) {
	query := "what is typespec?"
	streamResp, err := newSseClient(t).NewSseRetrieveClient().OpenStream(context.Background(), ssegroup.RetrievalRequest{Query: &query}, nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 3)

	require.NotNil(t, events[0].PartialResult)
	require.Equal(t, "partial one", *events[0].PartialResult.Text)
	require.NotNil(t, events[1].PartialResult)
	require.Equal(t, "partial two", *events[1].PartialResult.Text)
	require.NotNil(t, events[2].FinalResult)
	require.Len(t, events[2].FinalResult.References, 2)
	require.Equal(t, "doc1", *events[2].FinalResult.References[0])
	require.Equal(t, "doc2", *events[2].FinalResult.References[1])
}

func TestSseProtocolDataWithEnvelope(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseProtocolClient().NewSseProtocolDataClient().OpenWithEnvelope(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].WithEnvelope)
	require.Equal(t, "hello", *events[0].WithEnvelope.Contents)
}

func TestSseProtocolDataWithoutEnvelope(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseProtocolClient().NewSseProtocolDataClient().OpenWithoutEnvelope(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].WithEnvelope1)
	require.Equal(t, "world", *events[0].WithEnvelope1.Contents)
	require.Equal(t, "test", *events[0].WithEnvelope1.Metadata["source"])
}

func TestSseProtocolID(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	streamResp, err := newSseClient(t).NewSseProtocolClient().OpenID(ctx, nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].ProtocolInfo)
	require.Equal(t, "hello", *events[0].ProtocolInfo.Message)
	require.Equal(t, "event-1", stream.LastEventID())
}

func TestSseProtocolInvalidID(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseProtocolClient().OpenInvalidID(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].ProtocolInfo)
	require.Equal(t, "hello", *events[0].ProtocolInfo.Message)
	// an id containing U+0000 NULL is ignored per the SSE parsing rules
	require.Empty(t, stream.LastEventID())
}

func TestSseProtocolRetry(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseProtocolClient().OpenRetry(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].ProtocolInfo)
	require.Equal(t, "hello", *events[0].ProtocolInfo.Message)
}

func TestSseProtocolInvalidRetry(t *testing.T) {
	streamResp, err := newSseClient(t).NewSseProtocolClient().OpenInvalidRetry(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].ProtocolInfo)
	require.Equal(t, "hello", *events[0].ProtocolInfo.Message)
}

func TestSseProtocolReconnect(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client := newSseClient(t).NewSseProtocolClient()
	streamResp, err := client.OpenReconnect(ctx, nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	event, err := stream.Next()
	require.NoError(t, err)
	require.NotNil(t, event.ProtocolInfo)
	require.Equal(t, "hello", *event.ProtocolInfo.Message)
	require.Equal(t, "event-1", stream.LastEventID())

	lastEventID := stream.LastEventID()
	_, err = stream.Next()
	require.ErrorIs(t, err, io.EOF)
	require.NoError(t, stream.Close())

	streamResp, err = client.OpenReconnect(ctx, &ssegroup.SseProtocolClientOpenReconnectOptions{LastEventID: lastEventID})
	require.NoError(t, err)
	resumed := streamResp.Stream
	require.NotNil(t, resumed)
	defer func() {
		_ = resumed.Close()
	}()
	event, err = resumed.Next()
	require.NoError(t, err)
	require.NotNil(t, event.ProtocolInfo)
	require.Equal(t, "world", *event.ProtocolInfo.Message)
	require.Equal(t, "event-2", resumed.LastEventID())
	_, err = resumed.Next()
	require.ErrorIs(t, err, io.EOF)
}
