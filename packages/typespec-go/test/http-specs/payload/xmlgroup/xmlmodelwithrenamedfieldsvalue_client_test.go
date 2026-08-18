// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package xmlgroup_test

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"
	"xmlgroup"
	"xmlgroup/fake"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

type captureResponseTransport struct {
	inner policy.Transporter
	body  []byte
}

func (c *captureResponseTransport) Do(req *http.Request) (*http.Response, error) {
	resp, err := c.inner.Do(req)
	if err != nil {
		return nil, err
	}
	c.body, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	resp.Body = io.NopCloser(bytes.NewReader(c.body))
	return resp, nil
}

func TestXMLModelWithRenamedFieldsValueClient_Get(t *testing.T) {
	client, err := xmlgroup.NewXMLClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewXMLModelWithRenamedFieldsValueClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, xmlgroup.ModelWithRenamedFields{
		InputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("foo"),
			Age:  to.Ptr[int32](123),
		},
		OutputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("bar"),
			Age:  to.Ptr[int32](456),
		},
	}, resp.ModelWithRenamedFields)
}

func TestXMLModelWithRenamedFieldsValueClient_GetFake(t *testing.T) {
	model := xmlgroup.ModelWithRenamedFields{
		InputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("foo"),
			Age:  to.Ptr[int32](123),
		},
		OutputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("bar"),
			Age:  to.Ptr[int32](456),
		},
	}
	srv := fake.XMLModelWithRenamedFieldsValueServer{
		Get: func(ctx context.Context, options *xmlgroup.XMLModelWithRenamedFieldsValueClientGetOptions) (resp azfake.Responder[xmlgroup.XMLModelWithRenamedFieldsValueClientGetResponse], errResp azfake.ErrorResponder) {
			resp.SetResponse(http.StatusOK, xmlgroup.XMLModelWithRenamedFieldsValueClientGetResponse{
				ModelWithRenamedFields: model,
			}, nil)
			return
		},
	}
	transport := &captureResponseTransport{
		inner: fake.NewXMLModelWithRenamedFieldsValueServerTransport(&srv),
	}
	client, err := xmlgroup.NewXMLClientWithNoCredential("https://fake.endpoint", &xmlgroup.XMLClientOptions{
		ClientOptions: azcore.ClientOptions{
			Transport: transport,
		},
	})
	require.NoError(t, err)

	resp, err := client.NewXMLModelWithRenamedFieldsValueClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, model, resp.ModelWithRenamedFields)
	require.Contains(t, string(transport.body), "<ModelWithRenamedFieldsSrc>")
}

func TestXMLModelWithRenamedFieldsValueClient_Put(t *testing.T) {
	client, err := xmlgroup.NewXMLClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewXMLModelWithRenamedFieldsValueClient().Put(context.Background(), xmlgroup.ModelWithRenamedFields{
		InputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("foo"),
			Age:  to.Ptr[int32](123),
		},
		OutputData: &xmlgroup.SimpleModel{
			Name: to.Ptr("bar"),
			Age:  to.Ptr[int32](456),
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
