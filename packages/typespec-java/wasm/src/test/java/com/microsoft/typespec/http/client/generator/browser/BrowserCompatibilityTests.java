// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class BrowserCompatibilityTests {
    @Test
    void deduplicatesAcrossConcatenatedStreamsInEncounterOrder() {
        Object widget = new Object();
        Object analytics = new Object();
        Stream<Object> models = Stream.concat(Stream.of(widget, analytics, null, "name"),
            Stream.of(widget, analytics, null, new String("name")));

        assertEquals(Arrays.asList(widget, analytics, null, "name"),
            BrowserCompatibility.distinct(models).collect(Collectors.toList()));
    }
}
