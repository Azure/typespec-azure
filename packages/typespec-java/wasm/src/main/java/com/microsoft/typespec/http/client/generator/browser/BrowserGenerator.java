// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import com.microsoft.typespec.http.client.generator.TypeSpecPlugin;
import com.microsoft.typespec.http.client.generator.core.extension.model.codemodel.CodeModel;
import com.microsoft.typespec.http.client.generator.core.extension.plugin.JavaSettings;
import com.microsoft.typespec.http.client.generator.core.model.clientmodel.Client;
import com.microsoft.typespec.http.client.generator.core.model.javamodel.JavaPackage;
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
        if (Boolean.TRUE.equals(options.getArm())) {
            throw new UnsupportedOperationException("The TeaVM POC supports data-plane clients only");
        }
        if (options.getNamespace() == null) {
            options.setNamespace(codeModel.getLanguage().getJava().getNamespace());
        }
        options.setOutputDir("/output");
        TypeSpecPlugin plugin = new TypeSpecPlugin(options, false);
        Client client = plugin.processClient(codeModel);
        JavaPackage output = plugin.processTemplates(codeModel, client, JavaSettings.getInstance());
        JSObject files = newFiles();
        output.getJavaFiles().forEach(file -> addFile(files, file.getFilePath(), file.getContents().toString()));
        output.getXmlFiles().forEach(file -> addFile(files, file.getFilePath(), file.getContents().toString()));
        output.getTextFiles().forEach(file -> addFile(files, file.getFilePath(), file.getContents()));
        return files;
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
