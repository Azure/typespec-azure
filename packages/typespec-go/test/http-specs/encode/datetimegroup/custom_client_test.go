// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package datetimegroup_test

import (
	"context"
	"datetimegroup"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestHeaderClientDefault(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeHeaderClient().Default(context.Background(), time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestHeaderClientRFC3339(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeHeaderClient().RFC3339(context.Background(), time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestHeaderClientRFC7231(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeHeaderClient().RFC7231(context.Background(), time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestHeaderClientUnixTimestamp(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeHeaderClient().UnixTimestamp(context.Background(), time.Unix(1686566864, 0), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestHeaderClientUnixTimestampArray(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeHeaderClient().UnixTimestampArray(context.Background(), []time.Time{
		time.Unix(1686566864, 0),
		time.Unix(1686734256, 0),
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestPropertyClientDefault(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	v := time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC)
	resp, err := client.NewDatetimePropertyClient().Default(context.Background(), datetimegroup.DefaultDatetimeProperty{
		Value: to.Ptr(v),
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, v, *resp.Value, 0)
}

func TestPropertyClientRFC3339(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	v := time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC)
	resp, err := client.NewDatetimePropertyClient().RFC3339(context.Background(), datetimegroup.RFC3339DatetimeProperty{
		Value: to.Ptr(v),
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, v, *resp.Value, 0)
}

func TestPropertyClientRFC7231(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	v := time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC)
	resp, err := client.NewDatetimePropertyClient().RFC7231(context.Background(), datetimegroup.RFC7231DatetimeProperty{
		Value: to.Ptr(v),
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, v, *resp.Value, 0)
}

func TestPropertyClientUnixTimestamp(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	v := time.Unix(1686566864, 0)
	resp, err := client.NewDatetimePropertyClient().UnixTimestamp(context.Background(), datetimegroup.UnixTimestampDatetimeProperty{
		Value: to.Ptr(v),
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, v, *resp.Value, 0)
}

func TestPropertyClientUnixTimestampArray(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	v := []time.Time{
		time.Unix(1686566864, 0),
		time.Unix(1686734256, 0),
	}
	resp, err := client.NewDatetimePropertyClient().UnixTimestampArray(context.Background(), datetimegroup.UnixTimestampArrayDatetimeProperty{
		Value: v,
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	for i := 0; i < len(v); i++ {
		require.WithinDuration(t, v[i], resp.Value[i], 0)
	}
}

func TestQueryClientDefault(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeQueryClient().Default(context.Background(), time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestQueryClientRFC3339(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeQueryClient().RFC3339(context.Background(), time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestQueryClientRFC7231(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeQueryClient().RFC7231(context.Background(), time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestQueryClientUnixTimestamp(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeQueryClient().UnixTimestamp(context.Background(), time.Unix(1686566864, 0), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestQueryClientUnixTimestampArray(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeQueryClient().UnixTimestampArray(context.Background(), []time.Time{
		time.Unix(1686566864, 0),
		time.Unix(1686734256, 0),
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestResponseHeaderClientDefault(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeResponseHeaderClient().Default(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC), *resp.Value, 0)
}

func TestResponseHeaderClientRFC3339(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeResponseHeaderClient().RFC3339(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, time.Date(2022, time.August, 26, 18, 38, 0, 0, time.UTC), *resp.Value, 0)
}

func TestResponseHeaderClientRFC7231(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeResponseHeaderClient().RFC7231(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, time.Date(2022, time.August, 26, 14, 38, 0, 0, time.UTC), *resp.Value, 0)
}

func TestResponseHeaderClientUnixTimestamp(t *testing.T) {
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDatetimeResponseHeaderClient().UnixTimestamp(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Value)
	require.WithinDuration(t, time.Unix(1686566864, 0), *resp.Value, 0)
}

// captureTransport records the outgoing request and returns a canned 204 so the
// serialized wire value can be inspected without a live service.
type captureTransport struct {
	req *http.Request
}

func (c *captureTransport) Do(req *http.Request) (*http.Response, error) {
	c.req = req
	return &http.Response{
		StatusCode: http.StatusNoContent,
		Header:     http.Header{},
		Body:       http.NoBody,
		Request:    req,
	}, nil
}

func newCaptureClient(t *testing.T) (*datetimegroup.DatetimeClient, *captureTransport) {
	ct := &captureTransport{}
	client, err := datetimegroup.NewDatetimeClientWithNoCredential("https://example.test", &datetimegroup.DatetimeClientOptions{
		ClientOptions: azcore.ClientOptions{
			Transport: ct,
		},
	})
	require.NoError(t, err)
	return client, ct
}

// TestMarshalNormalizesToUTC verifies that non-UTC datetime inputs are serialized
// in UTC on the wire. The RFC3339 cases must emit an explicit .UTC() coercion since
// RFC3339 is offset-preserving; the RFC7231 case must remain correct (GMT) even
// though the emitter omits .UTC() for it. A same-instant round-trip check can't
// catch this, so we assert on the serialized string directly.
func TestMarshalNormalizesToUTC(t *testing.T) {
	// 2022-08-26T20:38:00+02:00 == 2022-08-26T18:38:00Z
	input := time.Date(2022, time.August, 26, 20, 38, 0, 0, time.FixedZone("UTC+2", 2*60*60))

	t.Run("HeaderRFC3339", func(t *testing.T) {
		client, ct := newCaptureClient(t)
		_, err := client.NewDatetimeHeaderClient().RFC3339(context.Background(), input, nil)
		require.NoError(t, err)
		value := ct.req.Header["value"][0]
		require.Contains(t, value, "18:38:00")
		require.True(t, strings.HasSuffix(value, "Z"), "expected UTC (Z) offset, got %q", value)
	})

	t.Run("QueryRFC3339", func(t *testing.T) {
		client, ct := newCaptureClient(t)
		_, err := client.NewDatetimeQueryClient().RFC3339(context.Background(), input, nil)
		require.NoError(t, err)
		value := ct.req.URL.Query().Get("value")
		require.Contains(t, value, "18:38:00")
		require.True(t, strings.HasSuffix(value, "Z"), "expected UTC (Z) offset, got %q", value)
	})

	t.Run("HeaderRFC7231", func(t *testing.T) {
		client, ct := newCaptureClient(t)
		_, err := client.NewDatetimeHeaderClient().RFC7231(context.Background(), input, nil)
		require.NoError(t, err)
		value := ct.req.Header["value"][0]
		require.Contains(t, value, "18:38:00 GMT", "expected GMT-normalized time, got %q", value)
	})
}
