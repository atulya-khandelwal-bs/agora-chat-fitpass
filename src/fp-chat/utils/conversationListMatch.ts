import type { Contact, MessageBody } from "../../common/types/chat";

/** Id variants for matching API list rows (userId string vs user_ prefix). */
export function normalizeUserIdVariants(id: string): string[] {
  const t = String(id || "").trim();
  if (!t) return [];
  const noPrefix = t.startsWith("user_") ? t.slice(5) : t;
  const withPrefix = t.startsWith("user_") ? t : `user_${noPrefix}`;
  return [...new Set([t, noPrefix, withPrefix])];
}

function findByMemberVariants(prev: Contact[], memberKey: string): Contact | undefined {
  const variants = normalizeUserIdVariants(memberKey);
  return prev.find((c) => variants.includes(String(c.id)));
}

function findByGroupTarget(prev: Contact[], groupId: string): Contact | undefined {
  const g = String(groupId || "").trim();
  if (!g) return undefined;
  return prev.find(
    (c) =>
      (c.groupId != null && String(c.groupId) === g) ||
      (c.conversationId != null && String(c.conversationId) === g)
  );
}

/**
 * Map an Agora group message to the conversation list row (patient `Contact.id`).
 * Self-sent: `ext.targetUserId` then `msg.to` as Agora group id vs `groupId` / `conversationId` on Contact.
 * Incoming: `msg.from` is the sender user id (patient or coach).
 */
export function findContactForMessageConversation(
  prev: Contact[],
  msg: MessageBody,
  isSelfSent: boolean
): Contact | undefined {
  if (!isSelfSent) {
    const from = msg.from != null ? String(msg.from).trim() : "";
    if (!from) return undefined;
    return findByMemberVariants(prev, from);
  }

  const ext = msg.ext as { targetUserId?: string | number } | undefined;
  const target =
    ext?.targetUserId != null && String(ext.targetUserId).trim() !== ""
      ? String(ext.targetUserId)
      : "";
  if (target) {
    const byPatient = findByMemberVariants(prev, target);
    if (byPatient) return byPatient;
  }
  const to = msg.to != null ? String(msg.to).trim() : "";
  if (to) {
    const byGroup = findByGroupTarget(prev, to);
    if (byGroup) return byGroup;
  }
  return undefined;
}

/** After sending from the composer: match list row by patient id and/or Agora group id. */
export function findContactForOutgoingListUpdate(
  prev: Contact[],
  memberUserId: string,
  groupId: string
): Contact | undefined {
  if (memberUserId.trim()) {
    const byMember = findByMemberVariants(prev, memberUserId);
    if (byMember) return byMember;
  }
  return findByGroupTarget(prev, groupId);
}

/** `peerId` is the open thread’s Agora group id; list rows match on `groupId` / `conversationId`. */
export function findContactForHistoryPeer(
  prev: Contact[],
  peerId: string
): Contact | undefined {
  return findByGroupTarget(prev, peerId);
}
