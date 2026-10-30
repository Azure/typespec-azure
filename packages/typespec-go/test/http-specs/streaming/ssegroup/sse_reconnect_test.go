// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package ssegroup_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"ssegroup"
	"ssegroup/fake"
	"sync/atomic"
	"testing"
	"time"

	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSseDoesNotAutomaticallyReconnect(t *testing.T) {
	for _, tc := range []struct {
		name    string
		options *ssegroup.SseProtocolClientOpenIDOptions
		wantID  string
	}{
		{name: "nil options"},
		{name: "zero options", options: &ssegroup.SseProtocolClientOpenIDOptions{}},
		{name: "explicit empty", options: &ssegroup.SseProtocolClientOpenIDOptions{LastEventID: ""}},
		{name: "checkpoint", options: &ssegroup.SseProtocolClientOpenIDOptions{LastEventID: "saved-event"}, wantID: "saved-event"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				assert.Equal(t, tc.wantID, r.Header.Get("Last-Event-ID"))
				if tc.wantID == "" {
					_, present := r.Header["Last-Event-Id"]
					assert.False(t, present, "empty checkpoint must omit the header")
				}
				w.Header().Set("Content-Type", "text/event-stream")
				_, _ = fmt.Fprint(w, "id: event-1\nevent: message\ndata: {\"message\":\"hello\"}\n\n")
			}))
			defer server.Close()

			client, err := ssegroup.NewSseClientWithNoCredential(server.URL, nil)
			require.NoError(t, err)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			resp, err := client.NewSseProtocolClient().OpenID(ctx, tc.options)
			require.NoError(t, err)
			defer func() {
				_ = resp.Stream.Close()
			}()

			event, err := resp.Stream.Next()
			require.NoError(t, err)
			require.NotNil(t, event.ProtocolInfo)
			require.Equal(t, "hello", *event.ProtocolInfo.Message)
			require.Equal(t, "event-1", resp.Stream.LastEventID())
			_, err = resp.Stream.Next()
			require.ErrorIs(t, err, io.EOF)
			_, err = resp.Stream.Next()
			require.ErrorIs(t, err, io.EOF)
			require.EqualValues(t, 1, requests.Load())
		})
	}
}

func TestSseInitialCheckpointWithoutWireID(t *testing.T) {
	for _, tc := range []struct {
		name    string
		options *ssegroup.SseProtocolClientOpenIDOptions
		wantID  string
	}{
		{name: "nil options"},
		{name: "zero options", options: &ssegroup.SseProtocolClientOpenIDOptions{}},
		{name: "explicit empty", options: &ssegroup.SseProtocolClientOpenIDOptions{LastEventID: ""}},
		{name: "checkpoint", options: &ssegroup.SseProtocolClientOpenIDOptions{LastEventID: "saved-event"}, wantID: "saved-event"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var requests atomic.Int32
			headers := make(chan http.Header, 1)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if requests.Add(1) == 1 {
					headers <- r.Header.Clone()
				}
				w.Header().Set("Content-Type", "text/event-stream")
				_, _ = fmt.Fprint(w, "event: message\ndata: {\"message\":\"hello\"}\n\n")
			}))
			t.Cleanup(server.Close)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			t.Cleanup(cancel)
			root, err := ssegroup.NewSseClientWithNoCredential(server.URL, nil)
			require.NoError(t, err)
			resp, err := root.NewSseProtocolClient().OpenID(ctx, tc.options)
			require.NoError(t, err)
			require.NotNil(t, resp.Stream)
			t.Cleanup(func() { require.NoError(t, resp.Stream.Close()) })
			require.EqualValues(t, 1, requests.Load(), "the initial request must be eager")
			header := <-headers
			require.Equal(t, tc.wantID, header.Get("Last-Event-ID"))
			if tc.wantID == "" {
				require.NotContains(t, header, "Last-Event-Id")
			}
			require.Equal(t, tc.wantID, resp.Stream.LastEventID())
			event, err := resp.Stream.Next()
			require.NoError(t, err)
			require.NotNil(t, event.ProtocolInfo)
			require.Equal(t, "hello", *event.ProtocolInfo.Message)
			require.Equal(t, tc.wantID, resp.Stream.LastEventID())
			for range 2 {
				_, err = resp.Stream.Next()
				require.ErrorIs(t, err, io.EOF)
			}
			require.EqualValues(t, 1, requests.Load())
		})
	}
}

func TestSseResumeFromCheckpoint(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		switch count {
		case 1:
			assert.Empty(t, r.Header.Get("Last-Event-ID"))
			_, _ = fmt.Fprint(w, "id: event-1\nevent: responseDelta\ndata: {\"delta\":\"hello\"}\n\nid: event-2\nevent: responseDelta\ndata: {\"delta\":\"world\"}\n\n")
		case 2:
			assert.Equal(t, "event-1", r.Header.Get("Last-Event-ID"))
			_, _ = fmt.Fprint(w, "id: event-2\nevent: responseDelta\ndata: {\"delta\":\"world\"}\n\n")
		default:
			t.Error("unexpected automatic reconnect")
		}
	}))
	defer server.Close()

	client, err := ssegroup.NewSseClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	named := client.NewSseNamedClient()
	resp, err := named.OpenReceive(ctx, nil)
	require.NoError(t, err)
	defer func() {
		_ = resp.Stream.Close()
	}()

	event, err := resp.Stream.Next()
	require.NoError(t, err)
	require.NotNil(t, event.ResponseDelta)
	require.Equal(t, "hello", *event.ResponseDelta.Delta)
	lastEventID := resp.Stream.LastEventID()
	require.Equal(t, "event-1", lastEventID)
	require.NoError(t, resp.Stream.Close())
	require.EqualValues(t, 1, requests.Load())

	resumed, err := named.OpenReceive(ctx, &ssegroup.SseNamedClientOpenReceiveOptions{LastEventID: lastEventID})
	require.NoError(t, err)
	defer func() {
		_ = resumed.Stream.Close()
	}()
	events := drain(t, resumed.Stream)
	require.Len(t, events, 1)
	require.NotNil(t, events[0].ResponseDelta)
	require.Equal(t, "world", *events[0].ResponseDelta.Delta)
	require.Equal(t, "event-2", resumed.Stream.LastEventID())
	require.EqualValues(t, 2, requests.Load())
}

func TestSseReadErrorDoesNotReconnect(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Content-Length", "1000")
		_, _ = fmt.Fprint(w, "id: event-1\nevent: message\ndata: {\"message\":\"hello\"}\n\n")
	}))
	defer server.Close()

	client, err := ssegroup.NewSseClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	resp, err := client.NewSseProtocolClient().OpenID(ctx, nil)
	require.NoError(t, err)
	defer func() {
		_ = resp.Stream.Close()
	}()
	_, err = resp.Stream.Next()
	require.NoError(t, err)
	_, err = resp.Stream.Next()
	require.ErrorIs(t, err, io.ErrUnexpectedEOF)
	require.EqualValues(t, 1, requests.Load())
}

func TestFakeSseLastEventID(t *testing.T) {
	for _, lastEventID := range []string{"", "saved-event"} {
		t.Run(lastEventID, func(t *testing.T) {
			srv := &fake.SseServer{
				SseProtocolServer: fake.SseProtocolServer{
					OpenID: func(ctx context.Context, options *ssegroup.SseProtocolClientOpenIDOptions) (resp azfake.SSEResponder[ssegroup.ProtocolEvents], errResp azfake.ErrorResponder) {
						if lastEventID == "" {
							assert.Nil(t, options)
						} else if assert.NotNil(t, options) {
							assert.Equal(t, lastEventID, options.LastEventID)
						}
						resp.AddFrame(streaming.SSEFrame{ID: to.Ptr("event-1"), Type: "message", Data: []byte(`{"message":"hello"}`)})
						return
					},
				},
			}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			resp, err := newFakeSseClient(t, srv).NewSseProtocolClient().OpenID(ctx, &ssegroup.SseProtocolClientOpenIDOptions{LastEventID: lastEventID})
			require.NoError(t, err)
			defer func() {
				_ = resp.Stream.Close()
			}()
			require.Len(t, drain(t, resp.Stream), 1)
		})
	}
}
