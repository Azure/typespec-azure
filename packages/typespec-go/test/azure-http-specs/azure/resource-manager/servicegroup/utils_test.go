// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package servicegroup_test

import (
	"context"
	"servicegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
)

var (
	ctx           context.Context
	clientFactory *servicegroup.ClientFactory

	serviceGroupIDExpected = "test-sg"
	resourceNameExpected   = "resource"
)

func TestMain(m *testing.M) {
	ctx = context.Background()
	clientFactory, _ = servicegroup.NewClientFactory(&azfake.TokenCredential{}, &arm.ClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud: cloud.Configuration{
				Services: map[cloud.ServiceName]cloud.ServiceConfiguration{
					cloud.ResourceManager: {
						Audience: "fake_audience",
						Endpoint: "http://localhost:3000",
					},
				},
			},
			InsecureAllowCredentialWithHTTP: true,
		},
	})

	m.Run()
}
