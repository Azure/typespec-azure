// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package coreauthcfggroup_test

import (
	"context"
	"coreauthcfggroup"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/stretchr/testify/require"
)

type configurationCredential struct{}

func (configurationCredential) GetToken(ctx context.Context, options policy.TokenRequestOptions) (azcore.AccessToken, error) {
	scope := strings.Join(options.Scopes, " ")
	var tokenURL string
	switch scope {
	case "https://api.loganalytics.io/.default":
		tokenURL = "http://localhost:3000/azure/core/authentication/configurations/oauth2/public/token"
	case "https://api.loganalytics.us/.default":
		tokenURL = "http://localhost:3000/azure/core/authentication/configurations/oauth2/government/token"
	default:
		return azcore.AccessToken{}, fmt.Errorf("unexpected OAuth2 scope: %q", scope)
	}
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {"mock-client-id"},
		"client_secret": {"mock-client-secret"},
		"scope":         {scope},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return azcore.AccessToken{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return azcore.AccessToken{}, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	if resp.StatusCode != http.StatusOK {
		return azcore.AccessToken{}, fmt.Errorf("token request failed: %s", resp.Status)
	}
	var token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return azcore.AccessToken{}, err
	}
	if token.AccessToken == "" || token.ExpiresIn <= 0 {
		return azcore.AccessToken{}, fmt.Errorf("token response is missing an access token or a positive expiry")
	}
	return azcore.AccessToken{
		Token:     token.AccessToken,
		ExpiresOn: time.Now().Add(time.Duration(token.ExpiresIn) * time.Second),
	}, nil
}

func TestConfigurationsClient_DefaultConfiguration(t *testing.T) {
	client, err := coreauthcfggroup.NewConfigurationsClient(configurationCredential{}, &coreauthcfggroup.ConfigurationsClientOptions{
		ClientOptions: azcore.ClientOptions{
			InsecureAllowCredentialWithHTTP: true,
		},
	})
	require.NoError(t, err)

	resp, err := client.DefaultConfiguration(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestConfigurationsClient_GovernmentConfiguration(t *testing.T) {
	client, err := coreauthcfggroup.NewConfigurationsClient(configurationCredential{}, &coreauthcfggroup.ConfigurationsClientOptions{
		ClientOptions: azcore.ClientOptions{
			InsecureAllowCredentialWithHTTP: true,
			Cloud:                           cloud.AzureGovernment,
		},
	})
	require.NoError(t, err)

	resp, err := client.GovernmentConfiguration(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestConfigurationsClient_InvalidCloudConfiguration(t *testing.T) {
	_, err := coreauthcfggroup.NewConfigurationsClient(configurationCredential{}, &coreauthcfggroup.ConfigurationsClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud: cloud.AzureChina,
		},
	})
	require.ErrorContains(t, err, "missing configuration for coreauthcfggroup")

	_, err = coreauthcfggroup.NewConfigurationsClient(configurationCredential{}, &coreauthcfggroup.ConfigurationsClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud: cloud.Configuration{
				Services: map[cloud.ServiceName]cloud.ServiceConfiguration{
					coreauthcfggroup.ServiceName: {
						Audience: "https://api.loganalytics.io",
					},
				},
			},
		},
	})
	require.ErrorContains(t, err, "missing Endpoint for coreauthcfggroup")
}
