import React, { useEffect, useState, useRef } from "react";
import "./FPChatApp.css";
import FPConversationList from "./components/FPConversationList";
import FPChatInterface from "./components/FPChatInterface";
import FPRecordingPlayerPage from "./components/FPRecordingPlayerPage";
import FPUserDetails from "./components/FPUserDetails";
import FPCallApp from "../fp-call/FPCallApp";
import AgoraChat from "agora-chat";
import { useChatClient } from "./hooks/useChatClient";
import config from "../common/config";
import { buildCustomExts } from "./utils/buildCustomExts";
import { createMessageHandlers } from "./utils/messageHandlers";
import {
  findContactForHistoryPeer,
  findContactForOutgoingListUpdate,
} from "./utils/conversationListMatch";
import {
  Contact,
  Message,
  CoachInfo,
  LogEntry,
  Product,
} from "../common/types/chat";
import { CallEndData } from "../common/types/call";
import axios from "axios";

interface FPChatAppProps {
  userId: string;
  onLogout?: () => void;
  onConversationChange?: (userId: string | null) => void;
}

interface ActiveCall {
  userId: string;
  peerId: string;
  channel: string;
  isInitiator: boolean;
  callType: "video" | "audio";
  localUserName: string;
  peerName: string;
  peerAvatar?: string;
}

interface IncomingCall {
  from: string;
  channel: string;
  callId?: string;
  callType?: "video" | "audio";
}

const PRODUCT_SUGGESTION_COUNT = 3;
const PRODUCT_SUGGESTIONS: Product[] = [
  {
    id: "90909",
    title: "What's Up Wellness Sleep Gummies",
    description:
      "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
    actual_amount: 700,
    selling_amount: 560,
    image_url:
      "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_1000.jpg",
    action_id: "90909",
    rediection_url: "",
    cta_details: {
      text: "",
      text_color: "",
      bg_color: "",
    },
  },
  {
    id: "90910",
    title: "Hello Healthy Coffee (South Indian)",
    description:
      "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
    actual_amount: 579,
    selling_amount: 350,
    image_url:
      "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_2000.jpg",
    action_id: "90910",
    rediection_url: "",
    cta_details: {
      text: "",
      text_color: "",
      bg_color: "",
    },
  },
  {
    id: "90911",
    title: "Max Protein Bar",
    description:
      "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
    actual_amount: 450,
    selling_amount: 350,
    image_url:
      "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_3000.jpg",
    action_id: "90911",
    rediection_url: "",
    cta_details: {
      text: "",
      text_color: "",
      bg_color: "",
    },
  },
  {
    id: "90912",
    title: "Kikibix 100% Whole Grain Cookies",
    description:
      "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
    actual_amount: 650,
    selling_amount: 475,
    image_url:
      "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_4000.jpg",
    action_id: "90912",
    rediection_url: "",
    cta_details: {
      text: "",
      text_color: "",
      bg_color: "",
    },
  },
  {
    id: "90913",
    title: "Ginger Honey Tonic",
    description:
      "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
    actual_amount: 800,
    selling_amount: 650,
    image_url:
      "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_5000.jpg",
    action_id: "90913",
    rediection_url: "",
    cta_details: {
      text: "",
      text_color: "",
      bg_color: "",
    },
  },
];

function FPChatApp({
  userId,
  onLogout,
  onConversationChange,
}: FPChatAppProps): React.JSX.Element {
  const [token, setToken] = useState<string | undefined>(undefined);
  const appKey = config.agora.appKey;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Contact[]>([]);
  const [peerId, setPeerId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<(string | LogEntry)[]>([]);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterType, setFilterType] = useState<
    "all" | "pending_customer" | "pending_doctor" | "first_response"
  >("all");
  const [coachInfo, setCoachInfo] = useState<CoachInfo>({
    coachName: "",
    profilePhoto: "",
  });

  // Call state management
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isSendingProducts, setIsSendingProducts] = useState<boolean>(false);

  // 🔹 Global message ID tracker to prevent duplicates
  const isSendingRef = useRef<boolean>(false);
  const callEndMessageSentRef = useRef<boolean>(false);
  /** Customer user id + list/API group id for getDietitianToken refresh */
  const dietitianChatContextRef = useRef<{
    customerUserId: string;
    groupId: string | null;
  } | null>(null);

  const [isFetchingDietitianToken, setIsFetchingDietitianToken] =
    useState<boolean>(false);

  const addLog = (log: string | LogEntry): void =>
    setLogs((prev) => {
      // Always add log entries, even if they're duplicates
      // This allows users to send the same message multiple times consecutively
      return [...prev, log];
    });

  const getDietitianCredentials = React.useCallback(
    async (
      customerUserId: string,
      groupIdForApi: string | null
    ): Promise<{ token: string; group_id: string } | null> => {
      try {
        const res = await axios.post(config.api.getDietitianToken, {
          user_id: Number(customerUserId),
          dietitian_id: Number(userId),
          group_id: groupIdForApi,
        });
        const newToken = res.data?.token as string | undefined;
        const gid = res.data?.group_id as string | number | undefined;
        if (newToken && gid != null && String(gid) !== "") {
          return { token: newToken, group_id: String(gid) };
        }
        addLog("getDietitianToken: missing token or group_id in response");
      } catch (error: unknown) {
        const msg = axios.isAxiosError(error)
          ? error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message
          : error instanceof Error
            ? error.message
            : String(error);
        addLog(`getDietitianToken error: ${msg}`);
        console.error("getDietitianToken:", error);
      }
      return null;
    },
    [userId]
  );

  const refreshChatToken = React.useCallback(async (): Promise<string | null> => {
    const ctx = dietitianChatContextRef.current;
    if (!ctx) {
      addLog("Cannot refresh token: no active conversation context");
      return null;
    }
    addLog("Refreshing chat token (getDietitianToken)...");
    const result = await getDietitianCredentials(
      ctx.customerUserId,
      ctx.groupId
    );
    if (result?.token) {
      setToken(result.token);
      addLog("Chat token refreshed");
      return result.token;
    }
    return null;
  }, [getDietitianCredentials]);

  // Create a ref to store clientRef for handlers
  const clientRefForHandlers = useRef<unknown>(null);

  // Handle incoming call - defined early so it can be used in handlers
  const handleIncomingCall = (callData: IncomingCall): void => {
    setIncomingCall(callData);
  };


  // Create handlers - they will use clientRefForHandlers.current
  const handlers = createMessageHandlers({
    userId,
    setIsLoggedIn,
    setIsLoggingIn: () => {}, // Not used in chat app, login handled by parent
    addLog,
    setConversations,
    generateNewToken: refreshChatToken,
    handleIncomingCall,
    // onPresenceStatus: handlePresenceStatus,
    get clientRef() {
      return clientRefForHandlers;
    },
  });

  const clientRef = useChatClient(appKey, handlers);

  // Update the ref that handlers use
  useEffect(() => {
    clientRefForHandlers.current = clientRef.current;
  }, [clientRef]);

  // Auto-login when dietitian userId and token are set (token comes from getDietitianToken on conversation tap)
  useEffect(() => {
    const attemptLogin = async (): Promise<void> => {
      if (!userId || !token || isLoggedIn || !clientRef.current) {
        return;
      }

      if (
        typeof (
          clientRef.current as unknown as {
            open: (options: { user: string; accessToken: string }) => Promise<void> | void;
          }
        ).open === "function"
      ) {
        try {
          const loginPromise = (
            clientRef.current as unknown as {
              open: (options: { user: string; accessToken: string }) => Promise<void> | void;
            }
          ).open({ user: userId, accessToken: token });

          if (loginPromise && typeof loginPromise.then === "function") {
            loginPromise
              .then(() => {
                // Login successful
              })
              .catch((error) => {
                console.error("[FPChatApp] Login promise rejected:", error);
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                addLog(`Login failed: ${errorMessage}`);
              });
          }
        } catch (error) {
          console.error("[FPChatApp] Error during login:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          addLog(`Login error: ${errorMessage}`);
        }
      }
    };

    attemptLogin();
  }, [userId, token, isLoggedIn, clientRef]);

  const getRandomProducts = (count: number): Product[] => {
    const shuffled = [...PRODUCT_SUGGESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const handleSendProductSuggestions = async (): Promise<void> => {
    if (!userId) {
      addLog("Select a conversation before sending product suggestions.");
      return;
    }

    const productTargetGroupId = String(
      selectedContact?.groupId ??
        selectedContact?.conversationId ??
        peerId ??
        ""
    ).trim();
    if (!productTargetGroupId) {
      addLog("No group id for product message.");
      return;
    }

    const memberListId = selectedContact?.id
      ? String(selectedContact.id)
      : "";
    const patientId = (memberListId || peerId || "").trim();
    if (!patientId) {
      addLog("No patient id for product suggestions (targetUserId / receiverId).");
      return;
    }

    try {
      if (isSendingProducts) {
        return;
      }
      setIsSendingProducts(true);
      const productList = getRandomProducts(PRODUCT_SUGGESTION_COUNT).map(
        (product) => ({
          id: product.id || product.action_id || "", // Include id for deduplication
          title: product.title || "",
          description: product.description || "",
          actual_amount: product.actual_amount || 0,
          selling_amount: product.selling_amount || product.actual_amount || 0,
          image_url: product.image_url || "",
          action_id: product.action_id || "",
          rediection_url: product.rediection_url || "",
          cta_details: {
            text: product.cta_details?.text || "",
            text_color: product.cta_details?.text_color || "",
            bg_color: product.cta_details?.bg_color || "",
          },
        })
      );

      const payload = {
        action_type: "recommended_products",
        title: "Recommended products",
        description: "Recommended products",
        product_list: productList,
      };

      const body = {
        from: userId,
        groupId: productTargetGroupId,
        targetUserId: patientId,
        receiverId: patientId,
        isFromUser: false,
        type: "recommended_products",
        data: payload,
      };


      await axios.post(config.api.customMessage, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      addLog(`Failed to send product suggestions: ${errorMessage}`);
      console.error("Error sending product suggestions:", error);
    } finally {
      setIsSendingProducts(false);
    }
  };

  // Fetch coach info when userId is set
  useEffect(() => {
    const fetchCoachInfo = async (): Promise<void> => {
      if (!userId) {
        setCoachInfo({ coachName: "", profilePhoto: "" });
        return;
      }

      try {
        const response = await fetch(config.api.fetchCoaches);

        if (response.ok) {
          const data = (await response.json()) as {
            coaches?: Array<{
              coachId: string | number;
              coachName?: string;
              coachPhoto?: string;
            }>;
          };
          const coach = data.coaches?.find(
            (c) => String(c.coachId) === String(userId)
          );
          if (coach) {
            setCoachInfo({
              coachName: coach.coachName || "",
              profilePhoto: coach.coachPhoto || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching coach info:", error);
      }
    };

    fetchCoachInfo();
  }, [userId]);

  // Detect mobile view - but don't update when there's an active call (video or audio)
  useEffect(() => {
    const checkMobile = (): void => {
      // Don't update mobile view state if there's an active call (video or audio)
      // This prevents re-renders that could affect the call and cause token regeneration
      if (activeCall) {
        return;
      }
      setIsMobileView(window.innerWidth <= 1360);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [activeCall]);

  // Reset mobile chat view when contact is deselected
  useEffect(() => {
    if (!selectedContact && showChatOnMobile) {
      setShowChatOnMobile(false);
    }
  }, [selectedContact, showChatOnMobile]);

  // Map filter type to API format
  const getApiFilter = (
    filterType: "all" | "pending_customer" | "pending_doctor" | "first_response"
  ): string => {
    const filterMap: Record<
      "all" | "pending_customer" | "pending_doctor" | "first_response",
      string
    > = {
      all: "all",
      first_response: "first-response",
      pending_customer: "reply-pending-from-user",
      pending_doctor: "reply-pending-from-coach",
    };
    return filterMap[filterType] || "all";
  };

  // Map sort order to API format
  const getApiSort = (sortOrder: "newest" | "oldest"): string => {
    return sortOrder === "newest" ? "desc" : "asc";
  };

  // Fetch conversations from API when userId is available (doesn't require login)
  // This runs on mount to populate the conversation list - this is expected behavior
  // Individual conversation messages are fetched when a conversation is clicked
  useEffect(() => {
    const fetchConversations = async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        const apiFilter = getApiFilter(filterType);
        const apiSort = getApiSort(sortOrder);

        addLog(
          `Fetching conversations for coach ${userId} (filter: ${apiFilter}, sort: ${apiSort})...`
        );

        const url = new URL(config.api.fetchConversations);
        url.searchParams.append("coachId", userId);
        url.searchParams.append("filter", apiFilter);
        url.searchParams.append("sort", apiSort);
        url.searchParams.append("page", "1");
        url.searchParams.append("limit", "40");

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }

        const data = (await response.json()) as {
          conversations?: Array<{
            userId: string | number;
            userName?: string;
            userPhoto?: string;
            lastMessage?: string | object | null;
            lastMessageTime?: string | Date;
            lastMessageAt?: string | Date | null;
            lastMessageAtMs?: number | null;
            lastMessageId?: string | null;
            lastMessageType?: string | null;
            lastMessageSender?: string | number;
            conversationId?: string | number | null;
            isGroupConversation?: boolean | null;
            participantIds?: number[];
            messageCount?: number;
            unreadCount?: number;
            filterState?: string;
            createdAt?: string | Date;
          }>;
        };
        const apiConversations = data.conversations || [];


        // Helper function to generate preview from lastMessage (could be string or object)
        const generatePreviewFromLastMessage = (
          lastMsg: string | object | null | undefined
        ): string | null => {
          if (!lastMsg) {
            return null;
          }

          let parsed = null;

          // If it's already a string, try to parse it as JSON
          if (typeof lastMsg === "string") {
            // Check if it looks like JSON (starts with { or [)
            if (
              lastMsg.trim().startsWith("{") ||
              lastMsg.trim().startsWith("[")
            ) {
              try {
                parsed = JSON.parse(lastMsg);
              } catch {
                // Not valid JSON, return as-is
                return lastMsg;
              }
            } else {
              // Plain text string, return as-is
              return lastMsg;
            }
          } else if (typeof lastMsg === "object") {
            // Already an object
            parsed = lastMsg;
          } else {
            // Other type, convert to string
            return String(lastMsg);
          }

          // Handle API format with nested body structure
          // API returns: { body: { data: "{\"message\":\"...\",\"type\":\"text\"}", type: "text" }, ... }
          // OR: { body: { message: "...", type: "text" }, ... }
          if (parsed && typeof parsed === "object" && "body" in parsed) {
            const bodyObj = (parsed as { body?: unknown }).body;
            if (bodyObj && typeof bodyObj === "object") {
              const bodyTyped = bodyObj as { 
                type?: string; 
                message?: string; 
                data?: string | object;
              };
              
              // Check if message is directly in body
              if (bodyTyped.type === "text" && bodyTyped.message) {
                return bodyTyped.message;
              }
              
              // Check if message is in body.data as JSON string
              if (bodyTyped.type === "text" && bodyTyped.data) {
                try {
                  let dataObj: { message?: string; type?: string } | null = null;
                  if (typeof bodyTyped.data === "string") {
                    dataObj = JSON.parse(bodyTyped.data);
                  } else if (typeof bodyTyped.data === "object") {
                    dataObj = bodyTyped.data as { message?: string; type?: string };
                  }
                  
                  if (dataObj && dataObj.message) {
                    return dataObj.message;
                  }
                } catch (e) {
                  // Failed to parse body.data
                }
              }
              
              // For other types, process the body object
              parsed = bodyObj;
            }
          }

          // Now process the parsed object
          if (parsed && typeof parsed === "object" && "type" in parsed) {
            const parsedObj = parsed as {
              type?: string;
              fileName?: string;
              callType?: string;
              message?: string;
              body?: string;
            };
            const t = String(parsedObj.type).toLowerCase();
            if (t === "image") return "Photo";
            if (t === "file")
              return parsedObj.fileName ? `📎 ${parsedObj.fileName}` : "File";
            if (t === "audio") return "Audio";
            if (t === "meal_plan_updated" || t === "meal_plan_update")
              return "Meal plan updated";
            if (
              t === "new_nutritionist" ||
              t === "new_nutrionist" ||
              t === "coach_assigned" ||
              t === "coach_details"
            )
              return (
                (parsedObj as { title?: string; name?: string }).title ||
                (parsedObj as { title?: string; name?: string }).name ||
                "New nutritionist assigned"
              );
            if (t === "products" || t === "recommended_products")
              return "Products";
            if (t === "call")
              return `${
                parsedObj.callType === "video" ? "Video" : "Audio"
              } call`;
            if (t === "general_notification" || t === "general-notification")
              return (parsedObj as { title?: string }).title || "Notification";
            if (t === "video_call")
              return (parsedObj as { title?: string }).title || "Video call";
            if (t === "voice_call")
              return (parsedObj as { title?: string }).title || "Voice call";
            if (t === "documents")
              return (parsedObj as { title?: string }).title || "Document";
            if (t === "call_scheduled") {
              const time = (parsedObj as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                // Format date as "11 Aug 10:00 am" (12-hour format with AM/PM)
                const formatScheduledDate = (date: Date): string => {
                  const day = date.getDate();
                  const monthNames = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  const month = monthNames[date.getMonth()];
                  let hours = date.getHours();
                  const minutes = date.getMinutes();
                  const ampm = hours >= 12 ? "pm" : "am";
                  hours = hours % 12;
                  hours = hours ? hours : 12; // the hour '0' should be '12'
                  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
                  return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
                };
                return `Schedule, ${formatScheduledDate(scheduledDate)}`;
              }
              return "Call scheduled";
            }
            if (t === "scheduled_call_canceled") {
              return "Scheduled call cancelled";
            }
            if (t === "text") {
              // API uses "message" field for text messages
              const textPreview = parsedObj.message || parsedObj.body || "";
              return textPreview || null;
            }
          }

          // If object has body or message, use it
          if (parsed && typeof parsed === "object") {
            const parsedObj = parsed as { body?: string | object; message?: string };
            // Check if body is an object with nested message
            if (parsedObj.body && typeof parsedObj.body === "object") {
              const bodyObj = parsedObj.body as { message?: string; type?: string };
              if (bodyObj.message) {
                return bodyObj.message;
              }
            }
            if (typeof parsedObj.body === "string" && parsedObj.body) {
              return parsedObj.body;
            }
            if (parsedObj.message) {
              return parsedObj.message;
            }
          }

          // If we parsed from string but it's not a recognized format, return original string
          if (typeof lastMsg === "string") {
            return lastMsg;
          }

          // Otherwise stringify the object
          const stringified = JSON.stringify(parsed || lastMsg);
          return stringified;
        };

        // Filter out blocked UIDs (Recorder and RTST Agent) from conversations
        const filteredConversations = apiConversations.filter((conv) => {
          const userId = String(conv.userId);
          return userId !== "999999999" && userId !== "999999998";
        });

        // Map API response to app conversation format
        // Preserve existing timestamps if API doesn't provide lastMessageTime
        setConversations((prevConversations) => {
          const normalizeId = (value: string | number | null | undefined) => {
            const str = value == null ? "" : String(value);
            return str.startsWith("user_") ? str.replace("user_", "") : str;
          };

          const existingTimestamps = new Map(
            prevConversations
              .map((conv) => [normalizeId(conv.id), conv.timestamp] as const)
              .filter(([key]) => key.length > 0)
          );

          const mappedConversations = filteredConversations.map(
            (conv: {
              userId: string | number;
              userName?: string;
              userPhoto?: string;
              lastMessage?: string | object | null;
              lastMessageTime?: string | Date;
              lastMessageAt?: string | Date | null;
              lastMessageAtMs?: number | null;
              lastMessageSender?: string | number;
              conversationId?: string | number | null;
              isGroupConversation?: boolean | null;
              participantIds?: number[];
              messageCount?: number;
              unreadCount?: number;
              filterState?: string;
              createdAt?: string | Date;
            }) => {
              const lastMessage = generatePreviewFromLastMessage(
                conv.lastMessage ?? undefined
              );

              const memberUserId = String(conv.userId);
              const normalizedConversationId = normalizeId(memberUserId);
              const existingTimestamp = existingTimestamps.get(
                normalizedConversationId
              );

              const fromLastMessageAt =
                conv.lastMessageAt != null &&
                String(conv.lastMessageAt).trim() !== ""
                  ? new Date(conv.lastMessageAt as string | Date)
                  : null;
              const fromLastMessageAtMs =
                typeof conv.lastMessageAtMs === "number" &&
                !Number.isNaN(conv.lastMessageAtMs)
                  ? new Date(conv.lastMessageAtMs)
                  : null;
              const fromLegacyTime = conv.lastMessageTime
                ? new Date(conv.lastMessageTime)
                : null;
              const createdAtTimestamp = conv.createdAt
                ? new Date(conv.createdAt)
                : null;

              const pickValidDate = (
                ...candidates: Array<Date | null | undefined>
              ) => {
                for (const candidate of candidates) {
                  if (
                    candidate instanceof Date &&
                    !Number.isNaN(candidate.getTime())
                  ) {
                    return candidate;
                  }
                }
                return null;
              };

              const timestamp = pickValidDate(
                fromLastMessageAt,
                fromLastMessageAtMs,
                fromLegacyTime,
                createdAtTimestamp,
                existingTimestamp instanceof Date
                  ? existingTimestamp
                  : existingTimestamp
                    ? new Date(existingTimestamp)
                    : null
              );

              const listGroupId =
                conv.conversationId != null &&
                String(conv.conversationId).trim() !== ""
                  ? String(conv.conversationId)
                  : null;

              return {
                id: memberUserId,
                name: conv.userName || `User ${conv.userId}`,
                avatar: conv.userPhoto || config.defaults.avatar,
                lastMessage: lastMessage ?? undefined,
                timestamp: timestamp,
                lastMessageFrom: conv.lastMessageSender
                  ? String(conv.lastMessageSender)
                  : null,
                conversationId: listGroupId,
                isGroupConversation: conv.isGroupConversation ?? null,
                participantIds: conv.participantIds,
                messageCount: conv.messageCount || 0,
                unreadCount: conv.unreadCount || 0,
                filterState: conv.filterState,
                createdAt: conv.createdAt ? new Date(conv.createdAt) : undefined,
              };
            }
          );

          const sortedConversations = mappedConversations
            .map((conv, index) => {
              const time = conv.timestamp
                ? new Date(conv.timestamp).getTime()
                : NaN;
              return {
                conv,
                sortIndex: index,
                time,
                hasValidTime: Number.isFinite(time),
              };
            })
            .sort((a, b) => {
              if (a.hasValidTime !== b.hasValidTime) {
                return a.hasValidTime ? -1 : 1;
              }
              if (a.hasValidTime && b.hasValidTime) {
                return b.time - a.time;
              }
              return a.sortIndex - b.sortIndex;
            })
            .map((entry) => entry.conv);

          return sortedConversations;
        });
        
        // Log after state update (we'll log the count from the filtered conversations)
        addLog(`Loaded ${filteredConversations.length} conversation(s) from API`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error fetching conversations: ${errorMessage}`);
        console.error("Error fetching conversations:", error);
        // Set empty array on error to prevent retry loop
        setConversations([]);
      }
    };

    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filterType, sortOrder, onConversationChange]);

  const handleLogout = (): void => {
    if (
      clientRef.current &&
      typeof (clientRef.current as { close: () => void }).close === "function"
    ) {
      (clientRef.current as { close: () => void }).close();
    }
    setIsLoggedIn(false);
    setToken(undefined);
    dietitianChatContextRef.current = null;
    setSelectedContact(null);
    setConversations([]);
    setPeerId("");
    setMessage("");
    // Call parent's logout handler if provided
    if (onLogout) {
      onLogout();
    }
    if (onConversationChange) {
      onConversationChange(null);
    }
  };

  const handleConversationChange = (user: Contact | null): void => {
    if (!onConversationChange) {
      return;
    }
    const nextId = user?.id ? String(user.id) : null;
    onConversationChange(nextId);
  };

  const handleSelectContact = async (contact: Contact): Promise<boolean> => {
    const contactId = String(contact.id);
    if (contactId === "999999999" || contactId === "999999998") {
      return false;
    }

    setIsFetchingDietitianToken(true);
    try {
      if (
        clientRef.current &&
        typeof (clientRef.current as { close: () => void }).close === "function"
      ) {
        (clientRef.current as { close: () => void }).close();
      }
      setIsLoggedIn(false);
      setToken(undefined);

      const listGroupId =
        contact.conversationId != null &&
        String(contact.conversationId).trim() !== ""
          ? String(contact.conversationId)
          : null;

      const result = await getDietitianCredentials(contactId, listGroupId);
      if (!result) {
        addLog(
          "Failed to open conversation: getDietitianToken did not return a token."
        );
        return false;
      }

      const merged: Contact = {
        ...contact,
        conversationId: result.group_id,
        groupId: result.group_id,
      };

      dietitianChatContextRef.current = {
        customerUserId: contactId,
        groupId: result.group_id,
      };

      setPeerId(result.group_id);
      setToken(result.token);
      setSelectedContact(merged);
      handleConversationChange(merged);

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === contact.id);
        if (existing) {
          return prev.map((c) =>
            c.id === contact.id ? { ...c, ...merged } : c
          );
        }
        return [
          ...prev,
          {
            ...merged,
            lastMessage: merged.lastMessage ?? "",
            timestamp: merged.timestamp ?? new Date(),
            avatar:
              merged.avatar ||
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
          },
        ];
      });

      return true;
    } finally {
      setIsFetchingDietitianToken(false);
    }
  };

  const handleAddConversation = (contact: Contact): void => {
    // Don't allow adding blocked UIDs (Recorder and RTST Agent) as a conversation
    const contactId = String(contact.id);
    if (contactId === "999999999" || contactId === "999999998") {
      return;
    }

    const newConversation = {
      ...contact,
      lastMessage: "",
      timestamp: new Date(),
      avatar:
        contact.avatar ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      replyCount: 0,
    };
    setConversations((prev) => [newConversation, ...prev]);
    // Optionally auto-select the new conversation
    // handleSelectContact(newConversation);
  };

  const handleSelectConversation = async (
    conversation: Contact
  ): Promise<void> => {
    const ok = await handleSelectContact(conversation);
    if (ok && isMobileView) {
      setShowChatOnMobile(true);
    }
  };

  const handleBackToConversations = (): void => {
    if (
      clientRef.current &&
      typeof (clientRef.current as { close: () => void }).close === "function"
    ) {
      (clientRef.current as { close: () => void }).close();
    }
    setIsLoggedIn(false);
    setToken(undefined);
    dietitianChatContextRef.current = null;
    setSelectedContact(null);
    setPeerId("");
    setMessage("");
    setShowChatOnMobile(false);
    handleConversationChange(null);
  };

  // Handle call initiation (video or audio)
  const handleInitiateCall = async (
    callType: "video" | "audio" = "video"
  ): Promise<void> => {
    const customerId = selectedContact?.id
      ? String(selectedContact.id)
      : "";
    if (!customerId || !userId) {
      addLog("Cannot initiate call: Missing customer or coach ID");
      return;
    }

    // Channel: customer (member) id + dietitian (coach) id — not the Agora group id
    const callTypeStr = callType === "video" ? "video" : "voice";
    const channel = `fp_rtc_call_${callTypeStr}_${customerId}_${userId}_group`;

    // Reset call end message sent flag for new call
    callEndMessageSentRef.current = false;

    // DO NOT send initiate message - only send end message with duration
    // Removed: await handleSendMessage(callMessage);

    // Ensure message is cleared
    setMessage("");

    // Set active call state
    setActiveCall({
      userId,
      peerId: customerId,
      channel,
      isInitiator: true,
      callType: callType,
      localUserName: coachInfo.coachName || userId, // Use coachName from coachInfo
      peerName: selectedContact?.name || customerId,
      peerAvatar: selectedContact?.avatar,
    });

    addLog(`Initiating ${callType} call with ${customerId}`);
  };

  // Handle accept call (reserved for incoming-call flow)
  const _handleAcceptCall = (): void => {
    if (!incomingCall) return;

    // Reset call end message sent flag for accepted call
    callEndMessageSentRef.current = false;

    // Find the contact from conversations
    const contact = conversations.find((c) => c.id === incomingCall.from);

    setActiveCall({
      userId,
      peerId: incomingCall.from,
      channel: incomingCall.channel,
      isInitiator: false,
      callType: incomingCall.callType || "video", // Default to video if not specified
      localUserName: userId, // You can get actual name from user profile if available
      peerName: contact?.name || incomingCall.from,
      peerAvatar: contact?.avatar,
    });
    setIncomingCall(null);
  };


  // Handle reject call (reserved for incoming-call flow)
  const _handleRejectCall = (): void => {
    setIncomingCall(null);
  };

  // Handle end call
  const handleEndCall = async (
    callInfo: CallEndData | null = null
  ): Promise<void> => {
    // Prevent duplicate call end messages
    if (callEndMessageSentRef.current) {
      // Clear call state even if message was already sent
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    if (!activeCall || !callInfo) {
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }


    // Clear call state
    setActiveCall(null);
    setIncomingCall(null);
    // Clear any call message that might be in the input box
    setMessage("");
  };

  // Helper function to generate preview from a formatted message object
  const generatePreviewFromMessage = (
    formattedMsg: Message | null | undefined
  ): string => {
    if (!formattedMsg) return "";

    // Handle different message types
    if (formattedMsg.messageType === "image") {
      return "Photo";
    } else if (formattedMsg.messageType === "file") {
      return formattedMsg.fileName ? `📎 ${formattedMsg.fileName}` : "File";
    } else if (formattedMsg.messageType === "audio") {
      return "Audio";
    } else if (formattedMsg.messageType === "call") {
      // Convert old "call" format to new format for preview
      return formattedMsg.callType === "audio" ? "Voice call" : "Video call";
    } else if (formattedMsg.messageType === "general_notification") {
      return formattedMsg.system?.payload?.title || "Notification";
    } else if (formattedMsg.messageType === "video_call") {
      return formattedMsg.system?.payload?.title || "Video call";
    } else if (formattedMsg.messageType === "voice_call") {
      return formattedMsg.system?.payload?.title || "Voice call";
    } else if (formattedMsg.messageType === "documents") {
      return (
        formattedMsg.system?.payload?.title ||
        formattedMsg.fileName ||
        "Document"
      );
    } else if (formattedMsg.messageType === "call_scheduled") {
      const time = formattedMsg.system?.payload?.time as number | undefined;
      if (time) {
        const scheduledDate = new Date(time * 1000); // Convert seconds to milliseconds
        // Format date as "11 Aug 10:00 am" (12-hour format with AM/PM)
        const formatScheduledDate = (date: Date): string => {
          const day = date.getDate();
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const month = monthNames[date.getMonth()];
          let hours = date.getHours();
          const minutes = date.getMinutes();
          const ampm = hours >= 12 ? "pm" : "am";
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
          return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
        };
        return `Schedule, ${formatScheduledDate(scheduledDate)}`;
      }
      return "Call scheduled";
    } else if (formattedMsg.messageType === "scheduled_call_canceled") {
      return "Scheduled call cancelled";
    } else if (formattedMsg.messageType === "text") {
      // For text messages, try to parse if it's JSON (custom message)
      try {
        const parsed = JSON.parse(formattedMsg.content);
        if (parsed && typeof parsed === "object" && "type" in parsed) {
          const parsedObj = parsed as {
            type?: string;
            fileName?: string;
            callType?: string;
            title?: string;
          };
          const t = String(parsedObj.type).toLowerCase();
          if (t === "image") return "Photo";
          if (t === "file")
            return parsedObj.fileName ? `📎 ${parsedObj.fileName}` : "File";
          if (t === "audio") return "Audio";
          if (t === "meal_plan_updated") return "Meal plan updated";
          if (t === "new_nutritionist" || t === "new_nutrionist")
            return "New nutritionist assigned";
          if (t === "products") return "Products";
          if (t === "call")
            return `${parsedObj.callType === "video" ? "Video" : "Audio"} call`;
          if (t === "general_notification" || t === "general-notification")
            return parsedObj.title || "Notification";
          if (t === "video_call") return parsedObj.title || "Video call";
          if (t === "voice_call") return parsedObj.title || "Voice call";
          if (t === "documents") return parsedObj.title || "Document";
        }
      } catch {
        // Not JSON, use content as-is
      }
      return formattedMsg.content || "";
    }

    // Fallback
    return formattedMsg.content || "Message";
  };

  // Function to update conversation's last message from history
  const updateLastMessageFromHistory = (
    peerId: string,
    formattedMsg: Message,
    options?: { editOfLatest?: boolean }
  ): void => {
    if (!peerId || !formattedMsg) return;

    const preview = generatePreviewFromMessage(formattedMsg);
    const timestamp = formattedMsg.createdAt
      ? new Date(formattedMsg.createdAt)
      : new Date();
    const lastMessageFrom = formattedMsg.sender || peerId;

    setConversations((prev) => {
      const existing = findContactForHistoryPeer(prev, peerId);

      console.log(
        "🔄 [updateLastMessageFromHistory] Conversation search result:",
        {
          existing: existing
            ? { id: existing.id, lastMessage: existing.lastMessage }
            : null,
          allConversationIds: prev.map((c) => c.id),
        }
      );

      if (existing) {
        // Use the existing conversation ID format
        const conversationId = existing.id;

        // Only update if history message is more recent than existing last message
        // or if there's no existing last message; edits of the latest thread message
        // force refresh so the list preview text stays in sync with Agora/backend.
        const existingTimestamp = existing.timestamp
          ? new Date(existing.timestamp)
          : null;
        const shouldUpdate =
          options?.editOfLatest === true ||
          !existingTimestamp ||
          timestamp.getTime() >= existingTimestamp.getTime();

        if (shouldUpdate) {
          const updated = prev.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              lastMessage: preview,
              timestamp: timestamp,
              lastMessageFrom: lastMessageFrom,
            };
          });
          return updated;
        } else {
        }
      } else {
        console.warn(
          "⚠️ [updateLastMessageFromHistory] Conversation not found, cannot update preview"
        );
      }
      return prev;
    });
  };

  const handleSendMessage = async (
    messageOverride: string | object | null = null
  ): Promise<void> => {
    // Prevent multiple simultaneous sends
    if (isSendingRef.current) {
      return;
    }

    if (!peerId && !selectedContact) {
      addLog("No conversation selected");
      return;
    }

    const groupId = String(
      selectedContact?.groupId ??
        selectedContact?.conversationId ??
        peerId ??
        ""
    ).trim();

    if (!groupId) {
      addLog("No group id for sending");
      return;
    }

    const memberListId = selectedContact?.id
      ? String(selectedContact.id)
      : "";

    // Use the override message if provided, otherwise use the message prop
    // This ensures we get the exact message value without race conditions
    const messageToSend = messageOverride !== null ? messageOverride : message;

    // Check if message is empty (for text messages)
    if (
      !messageToSend ||
      (typeof messageToSend === "string" && messageToSend.trim() === "")
    ) {
      addLog("Message cannot be empty");
      return;
    }

    // Clear message immediately to prevent duplicate sends
    setMessage("");

    // Mark as sending to prevent duplicate calls
    isSendingRef.current = true;

    try {
      // Check if Agora connection is ready
      const isAgoraReady =
        clientRef.current &&
        (typeof (clientRef.current as unknown as { isOpened: () => boolean })
          .isOpened !== "function" ||
          (
            clientRef.current as unknown as { isOpened: () => boolean }
          ).isOpened());

      // If Agora is not ready, try sending via API as fallback
      if (!isAgoraReady) {
        const patientId = (memberListId || peerId || "").trim();
        if (!patientId) {
          addLog("No patient id for API send (targetUserId / receiverId)");
          setMessage(
            typeof messageToSend === "string"
              ? messageToSend
              : JSON.stringify(messageToSend as object)
          );
          isSendingRef.current = false;
          return;
        }

        // Prepare message for API (shape matches /api/chat/send-custom-message-to-group)
        let apiType = "text";
        let apiData: unknown;

        if (typeof messageToSend === "string") {
          try {
            const parsed = JSON.parse(messageToSend);
            if (parsed && typeof parsed === "object" && parsed.type) {
              apiType = parsed.type;
              apiData = parsed;
            } else {
              apiData = {
                message: messageToSend,
                type: "text",
              };
            }
          } catch {
            apiData = {
              message: messageToSend,
              type: "text",
            };
          }
        } else {
          apiType = (messageToSend as { type?: string }).type || "text";
          apiData = messageToSend;
        }

        const apiBody = {
          from: userId,
          groupId,
          targetUserId: patientId,
          receiverId: patientId,
          isFromUser: false,
          type: apiType,
          data: apiData,
        };

        try {
          const response = await fetch(config.api.customMessage, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(apiBody),
          });

          if (!response.ok) {
            throw new Error(`API send failed: ${response.status}`);
          }

          await response.json();

          // NOTE: Do NOT manually add message to logs here
          // The backend API sends the message through Agora SDK, which will trigger
          // the onCustomMessage/onTextMessage handler, which will add it to logs.
          // Manually adding it here causes duplicate messages in the chat.

          // Update conversation preview
          const preview = typeof messageToSend === "string" 
            ? messageToSend 
            : "Message";
          setConversations((prev) => {
            const existing = findContactForOutgoingListUpdate(
              prev,
              memberListId,
              groupId
            );
            if (!existing) return prev;
            const conversationId = existing.id;
            return prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessage: preview,
                    timestamp: new Date(),
                    lastMessageFrom: userId,
                  }
                : conv
            );
          });

          isSendingRef.current = false;
          return;
        } catch (apiError) {
          console.error("[handleSendMessage] API send failed:", apiError);
          addLog(`Send failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
          setMessage(
            typeof messageToSend === "string"
              ? messageToSend
              : JSON.stringify(messageToSend as object)
          ); // Restore message
          isSendingRef.current = false; // Reset flag on error
          return;
        }
      }

      // Handle both string and object messages
      let parsedPayload: { type?: string; [key: string]: unknown } | null =
        null;
      let isCustomMessage = false;
      let messageString = "";

      if (typeof messageToSend === "object") {
        // Already an object, use it directly
        parsedPayload = messageToSend as {
          type?: string;
          [key: string]: unknown;
        };
        messageString = JSON.stringify(messageToSend);
        if (
          parsedPayload &&
          typeof parsedPayload === "object" &&
          parsedPayload.type
        ) {
          isCustomMessage = true;
        }
      } else {
        // String message - try to parse as JSON
        messageString = messageToSend;
        try {
          parsedPayload = JSON.parse(messageToSend) as {
            type?: string;
            [key: string]: unknown;
          };
          if (
            parsedPayload &&
            typeof parsedPayload === "object" &&
            parsedPayload.type
          ) {
            isCustomMessage = true;
          }
        } catch {
          // Not JSON, treat as plain text
          isCustomMessage = false;
        }
      }

      // Prepare ext properties with sender info; receiverId = web panel patient id (same as targetUserId)
      const ALWAYS_SEND_PATIENT_ID = memberListId;
      const extProperties = {
        senderName: coachInfo.coachName || userId,
        senderProfile: coachInfo.profilePhoto || config.defaults.avatar,
        isFromUser: false,
        targetUserId: ALWAYS_SEND_PATIENT_ID,
        receiverId: ALWAYS_SEND_PATIENT_ID,
      };

      let options: {
        type: string;
        to: string;
        chatType: string;
        customEvent?: string;
        customExts?: unknown;
        msg?: string;
        ext?: typeof extProperties;
      };

      if (isCustomMessage && parsedPayload && parsedPayload.type) {
        // Build customExts based on message type
        const customExts = buildCustomExts(
          parsedPayload as { type: string; [key: string]: unknown }
        );

        if (!customExts) {
          addLog("Invalid custom message payload");
          setMessage(messageString); // Restore message
          isSendingRef.current = false; // Reset flag on error
          return;
        }

        // Default: send as Agora custom message (group id = Agora group target)
        options = {
          type: "custom",
          to: groupId,
          chatType: "groupChat",
          customEvent: "customEvent",
          customExts,
          ext: extProperties,
        };
      } else {
        // Plain text message (group)
        options = {
          chatType: "groupChat",
          type: "txt",
          to: groupId,
          msg: messageString,
          ext: extProperties,
        };
      }

      // Debug: inspect outgoing payload before it is sent to Agora
      console.log("[FPChat][TX]", {
        isCustomMessage,
        type: options.type,
        to: options.to,
        chatType: options.chatType,
        msg: (options as { msg?: string }).msg,
        customEvent: (options as { customEvent?: string }).customEvent,
        customExts: (options as { customExts?: unknown }).customExts,
        rawPayload: messageToSend,
      });

      // Create and send message
      // Note: Message roaming is enabled by default in Agora Chat SDK
      // Messages are automatically stored on the server for offline delivery
      // Ensure we don't set any options that would disable message roaming
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = AgoraChat.message.create(options as any);

      if (
        clientRef.current &&
        typeof (
          clientRef.current as unknown as {
            send: (msg: unknown) => Promise<void>;
          }
        ).send === "function"
      ) {
        const response = await (
          clientRef.current as unknown as {
            send: (msg: unknown) => Promise<{ serverMsgId?: string }>;
          }
        ).send(msg);

        // Capture serverMsgId from response for message editing
        const serverMsgId = (response as { serverMsgId?: string })?.serverMsgId;
        if (serverMsgId) {
          // Add serverMsgId to the log entry so it can be used when creating messages
          addLog({
            log: `You → group ${groupId}: ${messageString}`,
            timestamp: new Date(),
            serverMsgId: serverMsgId, // Store serverMsgId with the log
          });
        } else {
          // Fallback: add log without serverMsgId if not available
          // Log already added above with serverMsgId if available
        }
      } else {
        // If send failed, still add to log
        addLog(`You → group ${groupId}: ${messageString}`);
      }

      // Generate preview for conversation list
      let preview = messageString;
      if (isCustomMessage && parsedPayload) {
        const t = String(parsedPayload.type).toLowerCase();
        if (t === "image") preview = "Photo";
        else if (t === "file")
          preview = parsedPayload.fileName
            ? `📎 ${parsedPayload.fileName}`
            : "File";
        else if (t === "audio") preview = "Audio";
        else if (t === "meal_plan_updated" || t === "meal_plan_update")
          preview = "Meal plan updated";
        else if (
          t === "new_nutritionist" ||
          t === "new_nutrionist" ||
          t === "coach_assigned" ||
          t === "coach_details"
        )
          preview =
            (parsedPayload.title as string) ||
            (parsedPayload.name as string) ||
            "New nutritionist assigned";
        else if (t === "products" || t === "recommended_products")
          preview = "Products";
        else if (t === "call")
          preview = `${
            parsedPayload.callType === "video" ? "Video" : "Audio"
          } call`;
        else if (t === "general_notification" || t === "general-notification")
          preview = (parsedPayload.title as string) || "Notification";
        else if (t === "video_call")
          preview = (parsedPayload.title as string) || "Video call";
        else if (t === "voice_call")
          preview = (parsedPayload.title as string) || "Voice call";
        else if (t === "documents")
          preview = (parsedPayload.title as string) || "Document";
        else if (t === "call_scheduled") {
          const time = parsedPayload.time as number | undefined;
          if (time) {
            const scheduledDate = new Date(time * 1000); // Convert seconds to milliseconds
            // Import formatScheduledDate function
            const formatScheduledDate = (date: Date): string => {
              const day = date.getDate();
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const month = monthNames[date.getMonth()];
              let hours = date.getHours();
              const minutes = date.getMinutes();
              const ampm = hours >= 12 ? "pm" : "am";
              hours = hours % 12;
              hours = hours ? hours : 12; // the hour '0' should be '12'
              const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
              return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
            };
            preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
          } else {
            preview = "Call scheduled";
          }
        } else if (t === "scheduled_call_canceled")
          preview = "Scheduled call cancelled";
      }

      // Note: Log is already added above with serverMsgId if available from send response

      setConversations((prev) => {
        const existing = findContactForOutgoingListUpdate(
          prev,
          memberListId,
          groupId
        );
        if (!existing) return prev;
        const conversationId = existing.id;
        return prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: preview,
                timestamp: new Date(),
                lastMessageFrom: userId,
              }
            : conv
        );
      });

      // Force a small delay to ensure state update propagates
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Reset the flag after successful send
      isSendingRef.current = false;
    } catch (sendError) {
      console.error("Error sending message:", sendError);
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : (sendError as { code?: string; message?: string }).code ||
            (sendError as { code?: string; message?: string }).message ||
            String(sendError);
      addLog(`Send failed: ${errorMessage}`);
      setMessage(
        typeof messageToSend === "string"
          ? messageToSend
          : JSON.stringify(messageToSend as object)
      ); // Restore message on error
      isSendingRef.current = false; // Reset flag on error
    }
  };

  // #region agent log - Debug instrumentation for truncation issues
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const userDetailsPanelRef = useRef<HTMLDivElement>(null);
  // Note: layout measurement & debug effect removed to avoid hook/runtime issues during calls.
  // If needed later, reintroduce a minimal, side-effect-safe layout hook.
  // #endregion

  // Dedicated recording tab: ?url=…&type=video_call|voice_call (legacy window.open links)
  const recordingPlaybackFromQuery =
    typeof window !== "undefined" &&
    (() => {
      const p = new URLSearchParams(window.location.search);
      const raw = p.get("url");
      if (!raw?.trim()) return false;
      const t = p.get("type");
      if (
        t != null &&
        t !== "" &&
        t !== "video_call" &&
        t !== "voice_call"
      ) {
        return false;
      }
      return true;
    })();

  if (recordingPlaybackFromQuery) {
    return (
      <div className="fp-chat-wrapper">
        <div className="app-container">
          <FPRecordingPlayerPage />
        </div>
      </div>
    );
  }

  // Show call interface if there's an active call
  if (activeCall) {
    return (
      <div className="fp-chat-wrapper">
        <div className="app-container">
          <FPCallApp
            userId={activeCall.userId}
            peerId={activeCall.peerId}
            channel={activeCall.channel}
            isInitiator={activeCall.isInitiator}
            onEndCall={handleEndCall}
            isAudioCall={activeCall.callType === "audio"}
            chatClient={clientRef.current}
            localUserName={activeCall.localUserName}
            localUserPhoto={coachInfo.profilePhoto}
            peerName={activeCall.peerName}
            peerAvatar={activeCall.peerAvatar}
          />
        </div>
      </div>
    );
  }

  // After getDietitianToken: wait for Agora login (onConnected) before showing the chat UI
  const isChatConnecting =
    !!selectedContact && !!token && !isLoggedIn && !activeCall;

  return (
    <div className="fp-chat-wrapper">
      <div className="app-container">
        <div className="main-layout" ref={mainLayoutRef}>
          {/* Conversation List - show on desktop always, on mobile only when not showing chat */}
          <div
            className={`conversation-panel ${
              isMobileView && showChatOnMobile ? "mobile-hidden" : ""
            }`}
          >
            <FPConversationList
              conversations={conversations}
              selectedConversation={selectedContact}
              onSelectConversation={handleSelectConversation}
              userId={userId}
              onAddConversation={handleAddConversation}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
            />
          </div>
          {/* Chat Panel - show on desktop always, on mobile only when showing chat */}
          <div
            ref={chatPanelRef}
            className={`chat-panel ${
              isMobileView && !showChatOnMobile ? "mobile-hidden" : ""
            }`}
          >
            {isFetchingDietitianToken ? (
              <div className="chat-loading-container">
                <div className="chat-loading-spinner" />
                <div className="chat-loading-text">Loading conversation…</div>
              </div>
            ) : selectedContact ? (
              isChatConnecting ? (
                <div className="chat-loading-container">
                  <div className="chat-loading-spinner" />
                  <div className="chat-loading-text">Connecting to chat…</div>
                </div>
              ) : (
                <FPChatInterface
                  userId={userId}
                  peerId={peerId || null}
                  setPeerId={(id: string | null) => setPeerId(id || "")}
                  message={message}
                  setMessage={setMessage}
                  onSend={handleSendMessage}
                  onLogout={handleLogout}
                  logs={logs}
                  selectedContact={selectedContact}
                  chatClient={clientRef.current}
                  onBackToConversations={
                    isMobileView ? handleBackToConversations : null
                  }
                  onInitiateCall={handleInitiateCall}
                  onUpdateLastMessageFromHistory={updateLastMessageFromHistory}
                  coachInfo={coachInfo}
                  onSendProducts={handleSendProductSuggestions}
                  historyFetchEnabled={isLoggedIn}
                />
              )
            ) : (
              <div className="no-conversation-selected">
                <div className="empty-state">
                  <h2>No conversation selected</h2>
                  <p>Select a conversation from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
          {/* User Details Panel */}
          <div ref={userDetailsPanelRef} className="user-details-panel-wrapper">
          </div>
        </div>
      </div>
    </div>
  );
}

export default FPChatApp;
