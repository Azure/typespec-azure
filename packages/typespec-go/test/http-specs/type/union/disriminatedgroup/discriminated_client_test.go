// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package disriminatedgroup_test

import (
	"context"
	"disriminatedgroup"
	"disriminatedgroup/fake"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func newClient(t *testing.T) *disriminatedgroup.DiscriminatedClient {
	t.Helper()
	client, err := disriminatedgroup.NewDiscriminatedClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client
}

type responseTransport struct {
	body string
}

func (r responseTransport) Do(req *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": {"application/json"}},
		Body:       io.NopCloser(strings.NewReader(r.body)),
		Request:    req,
	}, nil
}

func TestDiscriminatedClientInvalidDiscriminator(t *testing.T) {
	for _, payload := range []string{
		`{}`,
		`{"kind":"unknown","petType":"unknown","type":"unknown"}`,
		`{"kind":null,"petType":null,"type":null}`,
		`{"kind":42,"petType":42,"type":42}`,
		`{"kind":[],"petType":[],"type":[]}`,
		`{"kind":{},"petType":{},"type":{}}`,
		`[]`,
		`{`,
	} {
		t.Run(payload, func(t *testing.T) {
			client, err := disriminatedgroup.NewDiscriminatedClientWithNoCredential(
				"http://localhost:3000",
				&disriminatedgroup.DiscriminatedClientOptions{
					ClientOptions: azcore.ClientOptions{Transport: responseTransport{body: payload}},
				},
			)
			require.NoError(t, err)
			envelope := client.NewDiscriminatedEnvelopeClient().NewDiscriminatedEnvelopeObjectClient()
			inline := client.NewDiscriminatedNoEnvelopeClient()

			_, err = envelope.NewDiscriminatedEnvelopeObjectDefaultClient().Get(context.Background(), nil)
			require.Error(t, err)
			_, err = envelope.NewDiscriminatedEnvelopeObjectCustomPropertiesClient().Get(context.Background(), nil)
			require.Error(t, err)
			_, err = inline.NewDiscriminatedNoEnvelopeDefaultClient().Get(context.Background(), nil)
			require.Error(t, err)
			_, err = inline.NewDiscriminatedNoEnvelopeCustomDiscriminatorClient().Get(context.Background(), nil)
			require.Error(t, err)
		})
	}
}

func TestDiscriminatedClientNullResponse(t *testing.T) {
	client, err := disriminatedgroup.NewDiscriminatedClientWithNoCredential(
		"http://localhost:3000",
		&disriminatedgroup.DiscriminatedClientOptions{
			ClientOptions: azcore.ClientOptions{Transport: responseTransport{body: "null"}},
		},
	)
	require.NoError(t, err)
	envelope := client.NewDiscriminatedEnvelopeClient().NewDiscriminatedEnvelopeObjectClient()
	inline := client.NewDiscriminatedNoEnvelopeClient()

	defaultEnvelope, err := envelope.NewDiscriminatedEnvelopeObjectDefaultClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.Nil(t, defaultEnvelope.PetWithEnvelopeClassification)
	customEnvelope, err := envelope.NewDiscriminatedEnvelopeObjectCustomPropertiesClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.Nil(t, customEnvelope.PetWithCustomNamesClassification)
	defaultInline, err := inline.NewDiscriminatedNoEnvelopeDefaultClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.Nil(t, defaultInline.PetInlineClassification)
	customInline, err := inline.NewDiscriminatedNoEnvelopeCustomDiscriminatorClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.Nil(t, customInline.PetInlineWithCustomDiscriminatorClassification)
}

func TestDiscriminatedVariantMarshal(t *testing.T) {
	for _, test := range []struct {
		name     string
		value    any
		expected string
	}{
		{
			name: "envelope",
			value: &disriminatedgroup.PetWithEnvelopeDog{
				Kind:  to.Ptr("ignored"),
				Value: &disriminatedgroup.Dog{Name: to.Ptr("Rex"), Bark: to.Ptr(false)},
			},
			expected: `{"kind":"dog","value":{"name":"Rex","bark":false}}`,
		},
		{
			name: "custom envelope",
			value: &disriminatedgroup.PetWithCustomNamesDog{
				PetType: to.Ptr("ignored"),
				PetData: &disriminatedgroup.Dog{Name: to.Ptr("Rex"), Bark: to.Ptr(false)},
			},
			expected: `{"petType":"dog","petData":{"name":"Rex","bark":false}}`,
		},
		{
			name: "inline",
			value: &disriminatedgroup.PetInlineDog{
				Kind: to.Ptr("ignored"),
				Name: to.Ptr("Rex"),
				Bark: to.Ptr(false),
			},
			expected: `{"kind":"dog","name":"Rex","bark":false}`,
		},
		{
			name: "custom inline",
			value: &disriminatedgroup.PetInlineWithCustomDiscriminatorDog{
				Type: to.Ptr("ignored"),
				Name: to.Ptr("Rex"),
				Bark: to.Ptr(false),
			},
			expected: `{"type":"dog","name":"Rex","bark":false}`,
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			data, err := json.Marshal(test.value)
			require.NoError(t, err)
			require.JSONEq(t, test.expected, string(data))
		})
	}
}

func TestDiscriminatedClientFakeRoundTrip(t *testing.T) {
	expected := &disriminatedgroup.PetWithEnvelopeCat{
		Kind:  to.Ptr("cat"),
		Value: &disriminatedgroup.Cat{Name: to.Ptr("Whiskers"), Meow: to.Ptr(true)},
	}
	inlineExpected := &disriminatedgroup.PetInlineDog{
		Kind: to.Ptr("dog"),
		Name: to.Ptr("Rex"),
		Bark: to.Ptr(false),
	}
	srv := fake.DiscriminatedServer{
		DiscriminatedEnvelopeServer: fake.DiscriminatedEnvelopeServer{
			DiscriminatedEnvelopeObjectServer: fake.DiscriminatedEnvelopeObjectServer{
				DiscriminatedEnvelopeObjectDefaultServer: fake.DiscriminatedEnvelopeObjectDefaultServer{
					Put: func(ctx context.Context, input disriminatedgroup.PetWithEnvelopeClassification, options *disriminatedgroup.DiscriminatedEnvelopeObjectDefaultClientPutOptions) (resp azfake.Responder[disriminatedgroup.DiscriminatedEnvelopeObjectDefaultClientPutResponse], errResp azfake.ErrorResponder) {
						require.Equal(t, expected, input)
						resp.SetResponse(http.StatusOK, disriminatedgroup.DiscriminatedEnvelopeObjectDefaultClientPutResponse{PetWithEnvelopeClassification: input}, nil)
						return
					},
				},
			},
		},
		DiscriminatedNoEnvelopeServer: fake.DiscriminatedNoEnvelopeServer{
			DiscriminatedNoEnvelopeDefaultServer: fake.DiscriminatedNoEnvelopeDefaultServer{
				Put: func(ctx context.Context, input disriminatedgroup.PetInlineClassification, options *disriminatedgroup.DiscriminatedNoEnvelopeDefaultClientPutOptions) (resp azfake.Responder[disriminatedgroup.DiscriminatedNoEnvelopeDefaultClientPutResponse], errResp azfake.ErrorResponder) {
					require.Equal(t, inlineExpected, input)
					resp.SetResponse(http.StatusOK, disriminatedgroup.DiscriminatedNoEnvelopeDefaultClientPutResponse{PetInlineClassification: input}, nil)
					return
				},
			},
		},
	}
	client, err := disriminatedgroup.NewDiscriminatedClientWithNoCredential(
		"http://localhost:3000",
		&disriminatedgroup.DiscriminatedClientOptions{
			ClientOptions: azcore.ClientOptions{Transport: fake.NewDiscriminatedServerTransport(&srv)},
		},
	)
	require.NoError(t, err)
	enveloped, err := client.NewDiscriminatedEnvelopeClient().NewDiscriminatedEnvelopeObjectClient().NewDiscriminatedEnvelopeObjectDefaultClient().Put(context.Background(), expected, nil)
	require.NoError(t, err)
	require.Equal(t, expected, enveloped.PetWithEnvelopeClassification)
	inline, err := client.NewDiscriminatedNoEnvelopeClient().NewDiscriminatedNoEnvelopeDefaultClient().Put(context.Background(), inlineExpected, nil)
	require.NoError(t, err)
	require.Equal(t, inlineExpected, inline.PetInlineClassification)
}
