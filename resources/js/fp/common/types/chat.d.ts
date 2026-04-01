// Chat-related type definitions

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  lastSeen?: string;
  lastMessage?: string | object;
  timestamp?: Date | null;
  lastMessageFrom?: string | null;
  /** Agora group / conversation id from list API; null/undefined if the group is not created yet */
  conversationId?: string | null;
  /** Resolved group id after getDietitianToken (same as active Agora group) */
  groupId?: string | null;
  isGroupConversation?: boolean | null;
  participantIds?: number[];
  messageCount?: number;
  unreadCount?: number;
  filterState?: string;
  description?: string;
  replyCount?: number;
  createdAt?: string | Date; // Chat initiation date/time
}

/**
 * Incoming Agora chat SDK message shape (handlers, logging).
 * Compatible with agora-chat payloads; index allows v2:customExts and other SDK fields.
 */
export interface MessageBody {
  from?: string;
  chatType?: string;
  to?: string;
  type?: string;
  msg?: string;
  body?: string | object;
  ext?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  isIncoming: boolean;
  messageType?: string;
  imageUrl?: string;
  imageData?: string;
  audioUrl?: string;
  audioDurationMs?: number;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSizeBytes?: number;
  fileSize?: string;
  products?: Product[];
  callType?: string;
  callDurationSeconds?: number | undefined;
  audioTranscription?: string;
  label?: string;
  avatar?: string;
  system?: SystemMessageData;
  createdAt?: string | Date;
  peerId?: string;
  callAction?: string;
  channel?: string;
  isEdited?: boolean;
}

export interface MealPlanIconsDetails {
  left_icon?: string;
  right_icon?: string;
}

export interface MealPlanRedirectionDetail {
  cta_details?: Record<string, unknown>;
  redirect_url?: string;
  action_id?: string;
}

export interface MealPlanPayload {
  action_type?: string;
  title?: string;
  description?: string;
  icons_details?: MealPlanIconsDetails;
  redirection_details?: MealPlanRedirectionDetail[];
}

export interface SystemMessageData {
  kind?: string;
  name?: string;
  title?: string;
  profilePhoto?: string;
  payload?: {
    id?: string;
    name?: string;
    title?: string;
    profilePhoto?: string;
    action_type?: string;
    description?: string;
    icons_details?: MealPlanIconsDetails;
    redirection_details?: MealPlanRedirectionDetail[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  actual_amount: number;
  selling_amount: number;
  image_url: string;
  action_id: string;
  rediection_url: string; // Note: API uses "rediection" (typo) instead of "redirection"
  cta_details: {
    text: string;
    text_color: string;
    bg_color: string;
  };
}

export interface DraftAttachment {
  type: "image" | "audio" | "file";
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}

export interface CoachInfo {
  coachName: string;
  profilePhoto: string;
}

export interface LogEntry {
  log?: string;
  timestamp?: Date;
  serverMsgId?: string; // Server message ID from Agora (for editing messages)
}
