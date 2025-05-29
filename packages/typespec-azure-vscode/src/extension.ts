// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Hello World from Typespec Azure VS Code!");
}

// This method is called when your extension is deactivated
export function deactivate() {}
