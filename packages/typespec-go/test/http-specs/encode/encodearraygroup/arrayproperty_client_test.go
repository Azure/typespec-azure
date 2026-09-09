// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package encodearraygroup_test

import (
	"context"
	"encodearraygroup"
	"testing"

	"github.com/stretchr/testify/require"
)

var stringValues = []string{"blue", "red", "green"}
var enumValues = []encodearraygroup.Colors{
	encodearraygroup.ColorsBlue,
	encodearraygroup.ColorsRed,
	encodearraygroup.ColorsGreen,
}
var extensibleEnumValues = []encodearraygroup.ColorsExtensibleEnum{
	encodearraygroup.ColorsExtensibleEnumBlue,
	encodearraygroup.ColorsExtensibleEnumRed,
	encodearraygroup.ColorsExtensibleEnumGreen,
}

func newArrayPropertyClient(t *testing.T) *encodearraygroup.ArrayPropertyClient {
	client, err := encodearraygroup.NewArrayClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client.NewArrayPropertyClient()
}

func TestArrayPropertyClientCommaDelimited(t *testing.T) {
	body := encodearraygroup.CommaDelimitedArrayProperty{Value: stringValues}
	resp, err := newArrayPropertyClient(t).CommaDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.CommaDelimitedArrayProperty)
}

func TestArrayPropertyClientSpaceDelimited(t *testing.T) {
	body := encodearraygroup.SpaceDelimitedArrayProperty{Value: stringValues}
	resp, err := newArrayPropertyClient(t).SpaceDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.SpaceDelimitedArrayProperty)
}

func TestArrayPropertyClientPipeDelimited(t *testing.T) {
	body := encodearraygroup.PipeDelimitedArrayProperty{Value: stringValues}
	resp, err := newArrayPropertyClient(t).PipeDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.PipeDelimitedArrayProperty)
}

func TestArrayPropertyClientNewlineDelimited(t *testing.T) {
	body := encodearraygroup.NewlineDelimitedArrayProperty{Value: stringValues}
	resp, err := newArrayPropertyClient(t).NewlineDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.NewlineDelimitedArrayProperty)
}

func TestArrayPropertyClientEnumCommaDelimited(t *testing.T) {
	body := encodearraygroup.CommaDelimitedEnumArrayProperty{Value: enumValues}
	resp, err := newArrayPropertyClient(t).EnumCommaDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.CommaDelimitedEnumArrayProperty)
}

func TestArrayPropertyClientEnumSpaceDelimited(t *testing.T) {
	body := encodearraygroup.SpaceDelimitedEnumArrayProperty{Value: enumValues}
	resp, err := newArrayPropertyClient(t).EnumSpaceDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.SpaceDelimitedEnumArrayProperty)
}

func TestArrayPropertyClientEnumPipeDelimited(t *testing.T) {
	body := encodearraygroup.PipeDelimitedEnumArrayProperty{Value: enumValues}
	resp, err := newArrayPropertyClient(t).EnumPipeDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.PipeDelimitedEnumArrayProperty)
}

func TestArrayPropertyClientEnumNewlineDelimited(t *testing.T) {
	body := encodearraygroup.NewlineDelimitedEnumArrayProperty{Value: enumValues}
	resp, err := newArrayPropertyClient(t).EnumNewlineDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.NewlineDelimitedEnumArrayProperty)
}

func TestArrayPropertyClientExtensibleEnumCommaDelimited(t *testing.T) {
	body := encodearraygroup.CommaDelimitedExtensibleEnumArrayProperty{Value: extensibleEnumValues}
	resp, err := newArrayPropertyClient(t).ExtensibleEnumCommaDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.CommaDelimitedExtensibleEnumArrayProperty)
}

func TestArrayPropertyClientExtensibleEnumSpaceDelimited(t *testing.T) {
	body := encodearraygroup.SpaceDelimitedExtensibleEnumArrayProperty{Value: extensibleEnumValues}
	resp, err := newArrayPropertyClient(t).ExtensibleEnumSpaceDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.SpaceDelimitedExtensibleEnumArrayProperty)
}

func TestArrayPropertyClientExtensibleEnumPipeDelimited(t *testing.T) {
	body := encodearraygroup.PipeDelimitedExtensibleEnumArrayProperty{Value: extensibleEnumValues}
	resp, err := newArrayPropertyClient(t).ExtensibleEnumPipeDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.PipeDelimitedExtensibleEnumArrayProperty)
}

func TestArrayPropertyClientExtensibleEnumNewlineDelimited(t *testing.T) {
	body := encodearraygroup.NewlineDelimitedExtensibleEnumArrayProperty{Value: extensibleEnumValues}
	resp, err := newArrayPropertyClient(t).ExtensibleEnumNewlineDelimited(context.Background(), body, nil)
	require.NoError(t, err)
	require.Equal(t, body, resp.NewlineDelimitedExtensibleEnumArrayProperty)
}
