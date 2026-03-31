/**
 * Centralized message merge, deduplication, and sorting.
 * Single source of truth for combining messages from fetch, API, and real-time handlers.
 */

import type { Message } from "../../common/types/chat";

/** Returns true if message has a server-assigned ID (not log-generated) */
export function isServerMessage(msg: Message): boolean {
  const id = msg?.id || "";
  return (
    id.length > 0 &&
    !id.startsWith("outgoing-") &&
    !id.startsWith("incoming-")
  );
}

/** Normalize content for comparison (handles JSON) */
function normalizeContent(content: string | null | undefined): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch {
    return String(content).trim();
  }
}

/**
 * Get a deduplication key for a message.
 * Server messages: use id. Log messages: use content-based key.
 */
export function getDedupKey(msg: Message): string {
  if (isServerMessage(msg) && msg.id) {
    return `id:${msg.id}`;
  }

  const content = normalizeContent(msg.content);
  const sender = msg.sender || "";
  const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date(0);
  const timeBucket = Math.floor(createdAt.getTime() / 2000); // 2-second window

  if (msg.messageType === "products" && msg.products) {
    const arr = Array.isArray(msg.products) ? msg.products : [];
    const first = arr[0] as { action_id?: string; id?: string } | undefined;
    const productId = first?.action_id || first?.id || "";
    return `products:${productId}:${sender}:${timeBucket}`;
  }

  if (
    msg.messageType === "image" ||
    msg.messageType === "audio" ||
    msg.messageType === "file"
  ) {
    const url =
      msg.imageUrl || msg.audioUrl || msg.fileUrl || msg.fileName || "";
    return `${msg.messageType}:${url}:${sender}:${timeBucket}`;
  }

  return `content:${content}:${sender}:${timeBucket}`;
}

/**
 * Merge incoming messages into existing, deduplicate, and sort by time.
 * When duplicate found: prefer server message over log-derived message.
 * Returns messages sorted ascending by createdAt (oldest first).
 */
export function mergeAndSortMessages(
  existing: Message[],
  incoming: Message[],
  peerId?: string
): Message[] {
  const byKey = new Map<string, Message>();

  for (const msg of existing) {
    const key = getDedupKey(msg);
    byKey.set(key, msg);
  }

  for (const msg of incoming) {
    const key = getDedupKey(msg);
    const existingMsg = byKey.get(key);
    if (!existingMsg) {
      byKey.set(key, { ...msg, peerId: peerId ?? msg.peerId });
      continue;
    }
    if (isServerMessage(msg) && !isServerMessage(existingMsg)) {
      byKey.set(key, { ...msg, peerId: peerId ?? msg.peerId });
    }
  }

  const merged = Array.from(byKey.values());
  const getTime = (m: Message): number => {
    if (!m.createdAt) return Number.MAX_SAFE_INTEGER; // Missing timestamp → sort to end
    const t = new Date(m.createdAt).getTime();
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };
  return merged.sort((a, b) => getTime(a) - getTime(b));
}

/**
 * Deduplicate and sort a single array of messages.
 */
export function deduplicateAndSort(messages: Message[]): Message[] {
  return mergeAndSortMessages([], messages);
}
