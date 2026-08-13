// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package xmlgroup_test

import (
	"context"
	"net/http"
	"testing"
	"xmlgroup"
	"xmlgroup/fake"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestXMLModelWithRenamedNestedModelValueClient_Get(t *testing.T) {
	client, err := xmlgroup.NewXMLClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewXMLModelWithRenamedNestedModelValueClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, xmlgroup.ModelWithRenamedNestedModel{
		Author: &xmlgroup.Author{
			Name: to.Ptr("foo"),
		},
	}, resp.ModelWithRenamedNestedModel)
}

func TestXMLModelWithRenamedNestedModelValueClient_GetFake(t *testing.T) {
	srv := fake.XMLModelWithRenamedNestedModelValueServer{
		Get: func(ctx context.Context, options *xmlgroup.XMLModelWithRenamedNestedModelValueClientGetOptions) (resp azfake.Responder[xmlgroup.XMLModelWithRenamedNestedModelValueClientGetResponse], errResp azfake.ErrorResponder) {
			resp.SetResponse(http.StatusOK, xmlgroup.XMLModelWithRenamedNestedModelValueClientGetResponse{
				ModelWithRenamedNestedModel: xmlgroup.ModelWithRenamedNestedModel{
					Author: &xmlgroup.Author{
						Name: to.Ptr("foo"),
					},
				},
			}, nil)
			return
		},
	}
	client, err := xmlgroup.NewXMLClientWithNoCredential("https://fake.endpoint", &xmlgroup.XMLClientOptions{
		ClientOptions: azcore.ClientOptions{
			Transport: fake.NewXMLModelWithRenamedNestedModelValueServerTransport(&srv),
		},
	})
	require.NoError(t, err)

	resp, err := client.NewXMLModelWithRenamedNestedModelValueClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.EqualValues(t, xmlgroup.ModelWithRenamedNestedModel{
		Author: &xmlgroup.Author{
			Name: to.Ptr("foo"),
		},
	}, resp.ModelWithRenamedNestedModel)
}

func TestXMLModelWithRenamedNestedModelValueClient_Put(t *testing.T) {
	client, err := xmlgroup.NewXMLClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewXMLModelWithRenamedNestedModelValueClient().Put(context.Background(), xmlgroup.ModelWithRenamedNestedModel{
		Author: &xmlgroup.Author{
			Name: to.Ptr("foo"),
		},
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
