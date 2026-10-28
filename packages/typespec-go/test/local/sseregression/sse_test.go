// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package sseregression_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"sseregression"
	"sseregression/fake"

	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) Do(req *http.Request) (*http.Response, error) {
	return f(req)
}

type responseBody struct {
	*strings.Reader
	closed bool
	reads  int
}

func (b *responseBody) Read(p []byte) (int, error) {
	b.reads++
	return b.Reader.Read(p)
}

func (b *responseBody) Close() error {
	b.closed = true
	return nil
}

func newClient(t *testing.T, transport transportFunc) *sseregression.Client {
	t.Helper()
	client, err := sseregression.NewClientWithNoCredential("https://example.com", &sseregression.ClientOptions{
		ClientOptions: policy.ClientOptions{Transport: transport},
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func responseHeaders() http.Header {
	header := http.Header{}
	header.Set("Content-Type", "text/event-stream")
	header.Set("x-stream-session", "session-1")
	header.Set("x-stream-count", "42")
	header.Set("x-stream-time", "Wed, 21 Oct 2015 07:28:00 GMT")
	return header
}

func TestInitialHeadersAndUnnamedSentinel(t *testing.T) {
	for _, eventType := range []string{"", "event: message\n", "event: custom\n"} {
		t.Run(eventType, func(t *testing.T) {
			body := &responseBody{Reader: strings.NewReader("data: {\"message\":\"hello\"}\n\n" + eventType + "data: [DONE]\n\ndata: {\"message\":\"not delivered\"}\n\n")}
			var rawResponse *http.Response
			requests := 0
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				requests++
				rawResponse = &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}
				return rawResponse, nil
			})
			var captured *http.Response
			ctx := policy.WithCaptureResponse(context.Background(), &captured)
			resp, err := client.OpenReceive(ctx, nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				_ = resp.Stream.Close()
			}()
			if captured != rawResponse {
				t.Fatal("caller response capture was not preserved")
			}
			if body.closed || body.reads != 0 {
				t.Fatal("opening the reader must not consume or close the body")
			}
			if resp.SessionToken == nil || *resp.SessionToken != "session-1" || resp.Count == nil || *resp.Count != 42 {
				t.Fatalf("unexpected headers: %+v", resp)
			}
			if resp.Timestamp == nil || !resp.Timestamp.Equal(time.Date(2015, 10, 21, 7, 28, 0, 0, time.UTC)) {
				t.Fatalf("unexpected timestamp: %v", resp.Timestamp)
			}
			event, err := resp.Stream.Next()
			if err != nil || event.Info == nil || event.Info.Message == nil || *event.Info.Message != "hello" {
				t.Fatalf("unexpected event: %+v, error: %v", event, err)
			}
			for range 2 {
				if event, err := resp.Stream.Next(); !errors.Is(err, io.EOF) || event.Info != nil {
					t.Fatalf("sentinel must end the stream without a value: %+v, %v", event, err)
				}
			}
			if err := resp.Stream.Close(); err != nil {
				t.Fatal(err)
			}
			if !body.closed || requests != 1 {
				t.Fatalf("closed: %v, requests: %d", body.closed, requests)
			}
		})
	}
}

func TestUnnamedTerminalModel(t *testing.T) {
	body := &responseBody{Reader: strings.NewReader("data: {\"total\":42}\n\ndata: {\"total\":99}\n\n")}
	client := newClient(t, func(req *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
	})
	resp, err := client.OpenComplete(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	event, err := resp.Stream.Next()
	if err != nil || event.Completion == nil || event.Completion.Total == nil || *event.Completion.Total != 42 {
		t.Fatalf("unexpected terminal event: %+v, error: %v", event, err)
	}
	if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("terminal model must end the stream: %v", err)
	}
	if err := resp.Stream.Close(); err != nil {
		t.Fatal(err)
	}
	if !body.closed {
		t.Fatal("closing the completed reader must close the body")
	}
}

func TestJsonSentinelAndStreamHeader(t *testing.T) {
	for _, sentinel := range []string{`"[DONE]"`, `"\u005bDONE]"`} {
		t.Run(sentinel, func(t *testing.T) {
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				headers := responseHeaders()
				headers.Set("x-stream", "session")
				return &http.Response{
					StatusCode: http.StatusCreated,
					Header:     headers,
					Body:       io.NopCloser(strings.NewReader("data: " + sentinel + "\n\ndata: invalid\n\n")),
					Request:    req,
				}, nil
			})
			resp, err := client.OpenJSONEvents(context.Background(), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				_ = resp.Stream.Close()
			}()
			if resp.StreamHeader == nil || *resp.StreamHeader != "session" {
				t.Fatalf("unexpected stream header: %v", resp.StreamHeader)
			}
			if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
				t.Fatalf("expected JSON sentinel to end the stream, got %v", err)
			}
		})
	}
}

func TestFakeSseCreatedResponse(t *testing.T) {
	srv := &fake.Server{
		OpenJSONEvents: func(ctx context.Context, options *sseregression.ClientOpenJSONEventsOptions) (resp azfake.SSEResponder[sseregression.JSONEvents], errResp azfake.ErrorResponder) {
			resp.AddFrame(streaming.SSEFrame{Data: []byte(`"[DONE]"`)})
			return
		},
	}
	client := newClient(t, fake.NewServerTransport(srv).Do)
	resp, err := client.OpenJSONEvents(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("expected the fake's JSON sentinel to end the stream, got %v", err)
	}
}

func TestMalformedHeaderClosesReader(t *testing.T) {
	for _, headerName := range []string{"x-stream-count", "x-stream-time"} {
		t.Run(headerName, func(t *testing.T) {
			body := &responseBody{Reader: strings.NewReader("data: {\"message\":\"hello\"}\n\n")}
			var requestContext context.Context
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				requestContext = req.Context()
				headers := responseHeaders()
				headers.Set(headerName, "invalid")
				return &http.Response{StatusCode: http.StatusOK, Header: headers, Body: body, Request: req}, nil
			})
			resp, err := client.OpenReceive(context.Background(), nil)
			if err == nil || resp.Stream != nil {
				t.Fatalf("expected a parsing error and no stream, got %+v, %v", resp, err)
			}
			if headerName == "x-stream-count" {
				var parseErr *strconv.NumError
				if !errors.As(err, &parseErr) {
					t.Fatalf("expected original numeric parsing error, got %v", err)
				}
			} else {
				var parseErr *time.ParseError
				if !errors.As(err, &parseErr) {
					t.Fatalf("expected original time parsing error, got %v", err)
				}
			}
			if !body.closed || body.reads != 0 {
				t.Fatalf("failed header parsing must close the body without reading it: %+v", body)
			}
			if !errors.Is(requestContext.Err(), context.Canceled) {
				t.Fatalf("reader context was not canceled: %v", requestContext.Err())
			}
		})
	}
}

func TestNoContentRetainsHeaders(t *testing.T) {
	body := &responseBody{Reader: strings.NewReader("")}
	client := newClient(t, func(req *http.Request) (*http.Response, error) {
		headers := responseHeaders()
		headers.Del("Content-Type")
		return &http.Response{StatusCode: http.StatusNoContent, Header: headers, Body: body, Request: req}, nil
	})
	resp, err := client.OpenReceive(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}

	defer func() {
		_ = resp.Stream.Close()
	}()
	if resp.SessionToken == nil || *resp.SessionToken != "session-1" || resp.Count == nil || *resp.Count != 42 {
		t.Fatalf("unexpected headers: %+v", resp)
	}
	if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("expected an exhausted reader, got %v", err)
	}
	if !body.closed || body.reads != 0 {
		t.Fatal("HTTP 204 must close the body without reading it")
	}
}

func TestBestFitUnnamedEvents(t *testing.T) {
	for _, tc := range []struct {
		name    string
		frame   string
		variant string
	}{
		{"literal before larger structural match", `data: {"kind":"connected","message":"hello","details":"extra"}`, "connected"},
		{"same shape different literal", `data: {"kind":"disconnected","message":"bye"}`, "disconnected"},
		{"escaped literal", `data: {"kind":"\u0063onnected","message":"hello"}`, "connected"},
		{"literal beyond four probe fields", `data: {"a":"1","b":"2","c":"3","d":"4","kind":"late-b"}`, "late-b"},
		{"structural fallback", `data: {"kind":"other","message":"hello","details":"extra"}`, "general"},
		{"structural metrics", `data: {"value":42,"unit":"ms"}`, "metrics"},
		{"structural status", `data: {"state":"ready"}`, "status"},
		{"named dispatch", "event: named\ndata: {\"message\":\"hello\"}", "named"},
	} {
		for _, eventType := range []string{"", "event: message\n"} {
			t.Run(tc.name+"/"+eventType, func(t *testing.T) {
				if tc.variant == "named" {
					eventType = ""
				}
				body := &responseBody{Reader: strings.NewReader(eventType + tc.frame + "\n\ndata: [DONE]\n\n")}
				client := newClient(t, func(req *http.Request) (*http.Response, error) {
					return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
				})
				resp, err := client.OpenBestFit(context.Background(), nil)
				if err != nil {
					t.Fatal(err)
				}
				defer func() {
					_ = resp.Stream.Close()
				}()
				event, err := resp.Stream.Next()
				if err != nil {
					t.Fatal(err)
				}
				var variant string
				switch {
				case event.Connected != nil:
					variant = "connected"
				case event.Disconnected != nil:
					variant = "disconnected"
				case event.LateB != nil:
					variant = "late-b"
				case event.General != nil:
					variant = "general"
				case event.Metrics != nil:
					variant = "metrics"
				case event.Status != nil:
					variant = "status"
				case event.Info != nil:
					variant = "named"
				}
				if variant != tc.variant {
					t.Fatalf("expected %s, got %+v", tc.variant, event)
				}
				if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
					t.Fatalf("expected end of stream, got %v", err)
				}
			})
		}
	}
}

func TestBestFitTerminalModelStopsBeforeNextEvent(t *testing.T) {
	body := &responseBody{Reader: strings.NewReader("data: {\"kind\":\"disconnected\",\"message\":\"bye\"}\n\ndata: {\"kind\":\"connected\",\"message\":\"not delivered\"}\n\n")}
	client := newClient(t, func(req *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
	})
	resp, err := client.OpenBestFit(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	event, err := resp.Stream.Next()
	if err != nil || event.Disconnected == nil {
		t.Fatalf("expected disconnected terminal event, got %+v, %v", event, err)
	}
	if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("terminal event must end the stream, got %v", err)
	}
}

func TestBestFitUnmatchedPayloadReturnsError(t *testing.T) {
	for _, payload := range []string{
		`{"kind":"unknown","message":"hello"}`,
		`{"kind":null,"message":"hello"}`,
		`{"message":"hello"}`,
		`{"kind":false,"message":"hello"}`,
		`{"kind":"connected","message":42}`,
		`[]`,
		`null`,
		`invalid`,
	} {
		t.Run(payload, func(t *testing.T) {
			body := &responseBody{Reader: strings.NewReader("data: " + payload + "\n\n")}
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
			})
			resp, err := client.OpenBestFit(context.Background(), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				_ = resp.Stream.Close()
			}()
			if _, err := resp.Stream.Next(); err == nil || errors.Is(err, io.EOF) {
				t.Fatalf("expected a decoding or matching error, got %v", err)
			}
		})
	}
}

func TestJsonUnionLiteralMatching(t *testing.T) {
	for _, tc := range []struct {
		name    string
		payload string
		enabled bool
	}{
		{"true and numeric literal", `{"enabled":true,"code":1,"label":"on"}`, true},
		{"false and zero literals", `{"enabled":false,"code":0,"label":"off"}`, false},
		{"whitespace", `{ "enabled" : false, "code" : 0, "label" : "off" }`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var value sseregression.LiteralValues
			if err := json.Unmarshal([]byte(tc.payload), &value); err != nil {
				t.Fatal(err)
			}
			if (value.Enabled != nil) != tc.enabled || (value.Disabled != nil) == tc.enabled {
				t.Fatalf("unexpected variant: %+v", value)
			}
		})
	}
	for _, payload := range []string{
		`{"enabled":null,"code":0,"label":"off"}`,
		`{"enabled":false,"code":null,"label":"off"}`,
		`{"code":0,"label":"off"}`,
		`{"enabled":false,"label":"off"}`,
		`{"enabled":"false","code":0,"label":"off"}`,
		`{"enabled":true,"code":0,"label":"off"}`,
		`{"enabled":false,"code":9,"label":"off"}`,
	} {
		t.Run(payload, func(t *testing.T) {
			var value sseregression.LiteralValues
			if err := json.Unmarshal([]byte(payload), &value); err == nil {
				t.Fatalf("expected literal mismatch error, got %+v", value)
			}
		})
	}
}

func TestEnvelopePayloadMatching(t *testing.T) {
	body := &responseBody{Reader: strings.NewReader("data: {\"kind\":\"connected\",\"message\":\"hello\"}\n\ndata: {\"kind\":\"disconnected\",\"message\":\"bye\"}\n\ndata: invalid\n\n")}
	client := newClient(t, func(req *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
	})
	resp, err := client.OpenEnvelopes(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	first, err := resp.Stream.Next()
	if err != nil || first.ConnectedEnvelope == nil || first.ConnectedEnvelope.Payload == nil {
		t.Fatalf("expected connected envelope, got %+v, %v", first, err)
	}
	last, err := resp.Stream.Next()
	if err != nil || last.DisconnectedEnvelope == nil || last.DisconnectedEnvelope.Payload == nil {
		t.Fatalf("expected disconnected envelope, got %+v, %v", last, err)
	}
	if _, err := resp.Stream.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("terminal envelope must end the stream, got %v", err)
	}
}

func TestRecordFallback(t *testing.T) {
	for _, tc := range []struct {
		payload string
		record  bool
	}{
		{`{"kind":"connected","message":"hello"}`, false},
		{`{"kind":"other","message":"hello"}`, true},
	} {
		t.Run(tc.payload, func(t *testing.T) {
			body := &responseBody{Reader: strings.NewReader("data: " + tc.payload + "\n\n")}
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: http.StatusOK, Header: responseHeaders(), Body: body, Request: req}, nil
			})
			resp, err := client.OpenRecords(context.Background(), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				_ = resp.Stream.Close()
			}()
			event, err := resp.Stream.Next()
			if err != nil {
				t.Fatal(err)
			}
			if (event.MapOfString != nil) != tc.record || (event.Connected != nil) == tc.record {
				t.Fatalf("unexpected variant: %+v", event)
			}
		})
	}
}

func TestFakeNamedEventsWithSharedPayloads(t *testing.T) {
	first, second := "one", "two"
	timestamp := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	srv := &fake.Server{
		OpenNamed: func(ctx context.Context, options *sseregression.ClientOpenNamedOptions) (resp azfake.SSEResponder[sseregression.NamedEvents], errResp azfake.ErrorResponder) {
			resp.AddEvent(sseregression.NamedEvents{Info: &sseregression.Info{Message: &first}})
			resp.AddEvent(sseregression.NamedEvents{Info1: &sseregression.Info{Message: &second}})
			resp.AddEvent(sseregression.NamedEvents{TimestampEnvelope: &sseregression.TimestampEnvelope{Timestamp: &timestamp}})
			return
		},
	}
	resp, err := newClient(t, fake.NewServerTransport(srv).Do).OpenNamed(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	a, err := resp.Stream.Next()
	if err != nil || a.Info == nil || a.Info.Message == nil || *a.Info.Message != first || a.Info1 != nil {
		t.Fatalf("unexpected first event: %+v, %v", a, err)
	}
	b, err := resp.Stream.Next()
	if err != nil || b.Info1 == nil || b.Info1.Message == nil || *b.Info1.Message != second || b.Info != nil {
		t.Fatalf("unexpected second event: %+v, %v", b, err)
	}
	c, err := resp.Stream.Next()
	if err != nil || c.TimestampEnvelope == nil || c.TimestampEnvelope.Timestamp == nil || !c.TimestampEnvelope.Timestamp.Equal(timestamp) {
		t.Fatalf("unexpected timestamp event: %+v, %v", c, err)
	}
}

func TestFakeNamedLiteralEvents(t *testing.T) {
	first, second := "one", "two"
	srv := &fake.Server{
		OpenLiterals: func(ctx context.Context, options *sseregression.ClientOpenLiteralsOptions) (resp azfake.SSEResponder[sseregression.LiteralEventsEvent], errResp azfake.ErrorResponder) {
			resp.AddEvent(sseregression.LiteralEventsEvent{LiteralString: &first})
			resp.AddEvent(sseregression.LiteralEventsEvent{LiteralString1: &second})
			return
		},
	}
	resp, err := newClient(t, fake.NewServerTransport(srv).Do).OpenLiterals(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = resp.Stream.Close()
	}()
	a, err := resp.Stream.Next()
	if err != nil || a.LiteralString == nil || *a.LiteralString != first || a.LiteralString1 != nil {
		t.Fatalf("unexpected first literal: %+v, %v", a, err)
	}
	b, err := resp.Stream.Next()
	if err != nil || b.LiteralString1 == nil || *b.LiteralString1 != second || b.LiteralString != nil {
		t.Fatalf("unexpected second literal: %+v, %v", b, err)
	}
}

func TestUnnamedEventsWithOptionalProperties(t *testing.T) {
	for _, tc := range []struct {
		payload string
		variant string
	}{
		{`{"kind":"connected"}`, "connected"},
		{`{"kind":"disconnected"}`, "disconnected"},
		{`{"id":"one"}`, "required"},
		{`{}`, "optional"},
		{`{"detail":"one"}`, "optional"},
		{`null`, "invalid"},
	} {
		t.Run(tc.payload, func(t *testing.T) {
			client := newClient(t, func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Header:     responseHeaders(),
					Body:       io.NopCloser(strings.NewReader("data: " + tc.payload + "\n\n")),
					Request:    req,
				}, nil
			})
			resp, err := client.OpenOptional(context.Background(), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				_ = resp.Stream.Close()
			}()
			event, err := resp.Stream.Next()
			if tc.variant == "invalid" {
				if err == nil || errors.Is(err, io.EOF) {
					t.Fatalf("expected a matching error, got %+v, %v", event, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if (event.OptionalConnected != nil) != (tc.variant == "connected") ||
				(event.OptionalDisconnected != nil) != (tc.variant == "disconnected") ||
				(event.RequiredPayload != nil) != (tc.variant == "required") ||
				(event.OptionalPayload != nil) != (tc.variant == "optional") {
				t.Fatalf("expected %s variant, got %+v", tc.variant, event)
			}
		})
	}
}

func TestNestedEventUnionJsonSerde(t *testing.T) {
	const payload = `{"batch":[{"message":"hello"}]}`
	var request sseregression.BatchRequest
	if err := json.Unmarshal([]byte(payload), &request); err != nil {
		t.Fatal(err)
	}
	if request.Batch == nil || len(request.Batch.SliceOfUnionStruct) != 1 || request.Batch.SliceOfUnionStruct[0] == nil ||
		request.Batch.SliceOfUnionStruct[0].Info == nil || request.Batch.SliceOfUnionStruct[0].Info.Message == nil ||
		*request.Batch.SliceOfUnionStruct[0].Info.Message != "hello" {
		t.Fatalf("unexpected nested event: %+v", request)
	}
	data, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != payload {
		t.Fatalf("unexpected JSON representation: %s", data)
	}
}
