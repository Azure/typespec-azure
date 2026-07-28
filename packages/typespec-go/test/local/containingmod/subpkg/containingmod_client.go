// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package subpkg

import (
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
)

// NewFContainingModClient creates a new instance of ContainingModClient.
// The provided *azcore.Client is typically obtained from the containing module's
// constructor (e.g. containingmod.Parent) so that the pipeline and telemetry are
// shared across all clients in the module.
//   - endpoint - the service endpoint
//   - client - the shared azcore.Client used to send requests
func NewContainingModClient(endpoint string, client *azcore.Client) *ContainingModClient {
	return &ContainingModClient{
		internal: client,
		endpoint: endpoint,
	}
}
