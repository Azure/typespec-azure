// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import com.microsoft.typespec.http.client.generator.TypeSpecPlugin;
import com.microsoft.typespec.http.client.generator.core.extension.model.codemodel.CodeModel;
import com.microsoft.typespec.http.client.generator.core.extension.plugin.JavaSettings;
import com.microsoft.typespec.http.client.generator.core.model.clientmodel.Client;
import com.microsoft.typespec.http.client.generator.core.model.javamodel.JavaPackage;
import com.microsoft.typespec.http.client.generator.fluent.TypeSpecFluentPlugin;
import com.microsoft.typespec.http.client.generator.model.EmitterOptions;
import io.clientcore.core.serialization.json.JsonReader;
import org.teavm.jso.JSBody;
import org.teavm.jso.JSFunctor;
import org.teavm.jso.JSObject;

public final class BrowserGenerator {
    public static void main(String[] args) {
        publish(BrowserGenerator::generate);
    }

    private static JSObject generate(JSObject input, String optionsJson) {
        EmitterOptions options;
        try (JsonReader reader = JsonReader.fromString(optionsJson)) {
            options = EmitterOptions.fromJson(reader);
        } catch (java.io.IOException error) {
            throw new IllegalArgumentException("Invalid Java emitter options", error);
        }
        CodeModel codeModel = (CodeModel) new ModelReader().readRoot(input);
        if (options.getNamespace() == null) {
            options.setNamespace(codeModel.getLanguage().getJava().getNamespace());
        }
        options.setOutputDir("/output");
        JavaPackage output = Boolean.TRUE.equals(options.getArm())
            ? generateArm(codeModel, options)
            : generateDataPlane(codeModel, options);
        JSObject files = newFiles();
        BrowserPostprocessor postprocessor = new BrowserPostprocessor();
        output.getJavaFiles().forEach(file -> addFile(files, file.getFilePath(),
            postprocessor.removeUnusedImports(file.getFilePath(), file.getContents().toString())));
        output.getXmlFiles().forEach(file -> addFile(files, file.getFilePath(), file.getContents().toString()));
        output.getTextFiles().forEach(file -> addFile(files, file.getFilePath(), file.getContents()));
        return files;
    }

    private static JavaPackage generateDataPlane(CodeModel codeModel, EmitterOptions options) {
        TypeSpecPlugin plugin = new TypeSpecPlugin(options, false) {
            @Override
            public Boolean getBooleanValue(String key) {
                return "regenerate-pom".equals(key) ? Boolean.TRUE : super.getBooleanValue(key);
            }
        };
        Client client = plugin.processClient(codeModel);
        return plugin.processTemplates(codeModel, client, JavaSettings.getInstance());
    }

    private static JavaPackage generateArm(CodeModel codeModel, EmitterOptions options) {
        TypeSpecFluentPlugin plugin = new TypeSpecFluentPlugin(options, false);
        codeModel = plugin.preProcess(codeModel);
        Client client = plugin.processClient(codeModel);
        return plugin.processTemplates(codeModel, client);
    }

    @JSFunctor
    interface Generator extends JSObject {
        JSObject generate(JSObject input, String optionsJson);
    }

    @JSBody(params = "generate", script = "globalThis.generateJava = generate;")
    private static native void publish(Generator generate);

    @JSBody(script = "return Object.create(null);")
    private static native JSObject newFiles();

    @JSBody(params = { "files", "name", "content" }, script = "files[name] = content;")
    private static native void addFile(JSObject files, String name, String content);
}
