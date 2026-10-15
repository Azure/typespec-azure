// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package managementgroupgroup

import (
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
)

var (
	ctx           context.Context
	clientFactory *ClientFactory

	managementGroupIDExpected = "test-mg"
	resourceNameExpected      = "resource"
)

func TestMain(m *testing.M) {
	ctx = context.Background()
	clientFactory, _ = NewClientFactory(&azfake.TokenCredential{}, &arm.ClientOptions{
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
