// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package disriminatedgroup_test

import (
	"context"
	"disriminatedgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestDiscriminatedEnvelopeObjectCustomPropertiesClient(t *testing.T) {
	client := newClient(t).NewDiscriminatedEnvelopeClient().NewDiscriminatedEnvelopeObjectClient().NewDiscriminatedEnvelopeObjectCustomPropertiesClient()
	expected := &disriminatedgroup.PetWithCustomNamesCat{
		PetType: to.Ptr("cat"),
		PetData: &disriminatedgroup.Cat{Name: to.Ptr("Whiskers"), Meow: to.Ptr(true)},
	}

	resp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, expected, resp.PetWithCustomNamesClassification)

	cat, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedEnvelopeObjectCustomPropertiesClientGetOptions{PetType: to.Ptr("cat")})
	require.NoError(t, err)
	require.Equal(t, expected, cat.PetWithCustomNamesClassification)

	dog, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedEnvelopeObjectCustomPropertiesClientGetOptions{PetType: to.Ptr("dog")})
	require.NoError(t, err)
	require.Equal(t, &disriminatedgroup.PetWithCustomNamesDog{
		PetType: to.Ptr("dog"),
		PetData: &disriminatedgroup.Dog{Name: to.Ptr("Rex"), Bark: to.Ptr(false)},
	}, dog.PetWithCustomNamesClassification)

	input := &disriminatedgroup.PetWithCustomNamesCat{PetData: expected.PetData}
	result, err := client.Put(context.Background(), input, nil)
	require.NoError(t, err)
	require.Equal(t, expected, result.PetWithCustomNamesClassification)
}
