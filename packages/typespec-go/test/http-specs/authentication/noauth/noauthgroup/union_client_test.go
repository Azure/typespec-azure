// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package noauthgroup_test

import (
	"context"
	"noauthgroup"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/stretchr/testify/require"
)

type fakeCredential struct{}

func (mc fakeCredential) GetToken(context.Context, policy.TokenRequestOptions) (azcore.AccessToken, error) {
	return azcore.AccessToken{Token: "https://security.microsoft.com/.default", ExpiresOn: time.Now().Add(time.Hour)}, nil
}

func TestValidNoAuth(t *testing.T) {
	client, err := noauthgroup.NewUnionClientWithNoCredential("http://localhost:3000", &noauthgroup.UnionClientOptions{
		ClientOptions: azcore.ClientOptions{
			InsecureAllowCredentialWithHTTP: true,
		},
	})
	require.NoError(t, err)
	_, err = client.ValidNoAuth(context.Background(), nil)
	require.NoError(t, err)
}

func TestValidToken(t *testing.T) {
	client, err := noauthgroup.NewUnionClient("http://localhost:3000", &fakeCredential{}, &noauthgroup.UnionClientOptions{
		ClientOptions: azcore.ClientOptions{
			InsecureAllowCredentialWithHTTP: true,
		},
	})
	require.NoError(t, err)
	_, err = client.ValidToken(context.Background(), nil)
	require.NoError(t, err)
}
