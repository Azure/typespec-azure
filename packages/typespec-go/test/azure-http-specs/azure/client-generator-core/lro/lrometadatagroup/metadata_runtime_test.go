// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lrometadatagroup_test

import (
	"context"
	"fmt"
	"lrometadatagroup"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStatusMetadataConcurrentRead(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.Header().Set("Operation-Location", server.URL+"/jobs/1")
			w.WriteHeader(http.StatusAccepted)
			fmt.Fprint(w, `{"status":"Running","jobId":"1"}`)
			return
		}
		fmt.Fprint(w, `{"status":"Running","jobId":"1","statistics":{"total":3,"succeeded":1,"failed":0}}`)
	}))
	defer server.Close()
	client, err := lrometadatagroup.NewMetadataClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginAnalyzeJob(context.Background(), nil)
	require.NoError(t, err)
	done := make(chan error, 1)
	go func() {
		for i := 0; i < 50; i++ {
			if _, err := poller.Poll(context.Background()); err != nil {
				done <- err
				return
			}
		}
		done <- nil
	}()
	for {
		select {
		case err := <-done:
			require.NoError(t, err)
			return
		default:
			poller.StatusMetadata()
		}
	}
}

func TestStatusMetadataRefreshAndDecodeError(t *testing.T) {
	var server *httptest.Server
	polls := 0
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.Header().Set("Operation-Location", server.URL+"/jobs/1")
			w.WriteHeader(http.StatusAccepted)
			fmt.Fprint(w, `{"status":"Running","jobId":"1"}`)
			return
		}
		polls++
		switch polls {
		case 1:
			fmt.Fprint(w, `{"status":"Running","statistics":{"total":3,"succeeded":1,"failed":0}}`)
		case 2:
			fmt.Fprint(w, `{"status":"Running"}`)
		default:
			fmt.Fprint(w, `{"status":"Running","statistics":"not an object"}`)
		}
	}))
	defer server.Close()
	client, err := lrometadatagroup.NewMetadataClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginAnalyzeJob(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, poller.StatusMetadata().JobID)
	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	require.Nil(t, poller.StatusMetadata().JobID)
	require.NotNil(t, poller.StatusMetadata().Statistics)
	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	require.Nil(t, poller.StatusMetadata().Statistics)
	_, err = poller.Poll(context.Background())
	require.ErrorContains(t, err, "failed to decode status metadata")
}

func TestStatusMetadataOnCancellation(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.Header().Set("Operation-Location", server.URL+"/jobs/1")
			w.WriteHeader(http.StatusAccepted)
			fmt.Fprint(w, `{"status":"Running","jobId":"1"}`)
			return
		}
		fmt.Fprint(w, `{"status":"Canceled","jobId":"1","statistics":{"total":3,"succeeded":1,"failed":2}}`)
	}))
	defer server.Close()
	client, err := lrometadatagroup.NewMetadataClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginAnalyzeJob(context.Background(), nil)
	require.NoError(t, err)
	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	require.True(t, poller.Done())
	_, err = poller.Result(context.Background())
	require.Error(t, err)
	require.EqualValues(t, 2, *poller.StatusMetadata().Statistics.Failed)
}
