// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import com.microsoft.typespec.http.client.generator.core.extension.model.codemodel.CodeModel;
import com.microsoft.typespec.http.client.generator.core.model.clientmodel.Client;
import com.microsoft.typespec.http.client.generator.core.model.javamodel.JavaPackage;
import com.microsoft.typespec.http.client.generator.fluent.TypeSpecFluentPlugin;
import com.microsoft.typespec.http.client.generator.model.EmitterOptions;

public final class BrowserArmGenerator {
    public static void main(String[] args) {
        BrowserGenerator.publish(
            (input, options) -> BrowserGenerator.generate(input, options, BrowserArmGenerator::generate));
    }

    private static JavaPackage generate(CodeModel codeModel, EmitterOptions options) {
        if (!Boolean.TRUE.equals(options.getArm())) {
            throw new UnsupportedOperationException("The ARM WASM target cannot generate data-plane clients");
        }
        TypeSpecFluentPlugin plugin = new TypeSpecFluentPlugin(options, false);
        codeModel = plugin.preProcess(codeModel);
        Client client = plugin.processClient(codeModel);
        return plugin.processTemplates(codeModel, client);
    }
}
