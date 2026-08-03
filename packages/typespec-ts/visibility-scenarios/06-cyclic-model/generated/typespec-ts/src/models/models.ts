// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/**
 * Self-referential (cyclic) model used as a POST body. It has a required
 * read-only `nodeId` and an optional `next` pointing back to Node. The pre-pass
 * collects each `(model, visibility)` node before recursing, so the cyclic
 * back-edge (`next`) terminates instead of looping. Because it materializes every
 * write-clone shell before wiring any edges, the cyclic edge resolves uniformly:
 * `NodeCreate.next` correctly references `NodeCreate` (not `Node`) and
 * `nodeCreateSerializer` delegates `next` to `nodeCreateSerializer`, dropping the
 * read-only `nodeId` at every depth — with no separate back-patch pass. The read
 * view keeps full `Node` for the response deserializer.
 */
export interface Node {
  /** Server-assigned identifier (read-only). */
  readonly nodeId: string;
  /** Writable label. */
  label: string;
  /** Optional self-reference (creates the cycle). */
  next?: Node;
}

export function nodeSerializer(item: Node): any {
  return {
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeSerializer(item["next"]),
  };
}

export function nodeDeserializer(item: any): Node {
  return {
    nodeId: item["nodeId"],
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeDeserializer(item["next"]),
  };
}

/**
 * Self-referential (cyclic) model used as a POST body. It has a required
 * read-only `nodeId` and an optional `next` pointing back to Node. The pre-pass
 * collects each `(model, visibility)` node before recursing, so the cyclic
 * back-edge (`next`) terminates instead of looping. Because it materializes every
 * write-clone shell before wiring any edges, the cyclic edge resolves uniformly:
 * `NodeCreate.next` correctly references `NodeCreate` (not `Node`) and
 * `nodeCreateSerializer` delegates `next` to `nodeCreateSerializer`, dropping the
 * read-only `nodeId` at every depth — with no separate back-patch pass. The read
 * view keeps full `Node` for the response deserializer.
 */
export interface NodeCreate {
  /** Writable label. */
  label: string;
  /** Optional self-reference (creates the cycle). */
  next?: NodeCreate;
}

export function nodeCreateSerializer(item: NodeCreate): any {
  return {
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeCreateSerializer(item["next"]),
  };
}

export function nodeCreateDeserializer(item: any): NodeCreate {
  return {
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeCreateDeserializer(item["next"]),
  };
}
