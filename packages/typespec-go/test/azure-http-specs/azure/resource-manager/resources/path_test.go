// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package resources_test

import (
	"context"
	"io"
	"net/http"
	"resources"
	"strings"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/stretchr/testify/require"
)

type pathTransport func(*http.Request) (*http.Response, error)

func (transport pathTransport) Do(req *http.Request) (*http.Response, error) {
	return transport(req)
}

func TestExtensionResourcePathBoundaries(t *testing.T) {
	for _, scope := range []string{
		"/",
		"/subscriptions/00000000-0000-0000-0000-000000000000",
		"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/",
	} {
		t.Run(scope, func(t *testing.T) {
			called := false
			factory, err := resources.NewClientFactory(&azfake.TokenCredential{}, &arm.ClientOptions{
				ClientOptions: azcore.ClientOptions{
					Cloud: cloud.Configuration{
						Services: map[cloud.ServiceName]cloud.ServiceConfiguration{
							cloud.ResourceManager: {
								Audience: "https://fake.endpoint",
								Endpoint: "https://fake.endpoint/root/",
							},
						},
					},
					Transport: pathTransport(func(req *http.Request) (*http.Response, error) {
						called = true
						require.Equal(t, "/root"+strings.TrimRight(scope, "/")+
							"/providers/Azure.ResourceManager.Resources/extensionsResources/extension", req.URL.EscapedPath())
						return &http.Response{
							StatusCode: http.StatusNoContent,
							Header:     http.Header{},
							Body:       io.NopCloser(strings.NewReader("")),
							Request:    req,
						}, nil
					}),
				},
			})
			require.NoError(t, err)
			_, err = factory.NewExtensionsResourcesClient().Delete(context.Background(), scope, "extension", nil)
			require.NoError(t, err)
			require.True(t, called)
		})
	}
}
