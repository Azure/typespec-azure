// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package filegroup_test

import (
	"bytes"
	"context"
	"filegroup"
	"io"
	"os"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

const jsonFileContent = `{"message":"test file content"}`

func newFileBodyClient(t *testing.T) *filegroup.FileBodyClient {
	client, err := filegroup.NewFileClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client.NewFileBodyClient()
}

func readPNGFile(t *testing.T) []byte {
	data, err := os.ReadFile("../../../../node_modules/@typespec/http-specs/assets/image.png")
	require.NoError(t, err)
	return data
}

func TestFileBodyClientDownloadFileDefaultContentType(t *testing.T) {
	client := newFileBodyClient(t)
	resp, err := client.DownloadFileDefaultContentType(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.ContentType)
	require.Equal(t, "image/png", *resp.ContentType)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.NoError(t, resp.Body.Close())
	require.Equal(t, readPNGFile(t), body)
}

func TestFileBodyClientDownloadFileJSONContentType(t *testing.T) {
	client := newFileBodyClient(t)
	resp, err := client.DownloadFileJSONContentType(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.ContentType)
	require.Contains(t, *resp.ContentType, "application/json")
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.NoError(t, resp.Body.Close())
	require.Equal(t, jsonFileContent, string(body))
}

func TestFileBodyClientDownloadFileMultipleContentTypes(t *testing.T) {
	client := newFileBodyClient(t)
	resp, err := client.DownloadFileMultipleContentTypes(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.ContentType)
	require.Equal(t, filegroup.DownloadFileMultipleContentTypesResponseContentTypeImagePNG, *resp.ContentType)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.NoError(t, resp.Body.Close())
	require.Equal(t, readPNGFile(t), body)
}

func TestFileBodyClientDownloadFileSpecificContentType(t *testing.T) {
	client := newFileBodyClient(t)
	resp, err := client.DownloadFileSpecificContentType(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.ContentType)
	require.Equal(t, "image/png", *resp.ContentType)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.NoError(t, resp.Body.Close())
	require.Equal(t, readPNGFile(t), body)
}

func TestFileBodyClientUploadFileDefaultContentType(t *testing.T) {
	client := newFileBodyClient(t)
	file := streaming.NopCloser(bytes.NewReader(readPNGFile(t)))
	resp, err := client.UploadFileDefaultContentType(context.Background(), file, &filegroup.FileBodyClientUploadFileDefaultContentTypeOptions{
		ContentType: to.Ptr("image/png"),
	})
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestFileBodyClientUploadFileJSONContentType(t *testing.T) {
	client := newFileBodyClient(t)
	file := streaming.NopCloser(bytes.NewReader([]byte(jsonFileContent)))
	resp, err := client.UploadFileJSONContentType(context.Background(), file, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestFileBodyClientUploadFileMultipleContentTypes(t *testing.T) {
	client := newFileBodyClient(t)
	file := streaming.NopCloser(bytes.NewReader(readPNGFile(t)))
	resp, err := client.UploadFileMultipleContentTypes(context.Background(), file, filegroup.UploadFileMultipleContentTypesContentTypeImagePNG, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestFileBodyClientUploadFileSpecificContentType(t *testing.T) {
	client := newFileBodyClient(t)
	file := streaming.NopCloser(bytes.NewReader(readPNGFile(t)))
	resp, err := client.UploadFileSpecificContentType(context.Background(), file, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
