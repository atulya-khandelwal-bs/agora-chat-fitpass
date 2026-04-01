import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import config from "../../common/config.ts";
import FPChatHeader from "./FPChatHeader";
import FPChatTab from "./FPChatTab";
import FPInfoTab from "./FPInfoTab";
import FPDescriptionTab from "./FPDescriptionTab";
import type { Connection } from "agora-chat";
import FPMessageInput from "./FPMessageInput";
import FPDraftAttachmentPreview from "./FPDraftAttachmentPreview";
import FPMediaPopup from "./FPMediaPopup";
import FPAudioRecordingOverlay from "./FPAudioRecordingOverlay";
import FPCameraCaptureOverlay from "./FPCameraCaptureOverlay";
import FPImageViewer from "./FPImageViewer";
import FPVideoPlayer from "./FPVideoPlayer";
import FPAudioPlayer from "./FPAudioPlayer";
import {
  formatMessage,
  convertApiMessageToFormat,
  parseSystemPayload,
  getSystemLabel,
} from "../utils/messageFormatters.ts";
import {
  mergeAndSortMessages,
  deduplicateAndSort,
} from "../utils/messageMerge.ts";
import { editMessage } from "../utils/messageEditor.ts";

// Import types from messageFormatters
interface AgoraMessage {
  id?: string;
  mid?: string; // Message ID from delivery receipt (used for editing)
  from?: string;
  to?: string;
  time?: number;
  type?: string;
  msg?: string;
  msgContent?: string;
  data?: string;
  body?: string | object;
  customExts?: object;
  "v2:customExts"?: object;
  ext?: {
    type?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    size?: number | string;
    duration?: number | string;
    transcription?: string;
    data?: string | object;
    [key: string]: unknown;
  };
  sender_photo?: string;
  createdAt?: number | Date;
  [key: string]: unknown;
}

interface ApiMessage {
  message_id?: string;
  conversation_id?: string;
  from_user?: string;
  to_user?: string;
  sender_name?: string;
  sender_photo?: string;
  message_type?: string;
  body?: string | object;
  created_at?: string | number;
  created_at_ms?: number;
  chat_type?: string;
}
import {
  Message,
  Contact,
  DraftAttachment,
  CoachInfo,
  LogEntry,
  SystemMessageData,
} from "../../common/types/chat";

interface FPChatInterfaceProps {
  userId: string;
  peerId: string | null;
  setPeerId: (id: string | null) => void;
  message: string;
  setMessage: (msg: string | ((prev: string) => string)) => void;
  onSend: (msg: string | object) => void;
  onLogout?: () => void;
  logs: (string | LogEntry)[];
  selectedContact: Contact | null;
  chatClient: unknown;
  onBackToConversations?: (() => void) | null;
  onInitiateCall?: ((callType: "video" | "audio") => void) | null;
  onUpdateLastMessageFromHistory?: (peerId: string, message: Message) => void;
  coachInfo?: CoachInfo;
  onSendProducts?: (() => void) | null;
  /** When false, initial history fetch waits (e.g. until Agora login completes) */
  historyFetchEnabled?: boolean;
}

export default function FPChatInterface({
  userId,
  peerId,
  setPeerId: _setPeerId,
  message,
  setMessage,
  onSend,
  onLogout: _onLogout,
  logs,
  selectedContact,
  chatClient,
  onBackToConversations,
  onInitiateCall,
  onUpdateLastMessageFromHistory,
  coachInfo = { coachName: "", profilePhoto: "" },
  onSendProducts,
  historyFetchEnabled = true,
}: FPChatInterfaceProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"Chat" | "Info" | "Description">(
    "Chat"
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMediaPopup, setShowMediaPopup] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);
  const [_selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | number | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [imageViewerUrl, setImageViewerUrl] = useState<string>("");
  const [imageViewerAlt, setImageViewerAlt] = useState<string>("");
  const [videoPlayerUrl, setVideoPlayerUrl] = useState<string>("");
  const [audioPlayerUrl, setAudioPlayerUrl] = useState<string>("");
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const mediaPopupRef = useRef<HTMLDivElement>(null);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null); // Track when recording started
  const recordingDurationRef = useRef<number>(0); // Track duration in a ref for accurate reading
  const shouldSendRecordingRef = useRef<boolean>(true);
  const [inputResetKey, setInputResetKey] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageRef = useRef<string>("");
  const currentlyPlayingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const chatClientRef = useRef<unknown>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const audioBtnRef = useRef<HTMLButtonElement>(null);
  const fetchedPeersRef = useRef<{
    fetchedPeers: Set<string>;
    currentPeer: string | null;
  }>({
    fetchedPeers: new Set(), // Track which peers we've already fetched history for
    currentPeer: null, // Track the current peer to detect changes
  });
  // History strategy:
  // 1) Fetch from Agora until it returns an empty page (no more history)
  // 2) Then fetch older messages from backend DB using `from=<oldestAgoraTimestampMs>`
  const agoraHistoryExhaustedRef = useRef<boolean>(false);
  const oldestAgoraTimestampMsRef = useRef<number | null>(null);
  const isLoadingHistoryRef = useRef<boolean>(false);
  const skipAutoScrollRef = useRef<boolean>(false);

  // Scroll to top when Description tab is selected
  useEffect(() => {
    if (activeTab === "Description" && chatAreaRef.current) {
      // Use multiple timeouts to ensure this runs after any other scroll effects
      const timeoutId1 = setTimeout(() => {
        if (chatAreaRef.current && activeTab === "Description") {
          chatAreaRef.current.scrollTop = 0;
        }
      }, 0);

      const timeoutId2 = setTimeout(() => {
        if (chatAreaRef.current && activeTab === "Description") {
          chatAreaRef.current.scrollTop = 0;
        }
      }, 100);

      const timeoutId3 = setTimeout(() => {
        if (chatAreaRef.current && activeTab === "Description") {
          chatAreaRef.current.scrollTop = 0;
        }
      }, 200);

      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [activeTab]);

  const toggleEmojiPicker = (): void => {
    setShowEmojiPicker((prev) => !prev);
  };

  // Helper: label for day headers (Today / Yesterday / formatted date)
  const formatDateLabel = (date: Date): string => {
    const now = new Date();
    const startOfDay = (d: Date): Date =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(date).getTime()) / dayMs
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Currency formatter (INR by default to match the sample UI)
  const formatCurrency = (
    value: number | null | undefined,
    currency = "INR",
    locale = "en-IN"
  ): string => {
    if (value == null || isNaN(value)) return "";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      const prefix = currency === "INR" ? "₹" : "";
      return `${prefix}${Math.round(Number(value))}`;
    }
  };

  // parseSystemPayload is now imported from utils

  // Detect draft attachment from the current input message (JSON with type and url)
  // Note: audio messages are not shown as draft attachments, they are sent immediately
  const parseDraftAttachment = (
    raw: string | null | undefined
  ): DraftAttachment | null => {
    if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !obj.type) return null;
      const t = String(obj.type).toLowerCase();
      // Show draft for image, file, and audio
      if ((t === "image" || t === "file" || t === "audio") && obj.url) {
        return {
          type: t as "image" | "file" | "audio",
          url: obj.url,
          fileName: obj.fileName || "attachment",
          mimeType:
            obj.mimeType ||
            (t === "image"
              ? "image/*"
              : t === "audio"
              ? "audio/*"
              : "application/octet-stream"),
          size: obj.size ?? undefined,
          duration: obj.duration ?? undefined,
          // Include duration for audio
        };
      }
    } catch {}
    return null;
  };

  const draftAttachment = parseDraftAttachment(message);

  const clearDraftAttachment = (): void => {
    try {
      const att = parseDraftAttachment(message);
      if (att && typeof att.url === "string" && att.url.startsWith("blob:")) {
        URL.revokeObjectURL(att.url);
      }
    } catch {}
    setSelectedMedia(null);
    setMessage("");
  };

  const getDraftCaption = (): string => {
    if (!draftAttachment) return "";
    // For audio, don't show caption in input - the preview handles it
    if (draftAttachment.type === "audio") {
      return "";
    }
    try {
      const obj = JSON.parse(message);
      return obj.caption || obj.body || "";
    } catch {
      return "";
    }
  };

  // getSystemLabel is now imported from utils

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    const handleScroll = () => {
      if (chatArea.scrollTop === 0 && !isFetchingHistory && hasMore) {
        fetchMoreMessages();
      }
    };

    chatArea.addEventListener("scroll", handleScroll);
    return () => chatArea.removeEventListener("scroll", handleScroll);
  }, [peerId, isFetchingHistory, hasMore, cursor]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (): void => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  // Convert logs to message format
  useEffect(() => {
    if (!peerId) {
      setMessages([]);
      return;
    }

    // Create a simple hash function for log content
    const hashLog = (log: string): number => {
      let hash = 0;
      for (let i = 0; i < log.length; i++) {
        const char = log.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    // Find the index of each log entry and create a unique identifier
    // Handle both old format (string) and new format (object with log and timestamp)
    const logEntries = logs.map((logEntry, logIndex) => {
      const log = typeof logEntry === "string" ? logEntry : logEntry.log;
      // For log entries that are strings, we can't determine the actual timestamp
      // They will be replaced by server messages when history is fetched
      // For now, use current time but this will be corrected when messages are fetched from server
      const timestamp =
        typeof logEntry === "string"
          ? new Date() // Will be replaced by server timestamp when history is fetched
          : logEntry.timestamp || new Date();
      // Extract serverMsgId from log entry if available (for message editing)
      const serverMsgId =
        typeof logEntry === "object" && "serverMsgId" in logEntry
          ? logEntry.serverMsgId
          : undefined;
      return {
        log,
        timestamp,
        logIndex,
        logHash: log ? hashLog(log) : 0, // Create hash of entire log for stable ID
        serverMsgId, // Include serverMsgId in the log entry data
      };
    });

    // Normalize IDs for comparison (backend may use "123" or "user_123")
    const normalizeId = (id: string) =>
      (id || "").replace(/^user_/, "") || id;
    const idsMatch = (a: string, b: string) =>
      normalizeId(a) === normalizeId(b) || a === b;

    /** FPChatApp logs group sends as `You → group <groupId>:` — strip the label for comparison to peerId */
    const parseOutgoingLogTargetId = (raw: string): string => {
      const t = raw.trim();
      if (t.toLowerCase().startsWith("group ")) {
        return t.slice(6).trim();
      }
      return t;
    };

    const filteredLogs = logEntries.filter((entry) => {
      const { log } = entry;
      if (!log) return false;
      // Filter messages for the current conversation
      if (log.includes("→")) {
        // Outgoing: "You → <groupId>:" or "You → group <groupId>:"
        const match = log.match(/You → ([^:]+):/);
        if (!match) return false;
        const targetInLog = parseOutgoingLogTargetId(match[1]);
        return idsMatch(targetInLog, peerId);
      } else if (log.includes(":")) {
        // Group thread: peerId is Agora group id; logs use sender user id (patient or coach)
        const parts = log.split(":");
        const senderId = parts[0].trim();
        const patientId =
          selectedContact?.id != null ? String(selectedContact.id) : "";
        if (patientId && idsMatch(senderId, patientId)) return true;
        if (userId && idsMatch(senderId, userId)) return true;
        return false;
      }
      return false;
    });

    const newMessages = filteredLogs
      .map(({ log, logHash, logIndex, timestamp, serverMsgId }) => {
        if (!log) return null;
        const isOutgoing = log.includes("→");
        const messageTime =
          timestamp instanceof Date ? timestamp : new Date(timestamp);
        // Create a unique timestamp to ensure consecutive duplicate messages have different IDs
        // Use logHash + logIndex for stable IDs that don't change across re-renders
        // This ensures the same log entry always gets the same ID
        const uniqueTimestamp = logHash + logIndex;

        if (isOutgoing) {
          // Parse "You → peerId: message"
          // Updated regex to handle JSON strings that may contain colons
          const match = log.match(/You → [^:]+: (.+)$/);
          let content = match ? match[1].trim() : "";

          // If content looks like JSON (starts with {), try to parse it
          if (content.startsWith("{")) {
            // Content is already the JSON string, use it as-is
          } else {
            // Fallback: try to extract everything after the first colon
            const colonIndex = log.indexOf(": ");
            if (colonIndex !== -1) {
              content = log.substring(colonIndex + 2).trim();
            }
          }

          // Parse special message formats (IMAGE_DATA, FILE_DATA, or backend JSON)
          let messageContent = content;
          let messageType = "text";
          let imageData = null;
          let fileName = null;
          let fileSize = null;
          let imageUrl = null;
          let audioUrl = null;
          let audioDurationMs = null;
          let audioTranscription = null;
          let fileUrl = null;
          let fileMime = null;
          let fileSizeBytes = null;
          let products = null;
          let callType: string | undefined = undefined;
          let callDurationSeconds: number | undefined = undefined;
          let callChannel: string | undefined = undefined;
          let system = null;

          if (content.startsWith("IMAGE_DATA:")) {
            const imageParts = content.split(":");
            if (imageParts.length >= 3) {
              imageData = imageParts[1];
              fileName = imageParts.slice(2).join(":");
              messageType = "image";
              messageContent = fileName;
            }
          } else if (content.startsWith("FILE_DATA:")) {
            const fileParts = content.split(":");
            if (fileParts.length >= 4) {
              imageData = fileParts[1];
              fileName = fileParts[2];
              fileSize = fileParts[3];
              messageType = "file";
              messageContent = `📎 ${fileName} (${fileSize} KB)`;
            }
          } else {
            // Try backend JSON payloads → else system → else text
            try {
              const obj = JSON.parse(content);

              if (
                obj &&
                typeof obj === "object" &&
                (obj.type || obj.messageType)
              ) {
                const t = String(
                  (obj as { type?: string; messageType?: string }).type ||
                    (obj as { type?: string; messageType?: string }).messageType
                ).toLowerCase();
                // skip system messages coming from logs to avoid duplicates
                // ---- IGNORE HEALTH COACH CHANGED MESSAGES ----
                if (t === "mealPlanUpdate" || t === "healthCoachChanged") {
                  return null; // <-- This ensures UI never displays it
                }

                switch (t) {
                  case "text":
                    messageType = "text";
                    messageContent = obj.body ?? "";
                    break;
                  case "image":
                    messageType = "image";
                    imageUrl = obj.url ?? null;
                    messageContent = obj.url ?? "Image";
                    fileName = obj.fileName ?? null;
                    break;
                  case "audio":
                    messageType = "audio";
                    audioUrl = obj.url ?? null;
                    audioDurationMs = obj.duration ?? null;
                    audioTranscription = obj.transcription ?? null;
                    messageContent = "Audio message";
                    break;
                  case "file":
                    messageType = "file";
                    fileUrl = obj.url ?? null;
                    fileMime = obj.mimeType ?? null;
                    fileSizeBytes = obj.size ?? null;
                    try {
                      const urlObj = new URL(obj.url);
                      fileName = decodeURIComponent(
                        urlObj.pathname.split("/").pop() || "file"
                      );
                    } catch {
                      fileName = obj.fileName || obj.url || "file";
                    }
                    messageContent = `📎 ${fileName}`;
                    break;
                  case "products":
                  case "recommended_products":
                    messageType = "products";
                    // Handle both 'products' and 'product_list' fields
                    if (Array.isArray(obj.products)) {
                      products = obj.products;
                    } else if (Array.isArray(obj.product_list)) {
                      products = obj.product_list;
                    } else {
                      products = [];
                    }
                    messageContent = "Products";
                    break;
                  case "new_nutritionist":
                  case "new_nutrionist":
                  case "coach_assigned":
                  case "coach_details":
                    messageType = "system";
                    // Extract data from payload structure for coach_assigned/coach_details
                    // Use the values directly from obj to preserve what was sent
                    const name = obj.name || obj.title || "";
                    const extractedTitle = obj.title || obj.description || "";
                    const profilePhoto =
                      obj.profilePhoto || obj.icons_details?.left_icon || "";


                    // Determine action_type - prioritize obj.action_type, then obj.type
                    const actionType =
                      obj.action_type ||
                      (obj.type === "coach_assigned"
                        ? "coach_assigned"
                        : obj.type === "coach_details"
                        ? "coach_details"
                        : undefined);

                    // Clean up icons_details - replace "image_url" placeholder with empty string
                    let cleanedIconsDetails = obj.icons_details;
                    if (
                      cleanedIconsDetails &&
                      typeof cleanedIconsDetails === "object"
                    ) {
                      cleanedIconsDetails = {
                        left_icon:
                          cleanedIconsDetails.left_icon === "image_url"
                            ? ""
                            : cleanedIconsDetails.left_icon || "",
                        right_icon:
                          cleanedIconsDetails.right_icon === "image_url"
                            ? ""
                            : cleanedIconsDetails.right_icon || "",
                      };
                    }

                    // Clean up profilePhoto - replace "image_url" placeholder with empty string
                    const cleanedProfilePhoto =
                      profilePhoto === "image_url" ? "" : profilePhoto;

                    system = {
                      kind: "new_nutritionist",
                      id: obj.id || "",
                      name: name,
                      title: extractedTitle,
                      profilePhoto: cleanedProfilePhoto,
                      payload: {
                        // Always include action_type
                        action_type: actionType,
                        // Preserve title from obj (can be empty string for coach_assigned)
                        title:
                          obj.title !== undefined ? obj.title : extractedTitle,
                        // Preserve description from obj (can be empty string for coach_assigned)
                        description:
                          obj.description !== undefined ? obj.description : "",
                        // Use cleaned icons_details (replace "image_url" with empty string)
                        icons_details: cleanedIconsDetails || undefined,
                        // Preserve redirection_details array
                        redirection_details:
                          obj.redirection_details || undefined,
                      },
                    };

                    // Debug: Log the constructed payload
                    console.log(
                      "🔍 [FPChatInterface] Constructed payload:",
                      system.payload
                    );
                    messageContent =
                      name || extractedTitle || "New nutritionist assigned";
                    break;
                  case "meal_plan_updated":
                  case "meal_plan_update":
                    messageType = "system";
                    system = {
                      kind: "meal_plan_updated",
                      payload: {
                        action_type: obj.action_type,
                        title: obj.title,
                        description: obj.description,
                        icons_details: obj.icons_details,
                        redirection_details: obj.redirection_details,
                      },
                    };
                    messageContent = obj.title || "Meal plan updated";
                    break;
                  case "general_notification":
                  case "general-notification":
                    messageType = "general_notification";
                    system = {
                      kind: "general_notification",
                      payload: {
                        action_type: obj.action_type,
                        title: obj.title,
                        description: obj.description,
                        redirection_details: obj.redirection_details,
                      },
                    };
                    messageContent =
                      obj.title || obj.description || "Notification";
                    break;
                  case "video_call":
                  case "voice_call":
                    messageType =
                      obj.type === "video_call" ? "video_call" : "voice_call";
                    system = {
                      kind:
                        obj.type === "video_call" ? "video_call" : "voice_call",
                      payload: {
                        title: obj.title,
                        description: obj.description,
                        icons_details: obj.icons_details,
                        call_details: obj.call_details,
                        redirection_details: obj.redirection_details,
                      },
                    };
                    messageContent =
                      obj.title ||
                      obj.description ||
                      (obj.type === "video_call" ? "Video call" : "Voice call");
                    break;
                  case "call_scheduled":
                  case "scheduled_call_canceled": {
                    messageType = t;
                    const timeValOut = (obj as { time?: number | string }).time;
                    let scheduledTimeOut: number | undefined;
                    if (timeValOut !== undefined) {
                      scheduledTimeOut =
                        typeof timeValOut === "number"
                          ? timeValOut
                          : parseInt(String(timeValOut), 10);
                    }
                    const scheduledDateOut = scheduledTimeOut
                      ? new Date(scheduledTimeOut * 1000)
                      : null;
                    const formatSchedDateOut = (d: Date): string => {
                      const day = d.getDate();
                      const monthNames = [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                      ];
                      const month = monthNames[d.getMonth()];
                      let hours = d.getHours();
                      const minutes = d.getMinutes();
                      const ampm = hours >= 12 ? "pm" : "am";
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const minutesStr =
                        minutes < 10 ? `0${minutes}` : `${minutes}`;
                      return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
                    };
                    system = {
                      kind: t as "call_scheduled" | "scheduled_call_canceled",
                      payload: {
                        time: scheduledTimeOut,
                        scheduledDate: scheduledDateOut?.toISOString(),
                      },
                    } as SystemMessageData;
                    messageContent =
                      t === "scheduled_call_canceled"
                        ? "Scheduled call cancelled"
                        : scheduledDateOut
                          ? `Schedule, ${formatSchedDateOut(scheduledDateOut)}`
                          : "Call scheduled";
                    break;
                  }
                  case "documents":
                    messageType = "documents";
                    system = {
                      kind: "documents",
                      payload: {
                        title: obj.title,
                        description: obj.description,
                        icons_details: obj.icons_details,
                        documents_details: obj.documents_details,
                        redirection_details: obj.redirection_details,
                      },
                    };
                    messageContent = obj.title || obj.description || "Document";
                    // Also set file properties for compatibility with FPFileMessageView
                    fileUrl = obj.documents_details?.document_url || null;
                    fileName = obj.title || null;
                    fileMime = obj.documents_details?.document_type || null;
                    fileSizeBytes =
                      obj.documents_details?.document_size || null;
                    break;
                  case "call":
                    // Convert old "call" format to new format
                    const oldCallType = obj.callType as
                      | "video"
                      | "audio"
                      | undefined;
                    messageType =
                      oldCallType === "audio" ? "voice_call" : "video_call";
                    const callTitle =
                      oldCallType === "video" ? "Video call" : "Voice call";
                    let callDescription: string | undefined;
                    if (obj.duration != null) {
                      const minutes = Math.floor(obj.duration / 60);
                      const seconds = obj.duration % 60;
                      callDescription = `${minutes}:${String(seconds).padStart(
                        2,
                        "0"
                      )}`;
                    }
                    system = {
                      kind:
                        oldCallType === "audio" ? "voice_call" : "video_call",
                      payload: {
                        title: callTitle,
                        description: callDescription,
                        call_details: obj.channel
                          ? { call_url: obj.channel }
                          : undefined,
                      },
                    };
                    messageContent = callDescription
                      ? `${callTitle} - ${callDescription}`
                      : callTitle;
                    break;
                  default: {
                    const parsed = parseSystemPayload(content);
                    if (parsed) {
                      if (
                        parsed.kind === "call_scheduled" ||
                        parsed.kind === "scheduled_call_canceled"
                      ) {
                        messageType = parsed.kind;
                        system = parsed as SystemMessageData;
                        const payloadOut = parsed.payload as { time?: number };
                        const scheduledDateOut = payloadOut?.time
                          ? new Date(payloadOut.time * 1000)
                          : null;
                        const formatSchedOut = (d: Date): string => {
                          const day = d.getDate();
                          const months = [
                            "Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec",
                          ];
                          let h = d.getHours();
                          const m = d.getMinutes();
                          const ampm = h >= 12 ? "pm" : "am";
                          h = h % 12;
                          h = h ? h : 12;
                          return `${day} ${months[d.getMonth()]} ${h}:${String(m).padStart(2,"0")} ${ampm}`;
                        };
                        messageContent =
                          parsed.kind === "scheduled_call_canceled"
                            ? "Scheduled call cancelled"
                            : scheduledDateOut
                              ? `Schedule, ${formatSchedOut(scheduledDateOut)}`
                              : "Call scheduled";
                      } else if (
                        parsed.kind === "new_nutritionist" &&
                        parsed.payload
                      ) {
                        // Extract nutritionist data from payload
                        system = {
                          kind: "new_nutritionist",
                          id: parsed.payload.id || "",
                          name: parsed.payload.name || "",
                          title: parsed.payload.title || "",
                          profilePhoto: parsed.payload.profilePhoto || "",
                        };
                      } else {
                        system = parsed;
                      }
                      messageType = "system";
                      const systemData: SystemMessageData = {
                        kind: parsed.kind,
                        ...parsed.payload,
                      };
                      messageContent = getSystemLabel(systemData);
                    }
                  }
                }
              }
            } catch {
              // not JSON -> keep as text
            }
          }

          // Filter out hidden call messages (only one user joined)
          if (messageType === "hidden") {
            return null;
          }

          // Use serverMsgId if available (from send response), otherwise generate local ID
          const messageId =
            serverMsgId ||
            `outgoing-${peerId}-${logHash}-${logIndex}-${uniqueTimestamp}`;

          if (serverMsgId) {
            console.log(
              "✅ [FPChatInterface] Using serverMsgId from send response:",
              serverMsgId
            );
          }

          // Ensure products is always an array when messageType is products
          const finalProducts =
            messageType === "products"
              ? Array.isArray(products)
                ? products
                : []
              : products;

          return {
            id: messageId, // Use serverMsgId if available, otherwise use generated local ID
            sender: "You",
            content: messageContent,
            imageData: imageData ?? undefined,
            imageUrl,
            fileName,
            fileSize: fileSize ?? undefined,
            messageType,
            system: system ? (system as SystemMessageData) : undefined,
            audioUrl,
            audioDurationMs,
            audioTranscription,
            fileUrl,
            fileMime,
            fileSizeBytes,
            products: finalProducts,
            callType,
            callDurationSeconds,
            channel: callChannel,
            createdAt: messageTime,
            timestamp: messageTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isIncoming: false, // Outgoing message - right side
            avatar: coachInfo?.profilePhoto || config.defaults.userAvatar,
            peerId, // Store peerId for conversation tracking
          };
        } else {
          // Parse "senderId: message"
          const parts = log.split(":");
          const sender = parts[0].trim();
          const content = parts.slice(1).join(":").trim();

          // Parse special message formats (IMAGE_DATA, FILE_DATA) or backend JSON payloads
          let messageContent = content;
          let messageType = "text";
          let imageData = null;
          let fileName = null;
          let fileSize = null;
          let imageUrl = null;
          let audioUrl = null;
          let audioDurationMs = null;
          let audioTranscription = null;
          let fileUrl = null;
          let fileMime = null;
          let fileSizeBytes = null;
          let products = null;
          let callType: string | undefined = undefined;
          let callDurationSeconds: number | undefined = undefined;
          let callChannel: string | undefined = undefined;
          let system = null;

          if (content.startsWith("IMAGE_DATA:")) {
            const imageParts = content.split(":");
            if (imageParts.length >= 3) {
              imageData = imageParts[1];
              fileName = imageParts.slice(2).join(":");
              messageType = "image";
              messageContent = fileName;
            }
          } else if (content.startsWith("FILE_DATA:")) {
            const fileParts = content.split(":");
            if (fileParts.length >= 4) {
              imageData = fileParts[1];
              fileName = fileParts[2];
              fileSize = fileParts[3];
              messageType = "file";
              messageContent = `📎 ${fileName} (${fileSize} KB)`;
            }
          } else {
            // Try backend JSON payloads → else system → else text
            try {
              const obj = JSON.parse(content);

              if (
                obj &&
                typeof obj === "object" &&
                (obj.type || obj.messageType)
              ) {
                const t = String(
                  (obj as { type?: string; messageType?: string }).type ||
                    (obj as { type?: string; messageType?: string }).messageType
                ).toLowerCase();
                // skip system messages coming from logs to avoid duplicates
                // ---- IGNORE HEALTH COACH CHANGED MESSAGES ----
                if (t === "mealPlanUpdate" || t === "healthCoachChanged") {
                  return null; // <-- This ensures UI never displays it
                }

                switch (t) {
                  case "text":
                    messageType = "text";
                    messageContent = obj.body ?? "";
                    break;
                  case "image":
                    messageType = "image";
                    imageUrl = obj.url ?? null;
                    messageContent = obj.url ?? "Image";
                    break;
                  case "audio":
                    messageType = "audio";
                    audioUrl = obj.url ?? null;
                    audioDurationMs = obj.duration ?? null;
                    audioTranscription = obj.transcription ?? null;
                    messageContent = "Audio message";
                    break;
                  case "file":
                    messageType = "file";
                    fileUrl = obj.url ?? null;
                    fileMime = obj.mimeType ?? null;
                    fileSizeBytes = obj.size ?? null;
                    try {
                      const urlObj = new URL(obj.url);
                      fileName = decodeURIComponent(
                        urlObj.pathname.split("/").pop() || "file"
                      );
                    } catch {
                      fileName = obj.url ?? "file";
                    }
                    messageContent = `📎 ${fileName}`;
                    break;
                  case "products":
                  case "recommended_products":
                    messageType = "products";
                    // Handle both 'products' and 'product_list' fields
                    if (Array.isArray(obj.products)) {
                      products = obj.products;
                    } else if (Array.isArray(obj.product_list)) {
                      products = obj.product_list;
                    } else {
                      products = [];
                    }
                    messageContent = "Products";
                    break;
                  case "general_notification":
                  case "general-notification":
                    messageType = "general_notification";
                    try {
                      const parsed = JSON.parse(content);
                      if (parsed && typeof parsed === "object") {
                        system = {
                          kind: "general_notification",
                          payload: {
                            action_type: parsed.action_type,
                            title: parsed.title,
                            description: parsed.description,
                            redirection_details: parsed.redirection_details,
                          },
                        };
                        messageContent =
                          parsed.title || parsed.description || "Notification";
                      }
                    } catch {
                      // If parsing fails, try parseSystemPayload
                      const parsed = parseSystemPayload(content);
                      if (parsed && parsed.kind === "general_notification") {
                        system = parsed;
                        messageContent =
                          parsed.payload?.title ||
                          parsed.payload?.description ||
                          "Notification";
                      }
                    }
                    break;
                  case "call":
                    // Convert old "call" format to new format
                    const oldCallType2 = obj.callType as
                      | "video"
                      | "audio"
                      | undefined;
                    messageType =
                      oldCallType2 === "audio" ? "voice_call" : "video_call";
                    const callTitle2 =
                      oldCallType2 === "video" ? "Video call" : "Voice call";
                    let callDescription2: string | undefined;
                    if (obj.duration != null) {
                      const minutes = Math.floor(obj.duration / 60);
                      const seconds = obj.duration % 60;
                      callDescription2 = `${minutes}:${String(seconds).padStart(
                        2,
                        "0"
                      )}`;
                    }
                    system = {
                      kind:
                        oldCallType2 === "audio" ? "voice_call" : "video_call",
                      payload: {
                        title: callTitle2,
                        description: callDescription2,
                        call_details: obj.channel
                          ? { call_url: obj.channel }
                          : undefined,
                      },
                    };
                    messageContent = callDescription2
                      ? `${callTitle2} - ${callDescription2}`
                      : callTitle2;
                    break;
                  case "video_call":
                  case "voice_call":
                    messageType =
                      obj.type === "video_call" ? "video_call" : "voice_call";
                    try {
                      const parsed = JSON.parse(content);
                      if (parsed && typeof parsed === "object") {
                        system = {
                          kind:
                            parsed.type === "video_call"
                              ? "video_call"
                              : "voice_call",
                          payload: {
                            title: parsed.title,
                            description: parsed.description,
                            icons_details: parsed.icons_details,
                            call_details: parsed.call_details,
                            redirection_details: parsed.redirection_details,
                          },
                        };
                        messageContent =
                          parsed.title ||
                          parsed.description ||
                          (parsed.type === "video_call"
                            ? "Video call"
                            : "Voice call");
                      }
                    } catch {
                      // If parsing fails, try parseSystemPayload
                      const parsed = parseSystemPayload(content);
                      if (
                        parsed &&
                        (parsed.kind === "video_call" ||
                          parsed.kind === "voice_call")
                      ) {
                        system = parsed;
                        messageContent =
                          parsed.payload?.title ||
                          parsed.payload?.description ||
                          (parsed.kind === "video_call"
                            ? "Video call"
                            : "Voice call");
                      }
                    }
                    break;
                  case "call_scheduled":
                  case "scheduled_call_canceled": {
                    messageType = t;
                    const timeVal = (obj as { time?: number | string }).time;
                    let scheduledTime: number | undefined;
                    if (timeVal !== undefined) {
                      scheduledTime =
                        typeof timeVal === "number"
                          ? timeVal
                          : parseInt(String(timeVal), 10);
                    }
                    const scheduledDate = scheduledTime
                      ? new Date(scheduledTime * 1000)
                      : null;
                    const formatSchedDate = (d: Date): string => {
                      const day = d.getDate();
                      const monthNames = [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                      ];
                      const month = monthNames[d.getMonth()];
                      let hours = d.getHours();
                      const minutes = d.getMinutes();
                      const ampm = hours >= 12 ? "pm" : "am";
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const minutesStr =
                        minutes < 10 ? `0${minutes}` : `${minutes}`;
                      return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
                    };
                    system = {
                      kind: t as "call_scheduled" | "scheduled_call_canceled",
                      payload: {
                        time: scheduledTime,
                        scheduledDate: scheduledDate?.toISOString(),
                      },
                    } as SystemMessageData;
                    messageContent =
                      t === "scheduled_call_canceled"
                        ? "Scheduled call cancelled"
                        : scheduledDate
                          ? `Schedule, ${formatSchedDate(scheduledDate)}`
                          : "Call scheduled";
                    break;
                  }
                  case "documents":
                    messageType = "documents";
                    try {
                      const parsed = JSON.parse(content);
                      if (parsed && typeof parsed === "object") {
                        system = {
                          kind: "documents",
                          payload: {
                            title: parsed.title,
                            description: parsed.description,
                            icons_details: parsed.icons_details,
                            documents_details: parsed.documents_details,
                            redirection_details: parsed.redirection_details,
                          },
                        };
                        messageContent =
                          parsed.title || parsed.description || "Document";
                        // Also set file properties for compatibility with FPFileMessageView
                        fileUrl =
                          parsed.documents_details?.document_url || null;
                        fileName = parsed.title || null;
                        fileMime =
                          parsed.documents_details?.document_type || null;
                        fileSizeBytes =
                          parsed.documents_details?.document_size || null;
                      }
                    } catch {
                      // If parsing fails, try parseSystemPayload
                      const parsed = parseSystemPayload(content);
                      if (parsed && parsed.kind === "documents") {
                        system = parsed;
                        messageContent =
                          parsed.payload?.title ||
                          parsed.payload?.description ||
                          "Document";
                        const documentsDetails = parsed.payload
                          ?.documents_details as
                          | {
                              document_url?: string;
                              document_size?: number;
                              document_type?: string;
                            }
                          | undefined;
                        fileUrl = documentsDetails?.document_url || null;
                        fileName = parsed.payload?.title || null;
                        fileMime = documentsDetails?.document_type || null;
                        fileSizeBytes = documentsDetails?.document_size || null;
                      }
                    }
                    break;
                  default: {
                    const parsed = parseSystemPayload(content);
                    if (parsed) {
                      if (parsed.kind === "general_notification") {
                        // Handle general_notification as a regular message type
                        messageType = "general_notification";
                        system = parsed;
                        messageContent =
                          parsed.payload?.title ||
                          parsed.payload?.description ||
                          "Notification";
                      } else if (
                        parsed.kind === "video_call" ||
                        parsed.kind === "voice_call"
                      ) {
                        // Handle video_call and voice_call as regular message types
                        messageType = parsed.kind;
                        system = parsed;
                        messageContent =
                          parsed.payload?.title ||
                          parsed.payload?.description ||
                          (parsed.kind === "video_call"
                            ? "Video call"
                            : "Voice call");
                      } else if (
                        parsed.kind === "call_scheduled" ||
                        parsed.kind === "scheduled_call_canceled"
                      ) {
                        messageType = parsed.kind;
                        system = parsed as SystemMessageData;
                        const payload = parsed.payload as { time?: number };
                        const scheduledDate = payload?.time
                          ? new Date(payload.time * 1000)
                          : null;
                        const formatSched = (d: Date): string => {
                          const day = d.getDate();
                          const months = [
                            "Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec",
                          ];
                          let h = d.getHours();
                          const m = d.getMinutes();
                          const ampm = h >= 12 ? "pm" : "am";
                          h = h % 12;
                          h = h ? h : 12;
                          return `${day} ${months[d.getMonth()]} ${h}:${String(m).padStart(2,"0")} ${ampm}`;
                        };
                        messageContent =
                          parsed.kind === "scheduled_call_canceled"
                            ? "Scheduled call cancelled"
                            : scheduledDate
                              ? `Schedule, ${formatSched(scheduledDate)}`
                              : "Call scheduled";
                      } else if (
                        parsed.kind === "new_nutritionist" &&
                        parsed.payload
                      ) {
                        // Extract nutritionist data from payload
                        // Handle both new_nutritionist format and coach_assigned/coach_details format
                        const payload = parsed.payload as {
                          id?: string;
                          name?: string;
                          title?: string;
                          profilePhoto?: string;
                          description?: string;
                          icons_details?: {
                            left_icon?: string;
                            right_icon?: string;
                          };
                          action_type?: string;
                        };
                        const name = payload.name || payload.title || "";
                        const title =
                          payload.title || payload.description || "";
                        const profilePhoto =
                          payload.profilePhoto ||
                          payload.icons_details?.left_icon ||
                          "";
                        system = {
                          kind: "new_nutritionist",
                          id: payload.id || "",
                          name: name,
                          title: title,
                          profilePhoto: profilePhoto,
                          payload: {
                            action_type: payload.action_type,
                            icons_details: payload.icons_details,
                          },
                        };
                        messageType = "system";
                        const systemData: SystemMessageData = {
                          kind: parsed.kind,
                          ...parsed.payload,
                        };
                        messageContent =
                          name || title || getSystemLabel(systemData);
                      } else {
                        system = parsed;
                        messageType = "system";
                        const systemData: SystemMessageData = {
                          kind: parsed.kind,
                          ...parsed.payload,
                        };
                        messageContent = getSystemLabel(systemData);
                      }
                    }
                  }
                }
              }
            } catch {
              // not JSON -> keep as text
            }
          }

          // Filter out hidden call messages (only one user joined)
          if (messageType === "hidden") {
            return null;
          }

          const generatedId = `incoming-${peerId}-${logHash}-${logIndex}-${uniqueTimestamp}`;
          const messageId = serverMsgId || generatedId; // Use server ID when available for dedup with fetch

          // Ensure products is always an array when messageType is products
          const finalProducts =
            messageType === "products"
              ? Array.isArray(products)
                ? products
                : []
              : products;

          return {
            id: messageId,
            sender,
            content: messageContent,
            imageData: imageData ?? undefined,
            imageUrl,
            fileName,
            fileSize: fileSize ?? undefined,
            messageType,
            system: system ? (system as SystemMessageData) : undefined,
            audioUrl,
            audioDurationMs,
            audioTranscription,
            fileUrl,
            fileMime,
            fileSizeBytes,
            products: finalProducts,
            callType,
            callDurationSeconds,
            channel: callChannel,
            createdAt: messageTime,
            timestamp: messageTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isIncoming: true, // Incoming message - left side
            avatar: selectedContact?.avatar || config.defaults.avatar,
            peerId, // Store peerId for conversation tracking
          };
        }
      })
      .filter((msg) => msg !== null); // Filter out null messages (hidden call messages)

    // Merge logs-derived messages with existing (from fetch) using centralized logic
    const logMessages = newMessages as Message[];
    setMessages((prev) => {
      const currentPeerMessages = prev.filter((msg) => msg.peerId === peerId);
      const otherPeerMessages = prev.filter((msg) => msg.peerId !== peerId);
      const merged = mergeAndSortMessages(
        currentPeerMessages,
        logMessages,
        peerId
      );
      return [...otherPeerMessages, ...merged];
    });
  }, [logs, peerId, selectedContact, userId]);

  // Sync chatClient prop to ref
  useEffect(() => {
    chatClientRef.current = chatClient;
  }, [chatClient]);

  // Fetch last 20 messages whenever peer changes (only once per peer)
  useEffect(() => {
    if (!peerId) {
      return;
    }

    if (!chatClient) {
      return;
    }

    // Get the current peer from the ref to detect changes
    const currentFetchedPeer = fetchedPeersRef.current.currentPeer;

    // If peerId changed, reset the fetched set for the new peer (even before login)
    if (currentFetchedPeer !== peerId) {
      fetchedPeersRef.current.fetchedPeers = new Set();
      fetchedPeersRef.current.currentPeer = peerId;
      // Reset cursor and hasMore when peer changes
      setCursor(null);
      setHasMore(true);
      // Reset history strategy when peer changes
      agoraHistoryExhaustedRef.current = false;
      oldestAgoraTimestampMsRef.current = null;
    }

    if (!historyFetchEnabled) {
      return;
    }

    // Check if we've already fetched history for this peer
    if (fetchedPeersRef.current.fetchedPeers.has(peerId)) {
      return;
    }

    // Fetch messages from API
    const checkAndFetch = async () => {
      try {
        await fetchInitialMessages();
        // Mark this peer as fetched
        fetchedPeersRef.current.fetchedPeers.add(peerId);
      } catch (err) {
        console.error("[FPChatInterface] Error while fetching:", err);
      }
    };

    checkAndFetch();
  }, [peerId, chatClient, historyFetchEnabled]);

  // Filter messages to only show current conversation when displaying
  const currentConversationMessages = messages.filter(
    (msg) => msg.peerId === peerId
  );

  // Debug logging for message filtering
  useEffect(() => {
    if (peerId) {
      console.log("[FPChatInterface] Message filtering debug:", {
        peerId,
        totalMessages: messages.length,
        filteredMessages: currentConversationMessages.length,
        allMessagePeerIds: messages.map((m) => m.peerId),
        currentPeerMessages: currentConversationMessages.map((m) => ({
          id: m.id,
          sender: m.sender,
          content: m.content?.substring(0, 50),
        })),
      });
    }
  }, [peerId, messages.length, currentConversationMessages.length]);

  // Auto-scroll when messages change
  useEffect(() => {
    // 🧠 Prevent auto-scroll during history loading or when on Description/Info tab
    if (
      isLoadingHistoryRef.current ||
      skipAutoScrollRef.current ||
      activeTab !== "Chat"
    )
      return;

    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    // Only scroll if the user is near the bottom
    const isNearBottom =
      chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;

    if (isNearBottom) {
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [currentConversationMessages, activeTab]);

  // Reset input key when peer changes to ensure clean state
  useEffect(() => {
    setInputResetKey(0);
  }, [peerId]);

  // Set up non-passive touch event listener for audio button
  useEffect(() => {
    const audioBtn = audioBtnRef.current;
    if (!audioBtn) return;

    const handleTouchStart = (e: TouchEvent): void => {
      if (!isRecording && selectedContact) {
        e.preventDefault();
        startAudioRecording();
      }
    };

    // Add event listener with { passive: false } to allow preventDefault
    audioBtn.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    return () => {
      audioBtn.removeEventListener("touchstart", handleTouchStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, selectedContact]); // startAudioRecording is stable, no need to include

  // Watch for message clearing after send to reset input
  useEffect(() => {
    // Detect when message transitions from non-empty to empty (after sending)
    // This ensures the input remounts AFTER the message is cleared
    const prevMessage = prevMessageRef.current;
    const currentMessage = message || "";

    // If message was non-empty and is now empty, and we have a peer, reset input
    const prevIsEmpty =
      typeof prevMessage === "string" ? prevMessage.trim() : prevMessage;
    const currentIsEmpty =
      typeof currentMessage === "string"
        ? currentMessage.trim()
        : currentMessage;
    if (prevIsEmpty && !currentIsEmpty && peerId) {
      // Message was cleared after send, increment key to remount input
      setInputResetKey((prev) => prev + 1);
    }

    // Update ref for next comparison
    prevMessageRef.current = currentMessage;
  }, [message, peerId]);

  // Restore focus to input after it remounts (when reset key changes)
  useEffect(() => {
    if (inputRef.current && selectedContact) {
      // Small delay to ensure input is fully mounted
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [inputResetKey, selectedContact]);

  const isSendingRef = useRef(false);

  // Handle edit message
  const handleEditMessage = (messageId: string, content: string): void => {
    // Find the message to check if it's within the 10-minute edit window
    const messageToEdit = messages.find((msg) => msg.id === messageId);

    if (!messageToEdit) {
      console.warn("Message not found for editing");
      return;
    }

    // Check if message is within 10-minute edit window
    if (messageToEdit.createdAt) {
      const messageTime =
        messageToEdit.createdAt instanceof Date
          ? messageToEdit.createdAt.getTime()
          : new Date(messageToEdit.createdAt).getTime();
      const currentTime = Date.now();
      const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (currentTime - messageTime > tenMinutesInMs) {
        alert("This message can only be edited within 10 minutes of sending.");
        return;
      }
    }

    setEditingMessageId(messageId);
    setMessage(content);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }
    }, 100);
  };

  const handleSendMessage = (): void => {
    // Prevent multiple simultaneous sends
    if (isSendingRef.current) {
      return;
    }

    // Capture the exact message value to send BEFORE any state changes
    const currentMessage = draftAttachment ? getDraftCaption() : message;
    const hasMessage =
      typeof currentMessage === "string"
        ? currentMessage.trim()
        : currentMessage;

    if (!hasMessage && !draftAttachment) {
      return;
    }

    // Check if we're editing a message
    if (editingMessageId) {
      const newTextContent =
        typeof currentMessage === "string"
          ? currentMessage.trim()
          : String(currentMessage).trim();

      if (!newTextContent) {
        // If empty, just cancel editing
        setEditingMessageId(null);
        setMessage("");
        return;
      }

      // Edit the message using Agora Chat SDK
      if (
        chatClient &&
        typeof chatClient === "object" &&
        "modifyMessage" in chatClient
      ) {
        // Mark as sending to prevent multiple edits
        isSendingRef.current = true;

        const messageToEdit = messages.find(
          (msg) => msg.id === editingMessageId
        );
        console.log("📝 [FPChatInterface] Attempting to edit message:", {
          editingMessageId,
          newTextContent,
          peerId,
          messageToEdit: messageToEdit,
          messageIdType: typeof editingMessageId,
          isServerMsgId:
            editingMessageId &&
            !editingMessageId.startsWith("outgoing-") &&
            !editingMessageId.startsWith("incoming-"),
        });

        // If we have a local ID (outgoing- or incoming-), try to find the server message ID
        let serverMessageId = editingMessageId;
        if (
          editingMessageId &&
          (editingMessageId.startsWith("outgoing-") ||
            editingMessageId.startsWith("incoming-"))
        ) {

          if (!messageToEdit) {
            console.error(
              "❌ [FPChatInterface] Message not found for editing:",
              editingMessageId
            );
            alert("Message not found. Please try again.");
            setEditingMessageId(null);
            setMessage("");
            isSendingRef.current = false; // Reset flag on error
            return;
          }

          // Try to find a server message with matching content and sender
          // This happens when the message has been synced with the server

          const matchingServerMessage = messages.find((msg) => {
            // Skip local messages
            if (
              msg.id.startsWith("outgoing-") ||
              msg.id.startsWith("incoming-")
            ) {
              return false;
            }

            // Normalize content for comparison (trim whitespace)
            const normalizeContent = (
              content: string | null | undefined
            ): string => {
              if (!content) return "";
              return String(content).trim();
            };

            const msgContent = normalizeContent(msg.content);
            const editContent = normalizeContent(messageToEdit.content);

            // Match by content and sender (for text messages)
            // Use flexible matching: content should match (after normalization) and same sender/peerId
            const contentMatch = msgContent === editContent;
            const senderMatch = msg.sender === messageToEdit.sender;
            const peerIdMatch = msg.peerId === messageToEdit.peerId;
            const isTextMessage =
              msg.messageType === "text" || !msg.messageType;

            if (contentMatch && senderMatch && peerIdMatch && isTextMessage) {
              // Check if timestamps are close (within 2 minutes for more flexibility)
              if (msg.createdAt && messageToEdit.createdAt) {
                const msgTime =
                  msg.createdAt instanceof Date
                    ? msg.createdAt.getTime()
                    : new Date(msg.createdAt).getTime();
                const editTime =
                  messageToEdit.createdAt instanceof Date
                    ? messageToEdit.createdAt.getTime()
                    : new Date(messageToEdit.createdAt).getTime();
                const timeDiff = Math.abs(msgTime - editTime);
                // Increased tolerance to 2 minutes to handle sync delays
                const matches = timeDiff < 120000; // 2 minutes tolerance
                if (matches) {
                  // Found timestamp match
                }
                return matches;
              }
              // If timestamps are missing, still match by content and sender
              return true;
            }
            return false;
          });

          // If no exact match found, try a more flexible search by content only (for recently sent messages)
          let flexibleMatch = null;
          if (!matchingServerMessage && messageToEdit.content) {
            const normalizeContent = (
              content: string | null | undefined
            ): string => {
              if (!content) return "";
              return String(content).trim();
            };
            const editContent = normalizeContent(messageToEdit.content);


            // Find any server message with matching content, same sender, and recent timestamp
            flexibleMatch = messages.find((msg) => {
              if (
                msg.id.startsWith("outgoing-") ||
                msg.id.startsWith("incoming-")
              ) {
                return false;
              }

              const msgContent = normalizeContent(msg.content);
              const contentMatch = msgContent === editContent;
              const senderMatch = msg.sender === messageToEdit.sender;
              const peerIdMatch = msg.peerId === messageToEdit.peerId;

              if (contentMatch && senderMatch && peerIdMatch) {
                // Check if message is recent (within last 10 minutes for more flexibility)
                if (msg.createdAt) {
                  const msgTime =
                    msg.createdAt instanceof Date
                      ? msg.createdAt.getTime()
                      : new Date(msg.createdAt).getTime();
                  const now = Date.now();
                  const timeDiff = now - msgTime;
                  const isRecent = timeDiff < 600000; // 10 minutes
                  if (isRecent) {
                    // Found flexible match
                  }
                  return isRecent;
                }
                // If no timestamp, still match if content and sender match
                return true;
              }
              return false;
            });

          }

          // Use exact match or flexible match
          const finalMatch = matchingServerMessage || flexibleMatch;

          if (finalMatch) {
            // Use the message ID (which should be the mid if available)
            serverMessageId = finalMatch.id;
          } else {
            // No server message match found
            console.error(
              "❌ [FPChatInterface] Could not find server message ID for local message:",
              editingMessageId,
              ". Message may not be synced yet."
            );
            alert(
              "Cannot edit this message yet. Please wait a moment for it to sync with the server, then try again."
            );
            setEditingMessageId(null);
            setMessage("");
            isSendingRef.current = false; // Reset flag on error
            return;
          }
        }

        // Verify we have a valid server message ID
        if (
          !serverMessageId ||
          serverMessageId.startsWith("outgoing-") ||
          serverMessageId.startsWith("incoming-")
        ) {
          console.error(
            "❌ [FPChatInterface] Invalid message ID for editing - must be serverMsgId, not local ID:",
            serverMessageId
          );
          alert(
            "Cannot edit this message. Please try again after the message is synced with the server."
          );
          setEditingMessageId(null);
          setMessage("");
          isSendingRef.current = false; // Reset flag on error
          return;
        }

        editMessage({
          chatClient: chatClient as unknown as Connection,
          messageId: serverMessageId, // Use the server message ID
          newText: newTextContent,
          ext: {
            senderName: coachInfo.coachName || userId,
            senderProfile: coachInfo.profilePhoto || config.defaults.avatar,
            isFromUser: false,
          },
          peerId: peerId || undefined,
        })
          .then((response) => {
            console.log("✅ [FPChatInterface] Message edited successfully:", {
              originalMessageId: editingMessageId,
              serverMessageId: serverMessageId,
              newContent: newTextContent,
              response: response,
              responseMessage: response.message,
            });

            // Update the message in the messages array - update both local and server message IDs
            let updatedMessage: Message | null = null;
            setMessages((prevMessages) => {
              const updated = prevMessages.map((msg) => {
                // Update the message with the server ID
                if (msg.id === serverMessageId) {
                  const updatedMsg = {
                    ...msg,
                    content: newTextContent,
                    isEdited: true,
                  };
                  updatedMessage = updatedMsg;
                  return updatedMsg;
                }
                // Also update the local message ID if it exists (for immediate UI update)
                if (msg.id === editingMessageId) {
                  const updatedMsg = {
                    ...msg,
                    content: newTextContent,
                    isEdited: true,
                  };
                  // Only set updatedMessage if we haven't found the server message yet
                  if (!updatedMessage) {
                    updatedMessage = updatedMsg;
                  }
                  return updatedMsg;
                }
                return msg;
              });
              return updated;
            });

            // Update conversation preview if this message exists and is for the current peer
            // The updateLastMessageFromHistory function will only update if this is the most recent message
            if (updatedMessage && peerId && onUpdateLastMessageFromHistory) {
              const msgForLog: Message = updatedMessage;
              console.log(
                "🔄 [FPChatInterface] Updating conversation preview with edited message:",
                {
                  peerId,
                  messageId: msgForLog.id,
                  content: msgForLog.content,
                  sender: msgForLog.sender,
                  createdAt: msgForLog.createdAt,
                  isEdited: msgForLog.isEdited,
                }
              );
              onUpdateLastMessageFromHistory(peerId, updatedMessage);
            } else {
              const hasUpdatedMessage = !!updatedMessage;
              const hasOnUpdateLastMessageFromHistory =
                !!onUpdateLastMessageFromHistory;
              console.warn(
                "⚠️ [FPChatInterface] Cannot update conversation preview:",
                {
                  hasUpdatedMessage,
                  peerId,
                  hasOnUpdateLastMessageFromHistory,
                }
              );
            }

            // Clear edit mode
            setEditingMessageId(null);
            setMessage("");

            // Show success message
            console.log("✅ Edit completed and UI updated");
          })
          .catch((error) => {
            console.error("❌ [FPChatInterface] Error editing message:", {
              messageId: editingMessageId,
              error: error,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });
            // Optionally show an error message to the user
            alert(
              `Failed to edit message: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            // Reset edit mode and flag on error
            setEditingMessageId(null);
            setMessage("");
            isSendingRef.current = false; // Reset flag immediately on error
          })
          .finally(() => {
            // Reset the flag after edit completes (as backup, but should already be reset)
            isSendingRef.current = false;
          });
      } else {
        // Fallback: just update local state if chatClient is not available
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === editingMessageId
              ? {
                  ...msg,
                  content: newTextContent,
                  isEdited: true,
                }
              : msg
          )
        );
        setEditingMessageId(null);
        setMessage("");
      }

      return;
    }

    // For draft attachments, we need to send the full JSON payload, not just the caption
    const messageToSend = draftAttachment ? message : currentMessage;

    // Mark as sending immediately to prevent any other sends
    isSendingRef.current = true;

    // Clear the message state immediately to prevent it from being read again
    if (draftAttachment) {
      clearDraftAttachment();
    } else {
      setMessage("");
    }

    // Call onSend with the message value directly to avoid race conditions
    // The parent will use this value instead of reading from the message prop
    onSend(messageToSend);

    // Reset the flag after a delay to allow the send to complete
    setTimeout(() => {
      isSendingRef.current = false;
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Demo message samples for testing
  // @ts-expect-error - Demo function for testing, may be used in future
  const _sendDemoMessage = (type: string): void => {
    if (!peerId) return;

    let demoPayload = {};

    switch (type) {
      case "image":
        demoPayload = {
          type: "image",
          url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop",
          fileName: "demo-image.jpg",
          width: 800,
          height: 600,
        };
        break;

      case "audio":
        demoPayload = {
          type: "audio",
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          duration: 30, // seconds
          transcription: "This is a demo audio transcription",
        };
        break;

      case "file":
        demoPayload = {
          type: "file",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileName: "demo-document.pdf",
          mimeType: "application/pdf",
          size: 102400, // bytes
        };
        break;

      case "call":
        // Convert old "call" demo to new format
        demoPayload = {
          type: "video_call",
          title: "Video call",
          description: "",
          call_details: {
            call_url: `demo-call-${Date.now()}`,
          },
        };
        break;

      case "meal_plan_updated":
        demoPayload = {
          type: "meal_plan_updated",
        };
        break;

      case "new_nutritionist":
        demoPayload = {
          type: "new_nutritionist",
          id: "NUT001",
          name: "Dr. Jane Smith",
          title: "Senior Nutritionist",
          profilePhoto:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
        };
        break;

      case "products":
        demoPayload = {
          type: "products",
          products: [
            {
              id: "PROD001",
              name: "Hello Healthy Coffee (South Indian)",
              price: 579,
              originalPrice: 999,
              image:
                "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop",
            },
          ],
        };
        break;

      default:
        return;
    }

    setShowDemoMenu(false);
    setMessage(JSON.stringify(demoPayload));
    // Auto-send after a small delay
    setTimeout(() => {
      onSend(JSON.stringify(demoPayload));
    }, 100);
  };

  // Close media popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        mediaPopupRef.current &&
        !mediaPopupRef.current.contains(target) &&
        !(target as Element).closest(".icon-btn")
      ) {
        setShowMediaPopup(false);
      }
      if (
        demoMenuRef.current &&
        !demoMenuRef.current.contains(target) &&
        !(target as Element).closest(".demo-btn")
      ) {
        setShowDemoMenu(false);
      }
    };

    if (showMediaPopup || showDemoMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMediaPopup, showDemoMenu]);

  // 👉 Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("click", handleClickOutside, true);
    return () =>
      document.removeEventListener("click", handleClickOutside, true);
  }, []);

  // Handle emoji selection and make navigation bar scrollable
  useEffect(() => {
    if (!showEmojiPicker) return;

    let pickerElement: Element | null = null;

    const setupEmojiPicker = () => {
      // emojiPickerRef points to the container, so we need to find the emoji-picker element
      pickerElement =
        emojiPickerRef.current?.querySelector("emoji-picker") ||
        document.querySelector("emoji-picker.emoji-picker-element");
      if (!pickerElement) return;

      // Emoji selection handled only in FPMessageInput to avoid double insert

      // Try to access shadow DOM for navigation styling
      const shadowRoot = pickerElement.shadowRoot;
      if (shadowRoot) {
        // Common selectors for navigation in emoji-picker-element
        const navSelectors = [
          "nav",
          ".nav",
          '[part="nav"]',
          ".category-nav",
          ".epr-category-nav",
          ".category-buttons",
          'div[role="tablist"]',
          ".tabs",
        ];

        for (const selector of navSelectors) {
          const navElement = shadowRoot.querySelector(selector);
          if (navElement && navElement instanceof HTMLElement) {
            navElement.style.overflowX = "auto";
            navElement.style.overflowY = "hidden";
            navElement.style.whiteSpace = "nowrap";
            navElement.style.display = "flex";
            navElement.style.scrollbarWidth = "thin";
            (
              navElement.style as unknown as {
                webkitOverflowScrolling?: string;
              }
            ).webkitOverflowScrolling = "touch";
            break; // Found and styled, exit
          }
        }

        // Also try to find any horizontal scrollable container
        const allDivs = shadowRoot.querySelectorAll("div");
        allDivs.forEach((div) => {
          const computedStyle = window.getComputedStyle(div);
          if (
            computedStyle.display === "flex" &&
            computedStyle.flexDirection === "row" &&
            div.children.length > 5 // Likely the nav bar with multiple category buttons
          ) {
            div.style.overflowX = "auto";
            div.style.overflowY = "hidden";
            div.style.whiteSpace = "nowrap";
          }
        });
      }
    };

    // Wait for the component to render
    const timeoutId = setTimeout(setupEmojiPicker, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showEmojiPicker]);

  // Handle Escape key to close image viewer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && imageViewerUrl) {
        closeImageViewer();
      }
      // Also cancel recording on Escape
      if (e.key === "Escape" && isRecording) {
        cancelAudioRecording();
      }
    };

    if (imageViewerUrl || isRecording) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [imageViewerUrl, isRecording]);

  // Cleanup effect for recording
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isRecording) {
        shouldSendRecordingRef.current = false;
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      }
    };
  }, [isRecording]);

  const handleMediaSelect = (type: "photos" | "camera" | "file"): void => {
    setShowMediaPopup(false);

    if (type === "photos") {
      // Open photo gallery picker (without capture attribute)
      photoInputRef.current?.click();
    } else if (type === "file") {
      // Open file picker
      fileInputRef.current?.click();
    } else if (type === "camera") {
      // Try in-app camera capture (works on desktop + mobile)
      setShowCameraCapture(true);
      startCamera();
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
      // You can preview the file here or send it directly
      handleSendMedia(file);
    }
    // Reset input to allow selecting the same file again
    event.target.value = "";
  };

  const handlePhotoSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedMedia(file);
      handleSendMedia(file);
    }
    event.target.value = "";
  };

  const handleSendMedia = async (file: File): Promise<void> => {
    if (!peerId || !file) return;

    try {
      setUploadProgress(0);

      // 🧹 Clean filename
      const safeFileName = file.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "_");
      const objectKey = `uploads/${
        peerId || "user"
      }/${Date.now()}-${safeFileName}`;

      // 1️⃣ Request pre-signed URL
      const { data } = await axios.post(config.api.generatePresignUrl, {
        objectKey,
        expiresInMinutes: config.upload.expiresInMinutes,
      });

      const { url: uploadUrl, fileUrl } = data;

      // 2️⃣ Upload to S3
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (event) => {
          const percent = event.total
            ? Math.round((event.loaded * 100) / event.total)
            : 0;
          setUploadProgress(percent);
        },
      });

      const getImageDimensions = (
        url: string
      ): Promise<{ width: number; height: number }> => {
        return new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = () => resolve({ width: 1280, height: 720 });
          img.src = url;
        });
      };

      // 3️⃣ Build chat message
      let payload;

      if (file.type.startsWith("image/")) {
        const dims = await getImageDimensions(fileUrl);

        payload = {
          type: "image",
          url: fileUrl,
          fileName: safeFileName,
          mimeType: file.type,
          size: file.size,
          width: dims.width,
          height: dims.height,
        };
      } else {
        payload = {
          type: "file",
          url: fileUrl,
          fileName: safeFileName,
          mimeType: file.type,
          size: file.size,
        };
      }

      setMessage(JSON.stringify(payload));

      // 4️⃣ Send
      setTimeout(() => handleSendMessage(), 100);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert("Error uploading file. Please try again.");
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // Camera: start/stop and capture
  const startCamera = async (): Promise<void> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        // Fallback to native file input capture if getUserMedia unavailable
        cameraInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("Camera error:", e);
      // Fallback to file input if permission denied or not available
      cameraInputRef.current?.click();
      setShowCameraCapture(false);
    }
  };

  const stopCamera = (): void => {
    try {
      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    } catch {}
  };

  const closeCamera = (): void => {
    stopCamera();
    setShowCameraCapture(false);
  };

  const capturePhoto = async (): Promise<void> => {
    try {
      const video = videoRef.current;
      if (!video) return;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const file = new File([blob], "camera-photo.jpg", {
            type: blob.type || "image/jpeg",
          });
          await handleSendMedia(file);
          closeCamera();
        },
        "image/jpeg",
        0.92
      );
    } catch (e) {
      console.error("Capture error:", e);
    }
  };

  // Helper function to convert audio blob to WAV format
  const convertToWAV = async (audioBlob: Blob): Promise<Blob> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const sampleRate = audioBuffer.sampleRate;
      const numChannels = audioBuffer.numberOfChannels;
      const samples = audioBuffer.getChannelData(0); // Get first channel

      // Create WAV file buffer
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string): void => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + samples.length * 2, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // audio format (1 = PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
      view.setUint16(32, numChannels * 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      writeString(36, "data");
      view.setUint32(40, samples.length * 2, true);

      // Convert float samples to 16-bit PCM
      let offset = 44;
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }

      audioContext.close();
      return new Blob([buffer], { type: "audio/wav" });
    } catch (error) {
      console.error("Error converting to WAV:", error);
      // Fallback: return original blob if conversion fails
      return audioBlob;
    }
  };

  // Audio recording functions
  const startAudioRecording = async (): Promise<void> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Audio recording is not supported in your browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "audio/mp4",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks first
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        // Calculate actual duration from start time (more accurate than state)
        const actualDuration = recordingStartTimeRef.current
          ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
          : recordingDurationRef.current || recordingDuration;

        // Only send if shouldSendRecordingRef is true (not cancelled)
        if (
          shouldSendRecordingRef.current &&
          audioChunksRef.current.length > 0
        ) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });
          // Convert to WAV format
          const wavBlob = await convertToWAV(audioBlob);
          await handleSendAudio(wavBlob, actualDuration);
        }

        // Clear recording state
        setIsRecording(false);
        setRecordingDuration(0);
        recordingStartTimeRef.current = null;
        recordingDurationRef.current = 0;
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        // Reset flag for next recording
        shouldSendRecordingRef.current = true;
      };

      shouldSendRecordingRef.current = true;

      // Clear any existing timer before starting a new one
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now(); // Record start time
      recordingDurationRef.current = 0; // Reset ref

      // Start timer - calculate duration from start time to avoid double increments
      recordingTimerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor(
            (Date.now() - recordingStartTimeRef.current) / 1000
          );
          recordingDurationRef.current = elapsed;
          setRecordingDuration(elapsed);
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      alert(
        "Failed to start audio recording. Please check microphone permissions."
      );
      setIsRecording(false);
    }
  };

  const stopAudioRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelAudioRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      // Set flag to prevent sending
      shouldSendRecordingRef.current = false;
      // Clear chunks without sending
      audioChunksRef.current = [];
      // Stop the recorder (this will trigger onstop but won't send due to flag)
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleSendAudio = async (
    audioBlob: Blob,
    durationOverride: number | null = null
  ): Promise<void> => {
    if (!peerId || !audioBlob) return;

    // Use provided duration or fall back to state
    const durationToUse =
      durationOverride !== null ? durationOverride : recordingDuration;

    try {
      setUploadProgress(0);

      // Determine file extension based on MIME type (WAV format)
      const extension = "wav";

      // Create a File object from the blob for consistent handling
      const fileName = `audio-recording-${Date.now()}.${extension}`;
      const audioFile = new File([audioBlob], fileName, {
        type: audioBlob.type,
      });

      // Clean filename for S3
      const safeFileName = fileName
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "_");
      const objectKey = `uploads/${
        peerId || "user"
      }/${Date.now()}-${safeFileName}`;

      // 1️⃣ Request pre-signed URL
      const { data } = await axios.post(config.api.generatePresignUrl, {
        objectKey,
        expiresInMinutes: config.upload.expiresInMinutes,
      });

      const { url: uploadUrl, fileUrl } = data;

      // 2️⃣ Upload to S3
      await axios.put(uploadUrl, audioFile, {
        headers: { "Content-Type": audioBlob.type },
        onUploadProgress: (event) => {
          const percent = event.total
            ? Math.round((event.loaded * 100) / event.total)
            : 0;
          setUploadProgress(percent);
        },
      });

      // 3️⃣ Build chat message with S3 URL
      const payload = {
        type: "audio",
        url: fileUrl, // Use S3 URL instead of blob URL
        fileName: safeFileName,
        mimeType: audioBlob.type,
        size: audioBlob.size,
        duration: durationToUse, // Duration in seconds (will be converted to ms in App.jsx)
      };

      // Set message and send
      setMessage(JSON.stringify(payload));

      // Send after a brief delay to ensure state is set
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    } catch (error) {
      console.error("Error uploading audio:", error);
      alert("Error uploading audio. Please try again.");
      setMessage(""); // Clear on error
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // Image viewer helpers
  const openImageViewer = (url: string, alt?: string): void => {
    if (!url) return;
    setImageViewerUrl(url);
    setImageViewerAlt(alt || "Image");
    // Optional: lock background scroll if desired
    document.body.style.overflow = "hidden";
  };

  const closeImageViewer = (): void => {
    setImageViewerUrl("");
    setImageViewerAlt("");
    document.body.style.overflow = "";
  };

  // Video/Audio player helpers
  const openVideoPlayer = (
    videoUrl: string,
    callType?: "video_call" | "voice_call"
  ): void => {
    if (!videoUrl) return;

    // Open recording in a new tab using URL parameters
    const type = callType || "video_call";
    const playerUrl = `${window.location.origin}${
      window.location.pathname
    }?url=${encodeURIComponent(videoUrl)}&type=${type}`;
    window.open(playerUrl, "_blank");
  };

  const closeVideoPlayer = (): void => {
    setVideoPlayerUrl("");
    document.body.style.overflow = "";
  };

  const closeAudioPlayer = (): void => {
    setAudioPlayerUrl("");
    document.body.style.overflow = "";
  };

  // extractCustomMessageData, formatMessage, and convertApiMessageToFormat are now imported from utils
  // Removed duplicate function definitions - using imported versions instead

  // 🔹 Fetch latest 20 messages from Agora Chat
  const fetchInitialMessages = async (): Promise<void> => {
    if (!peerId || !chatClient) {
      console.warn("[fetchInitialMessages] peerId or chatClient missing, skipping fetch", {
        hasPeerId: !!peerId,
        hasChatClient: !!chatClient,
        peerId,
      });
      return;
    }

    console.log("[fetchInitialMessages] Starting fetch", {
      peerId,
      hasChatClient: !!chatClient,
    });

    try {
      // Group id from list (conversationId) or token API (group_id) — numeric string, no user_ prefix
      const agoraGroupId = String(
        selectedContact?.groupId ??
          selectedContact?.conversationId ??
          peerId ??
          ""
      ).trim();

      // Cast chatClient to Connection type to access getHistoryMessages
      const client = chatClient as Connection & {
        getHistoryMessages?: (options: {
          targetId: string;
          chatType: string;
          pageSize: number;
          searchDirection: string;
        }) => Promise<{
          messages?: unknown[];
          cursor?: string;
        }>;
      };

      // 1) Fetch from Agora (group chat only): targetId = group id, chatType = groupChat
      const agoraRes = await (client.getHistoryMessages
        ? client.getHistoryMessages({
            targetId: agoraGroupId,
            chatType: "groupChat",
            pageSize: config.chat.pageSize || 20,
            searchDirection: "up",
          })
        : Promise.resolve({ messages: [], cursor: undefined }));

      const agoraMessages = (agoraRes?.messages || []) as AgoraMessage[];
      const agoraCursor = agoraRes?.cursor;

      // Track the oldest Agora timestamp we have seen (used when we switch to DB)
      for (const m of agoraMessages) {
        const t = (m as { time?: unknown }).time;
        const ms = typeof t === "number" ? t : Number(t);
        if (!Number.isNaN(ms) && ms > 0) {
          oldestAgoraTimestampMsRef.current =
            oldestAgoraTimestampMsRef.current === null
              ? ms
              : Math.min(oldestAgoraTimestampMsRef.current, ms);
        }
      }

      // If Agora returns no messages, it means its history is exhausted for this peer.
      // At that point we fetch older messages from DB using `from=<oldestAgoraTimestampMs>`.
      let oldMessages: AgoraMessage[] = [...agoraMessages];
      if (agoraMessages.length === 0) {
        agoraHistoryExhaustedRef.current = true;

        const fromMs =
          oldestAgoraTimestampMsRef.current ??
          (typeof agoraCursor === "string" || typeof agoraCursor === "number"
            ? Number(agoraCursor)
            : null);

        if (fromMs && !Number.isNaN(fromMs)) {
          const apiUrl = new URL(config.api.fetchMessages);
          apiUrl.searchParams.append("conversationId", agoraGroupId);
          apiUrl.searchParams.append(
            "limit",
            String(config.chat.pageSize || 20)
          );
          apiUrl.searchParams.append("from", String(fromMs));

          const apiRes = await fetch(apiUrl.toString()).then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            return response.json();
          });

          const apiMessages: ApiMessage[] = apiRes?.messages || [];
          const convertedApiMessages = apiMessages
            .map((msg: unknown) => convertApiMessageToFormat(msg as ApiMessage))
            .filter(
              (msg: AgoraMessage | null): msg is AgoraMessage => msg !== null
            );

          oldMessages = [...oldMessages, ...convertedApiMessages];

          // When we switch to DB, we paginate using the API's cursor (if provided).
          if (apiRes?.nextCursor) {
            setCursor(apiRes.nextCursor);
            setHasMore(true);
          } else {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      } else {
        // While still fetching from Agora, paginate using Agora cursor.
        if (agoraCursor) {
          setCursor(agoraCursor);
          setHasMore(true);
        } else {
          // Cursor absent usually indicates no more pages from Agora
          setHasMore(false);
        }
      }

      // 🔍 Detailed console log of all received messages
      console.log(
        "📨 [fetchInitialMessages] All messages received from Agora:",
        {
          totalMessages: oldMessages.length,
          messages: oldMessages.map((msg: AgoraMessage, index: number) => {
            return {
              index: index + 1,
              id: msg.id,
              mid: msg.mid, // Message ID from delivery receipt (used for editing)
              type: msg.type,
              from: msg.from,
              to: msg.to,
              time: msg.time,
              createdAt: msg.time ? new Date(msg.time).toISOString() : null,
              msg: msg.msg,
              msgContent: msg.msgContent,
              body: msg.body,
              data: msg.data,
              ext: msg.ext,
              customExts: msg.customExts,
              "v2:customExts": msg["v2:customExts"],
              fullMessage: msg, // Full message object for complete inspection
            };
          }),
        }
      );

      // Filter out null messages (healthCoachChanged, mealPlanUpdate, etc.)
      const convertedMessages = oldMessages.filter(
        (msg: AgoraMessage | null): msg is AgoraMessage => msg !== null
      );


      const formatted = convertedMessages
        .map((msg: AgoraMessage) =>
          formatMessage(msg, userId, peerId || "", selectedContact, coachInfo)
        )
        .filter((msg: Message | null): msg is Message => msg !== null);

      const deduplicatedFormatted = deduplicateAndSort(
        formatted.map((m) => ({ ...m, peerId: peerId || m.peerId }))
      );

      // Find the most recent message from history to update last message
      if (deduplicatedFormatted.length > 0 && onUpdateLastMessageFromHistory) {
        // Sort by timestamp descending to get the most recent
        const sortedFormatted = [...deduplicatedFormatted].sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        const mostRecentMessage = sortedFormatted[0];
        if (mostRecentMessage) {
          // Update the conversation's last message
          onUpdateLastMessageFromHistory(peerId, mostRecentMessage);
        }
      }

      // Merge fetched messages with existing (e.g. from logs) using centralized logic
      setMessages((prev) => {
        const currentPeerMessages = prev.filter((msg) => msg.peerId === peerId);
        const otherPeerMessages = prev.filter((msg) => msg.peerId !== peerId);
        const merged = mergeAndSortMessages(
          currentPeerMessages,
          deduplicatedFormatted,
          peerId
        );
        return [...otherPeerMessages, ...merged];
      });

      // Scroll to bottom after initial messages are loaded (only on Chat tab)
      if (activeTab === "Chat") {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (err) {
      console.error(
        "❌ [fetchInitialMessages] Error fetching initial messages:",
        err
      );
    }
  };

  const fetchMoreMessages = async (): Promise<void> => {
    if (!peerId || isFetchingHistory || !hasMore || !chatClient) return;

    try {
      setIsFetchingHistory(true);

      const chatArea = chatAreaRef.current;
      const prevScrollHeight = chatArea?.scrollHeight || 0;
      const prevScrollTop = chatArea?.scrollTop || 0;

      const agoraGroupId = String(
        selectedContact?.groupId ??
          selectedContact?.conversationId ??
          peerId ??
          ""
      ).trim();

      // Cast chatClient to Connection type to access getHistoryMessages
      const client = chatClient as Connection & {
        getHistoryMessages?: (options: {
          targetId: string;
          chatType: string;
          pageSize: number;
          searchDirection: string;
          cursor?: string;
        }) => Promise<{
          messages?: unknown[];
          cursor?: string;
        }>;
      };

      let newMessages: AgoraMessage[] = [];

      // 1) Keep fetching from Agora until it returns an empty page (group chat only).
      if (!agoraHistoryExhaustedRef.current) {
        const agoraRes = await (client.getHistoryMessages
          ? client.getHistoryMessages({
              targetId: agoraGroupId,
              chatType: "groupChat",
              pageSize: 20,
              searchDirection: "up",
              cursor: cursor ? String(cursor) : undefined,
            })
          : Promise.resolve({ messages: [], cursor: undefined }));

        const agoraMessages = (agoraRes?.messages || []) as AgoraMessage[];
        const agoraCursor = agoraRes?.cursor;

        console.log("📥 [fetchMoreMessages] Agora Response received:", {
          targetId: agoraGroupId,
          cursor,
          hasCursor: !!agoraCursor,
          nextCursor: agoraCursor,
          messagesCount: agoraMessages.length,
        });

        // Track oldest timestamp seen
        for (const m of agoraMessages) {
          const t = (m as { time?: unknown }).time;
          const ms = typeof t === "number" ? t : Number(t);
          if (!Number.isNaN(ms) && ms > 0) {
            oldestAgoraTimestampMsRef.current =
              oldestAgoraTimestampMsRef.current === null
                ? ms
                : Math.min(oldestAgoraTimestampMsRef.current, ms);
          }
        }

        if (agoraMessages.length > 0) {
          newMessages = [...agoraMessages];
          if (agoraCursor) {
            setCursor(agoraCursor);
            setHasMore(true);
          } else {
            setHasMore(false);
          }
        } else {
          // Agora exhausted → switch to DB
          agoraHistoryExhaustedRef.current = true;
        }
      }

      // 2) If Agora exhausted, fetch from backend DB using `from=<oldestAgoraTimestampMs>`.
      if (agoraHistoryExhaustedRef.current && newMessages.length === 0) {
        const fromMs = oldestAgoraTimestampMsRef.current;
        if (!fromMs) {
          setHasMore(false);
        } else {
          const apiUrl = new URL(config.api.fetchMessages);
          apiUrl.searchParams.append("conversationId", agoraGroupId);
          apiUrl.searchParams.append("limit", "20");
          apiUrl.searchParams.append("from", String(fromMs));
          if (cursor) {
            // If backend supports cursor pagination, keep using it once we switched.
            apiUrl.searchParams.append("cursor", String(cursor));
          }

          const apiRes = await fetch(apiUrl.toString()).then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            return response.json();
          });

          const apiMessages: ApiMessage[] = apiRes?.messages || [];
          const apiCursor: string | undefined = apiRes?.nextCursor;

          console.log("📥 [fetchMoreMessages] API Response received:", {
            url: apiUrl.toString(),
            conversationId: agoraGroupId,
            cursor,
            hasNextCursor: !!apiCursor,
            nextCursor: apiCursor,
            messagesCount: apiMessages.length,
          });

          const convertedApiMessages = apiMessages
            .map((msg: unknown) => convertApiMessageToFormat(msg as ApiMessage))
            .filter(
              (msg: AgoraMessage | null): msg is AgoraMessage => msg !== null
            );

          newMessages = [...convertedApiMessages];

          if (apiCursor) {
            setCursor(apiCursor);
            setHasMore(true);
          } else {
            setHasMore(false);
          }
        }
      }

      if (newMessages.length === 0) {
        setHasMore(false);
        setIsFetchingHistory(false);
        return;
      }


      // Filter out null messages (healthCoachChanged, mealPlanUpdate, etc.)
      const convertedMessages = newMessages.filter(
        (msg: AgoraMessage | null): msg is AgoraMessage => msg !== null
      );
      const formatted = convertedMessages
        .map((msg: AgoraMessage) =>
          formatMessage(msg, userId, peerId || "", selectedContact, coachInfo)
        )
        .filter((msg: Message | null): msg is Message => msg !== null); // Filter out null messages (hidden call initiate messages, etc.)


      // Deduplicate using centralized utility (same as fetchInitialMessages)
      const deduplicatedFormatted = deduplicateAndSort(
        formatted.map((m) => ({ ...m, peerId }))
      );


      // 🟡 Prevent scroll-to-bottom behavior
      isLoadingHistoryRef.current = true;
      skipAutoScrollRef.current = true;

      setMessages((prev) => {
        const currentPeerMessages = prev.filter((msg) => msg.peerId === peerId);
        const otherPeerMessages = prev.filter((msg) => msg.peerId !== peerId);
        const merged = mergeAndSortMessages(
          currentPeerMessages,
          deduplicatedFormatted,
          peerId
        );
        return [...otherPeerMessages, ...merged];
      });

      // 🧭 Maintain exact scroll position when loading more messages
      requestAnimationFrame(() => {
        if (!chatArea) return;
        const newScrollHeight = chatArea.scrollHeight || 0;
        chatArea.scrollTop =
          newScrollHeight - (prevScrollHeight - prevScrollTop);
        // Delay resetting the flags until the next repaint
        setTimeout(() => {
          isLoadingHistoryRef.current = false;
          skipAutoScrollRef.current = false;
        }, 200);
      });
    } catch (err) {
      console.error("Error fetching more messages:", err);
      isLoadingHistoryRef.current = false;
      skipAutoScrollRef.current = false;
    } finally {
      setIsFetchingHistory(false);
    }
  };

  return (
    <div className="chat-interface">
      <FPChatHeader
        selectedContact={selectedContact}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBackToConversations={onBackToConversations}
        onInitiateCall={onInitiateCall}
        onSendProducts={onSendProducts}
      />

      {/* Chat Area */}
      <div className="chat-area fixed-height" ref={chatAreaRef}>
        {isFetchingHistory && (
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "white",
              zIndex: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px",
              color: "#6b7280",
              fontSize: "0.85rem",
            }}
          >
            <div
              className="spinner"
              style={{
                width: "18px",
                height: "18px",
                border: "2px solid #d1d5db",
                borderTop: "2px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginRight: "8px",
              }}
            ></div>
            Loading older messages...
          </div>
        )}

        {activeTab === "Chat" && (
          <FPChatTab
            peerId={peerId || ""}
            currentConversationMessages={currentConversationMessages}
            selectedContact={selectedContact}
            userId={userId}
            formatDateLabel={formatDateLabel}
            formatCurrency={formatCurrency}
            openImageViewer={openImageViewer}
            currentlyPlayingAudioRef={currentlyPlayingAudioRef}
            onEdit={handleEditMessage}
            onPlayVideo={openVideoPlayer}
          />
        )}
        {activeTab === "Info" && (
          <FPInfoTab selectedContact={selectedContact} />
        )}
        {activeTab === "Description" && (
          <FPDescriptionTab
            selectedContact={selectedContact}
            chatClient={chatClient as Connection | null}
            peerId={peerId}
            userId={userId}
          />
        )}
      </div>

      {/* Message Input - Only show on Chat tab */}
      {activeTab === "Chat" && (
        <div className="message-input-area">
          {uploadProgress !== null && (
            <div
              style={{
                width: "100%",
                background: "#e5e7eb",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 8,
                height: 8,
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}

          {/* Edit mode indicator */}
          {editingMessageId && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "6px",
                marginBottom: "8px",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "#92400e", fontWeight: 500 }}>
                Editing message
              </span>
              <button
                onClick={() => {
                  setEditingMessageId(null);
                  setMessage("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#92400e",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(146, 64, 14, 0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <FPDraftAttachmentPreview
            draftAttachment={draftAttachment}
            onRemove={clearDraftAttachment}
            onImageClick={openImageViewer}
            formatDuration={formatDuration}
            currentlyPlayingAudioRef={currentlyPlayingAudioRef}
          />

          <FPMessageInput
            message={message}
            setMessage={
              setMessage as (msg: string | ((prev: string) => string)) => void
            }
            draftAttachment={draftAttachment}
            getDraftCaption={getDraftCaption}
            selectedContact={selectedContact}
            isRecording={isRecording}
            peerId={peerId || ""}
            inputResetKey={inputResetKey}
            onSend={handleSendMessage}
            onKeyPress={handleKeyPress}
            onStartAudioRecording={startAudioRecording}
            onToggleMediaPopup={() => setShowMediaPopup(!showMediaPopup)}
            onToggleEmojiPicker={toggleEmojiPicker}
            showEmojiPicker={showEmojiPicker}
            audioBtnRef={audioBtnRef as React.RefObject<HTMLButtonElement>}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            buttonRef={buttonRef as React.RefObject<HTMLButtonElement>}
            emojiPickerRef={emojiPickerRef as React.RefObject<HTMLDivElement>}
            isEditing={!!editingMessageId}
          />
        </div>
      )}

      {/* Media Upload Popup */}
      <FPMediaPopup
        showMediaPopup={showMediaPopup}
        onSelect={handleMediaSelect}
        onClose={() => setShowMediaPopup(false)}
      />

      {/* Audio Recording Overlay */}
      <FPAudioRecordingOverlay
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onCancel={cancelAudioRecording}
        onStop={stopAudioRecording}
        formatDuration={formatDuration}
      />

      {/* Camera Capture Overlay */}
      <FPCameraCaptureOverlay
        showCameraCapture={showCameraCapture}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        onClose={closeCamera}
        onCapture={capturePhoto}
      />

      {/* Fullscreen Image Viewer */}
      <FPImageViewer
        imageUrl={imageViewerUrl}
        imageAlt={imageViewerAlt}
        onClose={closeImageViewer}
      />

      {/* Video Player */}
      <FPVideoPlayer videoUrl={videoPlayerUrl} onClose={closeVideoPlayer} />

      {/* Audio Player for Voice Recordings */}
      <FPAudioPlayer audioUrl={audioPlayerUrl} onClose={closeAudioPlayer} />

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        accept="*/*"
      />
      <input
        type="file"
        ref={photoInputRef}
        style={{ display: "none" }}
        onChange={handlePhotoSelect}
        accept="image/*"
      />
      <input
        type="file"
        ref={cameraInputRef}
        style={{ display: "none" }}
        onChange={handlePhotoSelect}
        accept="image/*"
        capture="environment"
      />
    </div>
  );
}
