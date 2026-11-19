// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package pathgroup_test

import (
	"context"
	"net/http"
	"pathgroup"
	"pathgroup/fake"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestFake_Optional(t *testing.T) {
	for _, tt := range []struct {
		name  string
		value *string
	}{
		{"absent", nil},
		{"empty", to.Ptr("")},
		{"simple", to.Ptr("foo")},
		{"slash", to.Ptr("a/b")},
		{"literal-escape", to.Ptr("a%2Fb")},
		{"space-plus", to.Ptr("a b+c")},
		{"reserved", to.Ptr("a?b#c&d=e")},
		{"dot", to.Ptr(".")},
		{"dot-dot", to.Ptr("..")},
		{"unicode", to.Ptr("\u00e9")},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var expected *pathgroup.PathClientOptionalOptions
			if tt.value != nil {
				expected = &pathgroup.PathClientOptionalOptions{Name: tt.value}
			}
			called := false
			server := fake.PathServer{
				Optional: func(_ context.Context, options *pathgroup.PathClientOptionalOptions) (resp azfake.Responder[pathgroup.PathClientOptionalResponse], errResp azfake.ErrorResponder) {
					called = true
					require.Equal(t, expected, options)
					resp.SetResponse(http.StatusNoContent, pathgroup.PathClientOptionalResponse{}, nil)
					return
				},
			}
			client, err := pathgroup.NewPathClientWithNoCredential("https://fake.endpoint", &pathgroup.PathClientOptions{
				ClientOptions: azcore.ClientOptions{
					Transport: fake.NewPathServerTransport(&server),
				},
			})
			require.NoError(t, err)

			resp, err := client.Optional(context.Background(), expected)
			require.NoError(t, err)
			require.Zero(t, resp)
			require.True(t, called)
		})
	}
}
