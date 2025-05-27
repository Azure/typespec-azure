// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { TypespecExtensionId } from "./constant";

export async function activate(context: vscode.ExtensionContext) {
  // load and activate typespec extension
  const typespecExtension = vscode.extensions.getExtension(TypespecExtensionId);
  if (typespecExtension) {
    await typespecExtension.activate();
  } else {
    vscode.window.showErrorMessage(
      "Typespec extension is not installed. Please install it to use this extension.",
    );
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
