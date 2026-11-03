// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package ssegroup_test

import (
	"context"
	"ssegroup"
	"ssegroup/fake"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func newFakeSseClient(t *testing.T, srv *fake.SseServer) *ssegroup.SseClient {
	t.Helper()
	client, err := ssegroup.NewSseClientWithNoCredential("https://fake.local", &ssegroup.SseClientOptions{
		ClientOptions: azcore.ClientOptions{
			Transport: fake.NewSseServerTransport(srv),
		},
	})
	require.NoError(t, err)
	return client
}

func TestFakeSseNamedReceive(t *testing.T) {
	srv := &fake.SseServer{
		SseNamedServer: fake.SseNamedServer{
			OpenReceive: func(ctx context.Context, options *ssegroup.SseNamedClientOpenReceiveOptions) (resp azfake.SSEResponder[ssegroup.ResponseEvents], errResp azfake.ErrorResponder) {
				resp.AddEvent(ssegroup.ResponseEvents{ResponseCreated: &ssegroup.ResponseCreated{ID: to.Ptr("resp_1")}})
				resp.AddEvent(ssegroup.ResponseEvents{ResponseDelta: &ssegroup.ResponseDelta{Delta: to.Ptr("Hello")}})
				return
			},
		},
	}

	streamResp, err := newFakeSseClient(t, srv).NewSseNamedClient().OpenReceive(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 2)
	require.Equal(t, "resp_1", *events[0].ResponseCreated.ID)
	require.Equal(t, "Hello", *events[1].ResponseDelta.Delta)
}

func TestFakeSseUnnamedReceive(t *testing.T) {
	srv := &fake.SseServer{
		SseUnnamedServer: fake.SseUnnamedServer{
			OpenReceive: func(ctx context.Context, options *ssegroup.SseUnnamedClientOpenReceiveOptions) (resp azfake.SSEResponder[ssegroup.UnnamedEvents], errResp azfake.ErrorResponder) {
				resp.AddEvent(ssegroup.UnnamedEvents{Info: &ssegroup.Info{Desc: to.Ptr("one")}})
				resp.AddEvent(ssegroup.UnnamedEvents{Info: &ssegroup.Info{Desc: to.Ptr("two")}})
				return
			},
		},
	}

	streamResp, err := newFakeSseClient(t, srv).NewSseUnnamedClient().OpenReceive(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 2)
	require.Equal(t, "one", *events[0].Info.Desc)
	require.Equal(t, "two", *events[1].Info.Desc)
}

func TestFakeSseRetrieveStream(t *testing.T) {
	var gotQuery string
	srv := &fake.SseServer{
		SseRetrieveServer: fake.SseRetrieveServer{
			OpenStream: func(ctx context.Context, request ssegroup.RetrievalRequest, options *ssegroup.SseRetrieveClientOpenStreamOptions) (resp azfake.SSEResponder[ssegroup.RetrievalEvents], errResp azfake.ErrorResponder) {
				if request.Query != nil {
					gotQuery = *request.Query
				}
				resp.AddEvent(ssegroup.RetrievalEvents{PartialResult: &ssegroup.PartialResult{Text: to.Ptr("partial one")}})
				resp.AddEvent(ssegroup.RetrievalEvents{FinalResult: &ssegroup.FinalResult{References: []*string{to.Ptr("doc1"), to.Ptr("doc2")}}})
				return
			},
		},
	}

	streamResp, err := newFakeSseClient(t, srv).NewSseRetrieveClient().OpenStream(context.Background(), ssegroup.RetrievalRequest{Query: to.Ptr("what is typespec?")}, nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Equal(t, "what is typespec?", gotQuery)
	require.Len(t, events, 2)
	require.Equal(t, "partial one", *events[0].PartialResult.Text)
	require.Len(t, events[1].FinalResult.References, 2)
}

func TestFakeSseProtocolIDWithEnvelopeMetadata(t *testing.T) {
	srv := &fake.SseServer{
		SseProtocolServer: fake.SseProtocolServer{
			OpenID: func(ctx context.Context, options *ssegroup.SseProtocolClientOpenIDOptions) (resp azfake.SSEResponder[ssegroup.ProtocolEvents], errResp azfake.ErrorResponder) {
				// AddFrame gives full control over the SSE envelope, including the event id
				resp.AddFrame(streaming.SSEFrame{ID: to.Ptr("event-1"), Type: "message", Data: []byte(`{"message":"hello"}`)})
				return
			},
		},
	}

	streamResp, err := newFakeSseClient(t, srv).NewSseProtocolClient().OpenID(context.Background(), nil)
	require.NoError(t, err)
	stream := streamResp.Stream
	require.NotNil(t, stream)
	defer func() {
		_ = stream.Close()
	}()

	events := drain(t, stream)
	require.Len(t, events, 1)
	require.Equal(t, "hello", *events[0].ProtocolInfo.Message)
	require.Equal(t, "event-1", stream.LastEventID())
}
