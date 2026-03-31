import React, { useEffect, useState, useRef } from "react";
import "./FPChatApp.css";
import FPConversationList from "./components/FPConversationList.tsx";
import FPChatInterface from "./components/FPChatInterface.tsx";
import FPUserDetails from "./components/FPUserDetails.tsx";
import FPCallApp from "../fp-call/FPCallApp.tsx";
import AgoraChat from "agora-chat";
import type { MessageBody } from "agora-chat";
import { useChatClient } from "./hooks/useChatClient.ts";
import config from "../common/config.ts";
import { buildCustomExts } from "./utils/buildCustomExts.ts";
import { createMessageHandlers } from "./utils/messageHandlers.ts";
import { Contact, Message, CoachInfo, LogEntry, Product } from "../common/types/chat";
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
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
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
  // 🔹 Track if call end message has been sent to prevent duplicates
  const callEndMessageSentRef = useRef<boolean>(false);
  // 🔹 Track processed message IDs to avoid duplicates in polling
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // 🔹 Track last poll time to avoid too frequent polling (per-conversation)
  const lastPollTimeRef = useRef<number>(0);
  // 🔹 Track last global poll time separately to avoid conflicts
  const lastGlobalPollTimeRef = useRef<number>(0);
  // 🔹 Track logs in a ref so polling functions can access latest without triggering re-runs
  const logsRef = useRef<(string | LogEntry)[]>([]);
  // 🔹 Track registration promise to ensure login waits for it
  const registrationPromiseRef = useRef<Promise<boolean> | null>(null);

  const addLog = (log: string | LogEntry): void =>
    setLogs((prev) => {
      // Always add log entries, even if they're duplicates
      // This allows users to send the same message multiple times consecutively
      const newLogs = [...prev, log];
      logsRef.current = newLogs; // Update ref so polling functions can access latest without triggering re-runs
      return newLogs;
    });

  // Helper function to generate a new token
  const generateNewToken = async (): Promise<string | null> => {
    if (!userId) {
      addLog("Cannot renew token: No user ID");
      return null;
    }

    try {
      addLog(`Renewing chat token for ${userId}...`);
      const tokenResponse = await fetch(config.api.generateToken, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId,
          expireInSecs: config.token.expireInSecs,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Token generation failed: ${tokenResponse.status}`
        );
      }

      const tokenData = await tokenResponse.json();
      const newToken = tokenData.token;
      setToken(newToken); // Update token state
      addLog(`Chat token renewed successfully`);
      return newToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Token renewal failed: ${errorMessage}`);
      console.error("Token renewal error:", error);
      return null;
    }
  };

  // Create a ref to store clientRef for handlers
  const clientRefForHandlers = useRef<unknown>(null);

  // Handle incoming call - defined early so it can be used in handlers
  const handleIncomingCall = (callData: IncomingCall): void => {
    setIncomingCall(callData);
  };

  // // Handle presence status updates
  // const handlePresenceStatus = (presenceData: {
  //   userId: string;
  //   description: string;
  // }): void => {
  //   // Show notification when peer is waiting in call
  //   if (
  //     presenceData.description === "waiting" &&
  //     presenceData.userId === peerId
  //   ) {
  //     addLog(`🟡 ${presenceData.userId} is waiting for you in the call!`);
  //     // You can add a toast notification here if needed
  //   } else if (
  //     presenceData.description === "in_call" &&
  //     presenceData.userId === peerId
  //   ) {
  //     addLog(`🟢 ${presenceData.userId} joined the call`);
  //   }
  // };

  // Create handlers - they will use clientRefForHandlers.current
  const handlers = createMessageHandlers({
    userId,
    setIsLoggedIn,
    setIsLoggingIn: () => {}, // Not used in chat app, login handled by parent
    addLog,
    setConversations,
    generateNewToken,
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

  // Update logs ref whenever logs change
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    // peerId updated
  }, [peerId]);

  // Generate token automatically when userId is available (on mount)
  useEffect(() => {
    if (userId && !token && !isGeneratingToken) {
      generateToken().catch((error) => {
        console.error("[FPChatApp] Failed to auto-generate token:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId to run once on mount

  // Register current user with Agora before login (required for message roaming)
  useEffect(() => {
    const registerCurrentUser = async (): Promise<void> => {
      if (!userId || isLoggedIn) {
        return;
      }

      try {
        registrationPromiseRef.current = registerUser(userId);
        await registrationPromiseRef.current;
      } catch (error) {
        console.error("[FPChatApp] Error registering user:", error);
        // Don't block login if registration fails - user might already be registered
      }
    };

    registerCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoggedIn]);

  // Auto-login when userId and token are provided
  useEffect(() => {
    const attemptLogin = async (): Promise<void> => {
      if (!userId || !token || isLoggedIn || !clientRef.current) {
        return;
      }

      // Wait for registration to complete if in progress
      if (registrationPromiseRef.current) {
        try {
          await registrationPromiseRef.current;
        } catch {
          // Continue even if registration failed (user might already exist)
        }
      }

      // Automatically login with the provided token
      if (
        typeof (
          clientRef.current as unknown as {
            open: (options: { user: string; accessToken: string }) => Promise<void> | void;
          }
        ).open === "function"
      ) {
        try {
          // Use original userId - Agora Chat SDK handles multi-session natively
          const loginPromise = (
            clientRef.current as unknown as {
              open: (options: { user: string; accessToken: string }) => Promise<void> | void;
            }
          ).open({ user: userId, accessToken: token });
          
          // Handle promise if open returns one
          if (loginPromise && typeof loginPromise.then === "function") {
            loginPromise
              .then(() => {
                // Login successful
              })
              .catch((error) => {
                console.error("[FPChatApp] Login promise rejected:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                addLog(`Login failed: ${errorMessage}`);
                
                // If login fails with 401, try to regenerate token
                if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("token")) {
                  generateToken().catch((genError) => {
                    console.error("[FPChatApp] Failed to regenerate token:", genError);
                  });
                }
              });
          }
        } catch (error) {
          console.error("[FPChatApp] Error during login:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`Login error: ${errorMessage}`);
          
          // If login fails with 401, try to regenerate token
          if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("token")) {
            generateToken().catch((genError) => {
              console.error("[FPChatApp] Failed to regenerate token:", genError);
            });
          }
        }
      } else {
        // Client open method not available
      }
    };

    attemptLogin();
  }, [userId, token, isLoggedIn, clientRef]);

  // Internal function to generate token for the coach
  const generateToken = async (): Promise<string | null> => {
    setIsGeneratingToken(true);
    try {
      addLog(`Generating chat token for ${userId}...`);
      const tokenResponse = await fetch(config.api.generateToken, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId,
          expireInSecs: config.token.expireInSecs,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Token generation failed: ${tokenResponse.status}`;
        console.error("❌ [generateToken] Token generation failed:", {
          status: tokenResponse.status,
          error: errorMessage,
          userId,
        });
        addLog(`Token generation failed: ${errorMessage}`);
        setIsGeneratingToken(false);
        return null;
      }

      const tokenData = await tokenResponse.json();
      const newToken = tokenData.token;
      if (!newToken) {
        console.error("❌ [generateToken] No token in response:", tokenData);
        addLog("Token generation failed: No token in response");
        setIsGeneratingToken(false);
        return null;
      }
      
      setToken(newToken);
      addLog(`Chat token generated successfully`);
      setIsGeneratingToken(false);
      return newToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ [generateToken] Token generation error:", {
        error: errorMessage,
        userId,
      });
      addLog(`Token generation failed: ${errorMessage}`);
      console.error("Token generation error:", error);
      setIsGeneratingToken(false);
      return null;
    }
  };

  // Helper function to ensure token exists before connecting
  const ensureToken = async (): Promise<string | null> => {
    if (token) {
      return token;
    }

    // Generate token internally
    return await generateToken();
  };

  const getRandomProducts = (count: number): Product[] => {
    const shuffled = [...PRODUCT_SUGGESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const handleSendProductSuggestions = async (): Promise<void> => {
    if (!peerId || !userId) {
      addLog("Select a conversation before sending product suggestions.");
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
        to: peerId,
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
            lastMessage?: string | object;
            lastMessageTime?: string | Date;
            lastMessageSender?: string | number;
            conversationId?: string;
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
              lastMessage?: string | object;
              lastMessageTime?: string | Date;
              lastMessageSender?: string | number;
              conversationId?: string;
              messageCount?: number;
              unreadCount?: number;
              filterState?: string;
              createdAt?: string | Date;
            }) => {
              // Generate preview from lastMessage (handles both string and object formats)
              const lastMessage = generatePreviewFromLastMessage(
                conv.lastMessage
              );

              const conversationId = String(conv.userId);
              const normalizedConversationId = normalizeId(conversationId);
              const existingTimestamp = existingTimestamps.get(
                normalizedConversationId
              );
              const apiTimestamp = conv.lastMessageTime
                ? new Date(conv.lastMessageTime)
                : null;
              const createdAtTimestamp = conv.createdAt
                ? new Date(conv.createdAt)
                : null;

              const pickValidDate = (
                ...candidates: Array<Date | null | undefined>
              ) => {
                for (const candidate of candidates) {
                  if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
                    return candidate;
                  }
                }
                return null;
              };

              const timestamp = pickValidDate(
                apiTimestamp,
                createdAtTimestamp,
                existingTimestamp instanceof Date ? existingTimestamp : existingTimestamp ? new Date(existingTimestamp) : null
              );

              return {
                id: conversationId, // Use userId as Agora ID (string)
                name: conv.userName || `User ${conv.userId}`,
                avatar: conv.userPhoto || config.defaults.avatar,
                lastMessage: lastMessage ?? undefined, // Convert null to undefined
                timestamp: timestamp,
                lastMessageFrom: conv.lastMessageSender
                  ? String(conv.lastMessageSender)
                  : null,
                // Store additional API data for reference
                conversationId: conv.conversationId,
                messageCount: conv.messageCount || 0,
                unreadCount: conv.unreadCount || 0,
                filterState: conv.filterState,
                createdAt: conv.createdAt ? new Date(conv.createdAt) : undefined, // Chat initiation date/time
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
  }, [isLoggedIn, userId, filterType, sortOrder, onConversationChange]); // Removed selectedContact to prevent re-fetch on selection

  // Poll for recent messages to catch backend-sent messages that might not trigger handlers
  useEffect(() => {
    if (!peerId || !clientRef.current || !isLoggedIn) {
      return;
    }

    const POLL_INTERVAL = 3000; // Poll every 3 seconds
    const MIN_POLL_INTERVAL = 1000; // Minimum 1 second between polls

    const pollForMessages = async (): Promise<void> => {
      const now = Date.now();
      // Throttle polling to avoid too frequent requests
      if (now - lastPollTimeRef.current < MIN_POLL_INTERVAL) {
        return;
      }
      lastPollTimeRef.current = now;

      try {
        const targetId = peerId.startsWith("user_")
          ? peerId.replace("user_", "")
          : peerId;

        const client = clientRef.current as {
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

        if (!client.getHistoryMessages) {
          return;
        }

        // Fetch only the most recent message to check for new ones
        const result = await client.getHistoryMessages({
          targetId,
          chatType: "singleChat",
          pageSize: 1,
          searchDirection: "up",
        });

        const messages = (result?.messages || []) as Array<{
          id?: string;
          mid?: string;
          from?: string;
          to?: string;
          time?: number;
          type?: string;
          msg?: string;
          customExts?: unknown;
          "v2:customExts"?: unknown;
          body?: unknown;
          ext?: unknown;
        }>;

        if (messages.length > 0) {
          const latestMessage = messages[0];
          const messageId =
            latestMessage.id ||
            latestMessage.mid ||
            `${latestMessage.from}-${latestMessage.time}`;

          // Check if we've already processed this message
          if (!processedMessageIdsRef.current.has(messageId)) {
            processedMessageIdsRef.current.add(messageId);

            // Check if this message is already in logs (use ref to get latest without triggering re-runs)
            const messageInLogs = logsRef.current.some((log) => {
              if (typeof log === "string") {
                return log.includes(messageId);
              }
              return log.serverMsgId === messageId;
            });

            if (!messageInLogs) {
              // This is a new message that wasn't caught by handlers
              // Process it through the handlers manually

              // Trigger the appropriate handler based on message type
              if (latestMessage.type === "custom" && handlers.onCustomMessage) {
                handlers.onCustomMessage(latestMessage as MessageBody);
              } else if (
                latestMessage.type === "txt" &&
                handlers.onTextMessage
              ) {
                handlers.onTextMessage(latestMessage as MessageBody);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error polling for messages:", error);
      }
    };

    // Poll immediately, then set up interval
    pollForMessages();
    const intervalId = setInterval(pollForMessages, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, isLoggedIn, clientRef]); // Removed logs.length - it was causing constant re-runs

  // Global message polling for all conversations (not just active one)
  // This ensures messages are received even when not actively viewing a conversation
  useEffect(() => {
    return;
    if (!isLoggedIn || !clientRef.current || conversations.length === 0) {
      return;
    }

    const GLOBAL_POLL_INTERVAL = 10000; // Poll every 10 seconds for all conversations
    const MIN_GLOBAL_POLL_INTERVAL = 2000; // Minimum 2 seconds between global polls
    const DELAY_BETWEEN_REQUESTS = 50; // 50ms delay between each conversation request to space them out

    const pollAllConversations = async (): Promise<void> => {
      const now = Date.now();
      // Throttle global polling separately from per-conversation polling
      if (now - lastGlobalPollTimeRef.current < MIN_GLOBAL_POLL_INTERVAL) {
        return;
      }
      lastGlobalPollTimeRef.current = now;

      try {
        const client = clientRef.current as {
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

        if (!client.getHistoryMessages) {
          return;
        }

        // Get the active peerId to skip it (it's already being polled every 3 seconds)
        const activePeerId = peerId.startsWith("user_")
          ? peerId.replace("user_", "")
          : peerId;

        // Poll all conversations for new messages (except the active one)
        let requestCount = 0;
        for (const conversation of conversations) {
          const targetId = conversation.id.startsWith("user_")
            ? conversation.id.replace("user_", "")
            : conversation.id;

          // Skip the active conversation - it's already being polled every 3 seconds
          if (targetId === activePeerId) {
            continue;
          }

          // Add a small delay between requests to space them out (except for the first one)
          if (requestCount > 0) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
          }
          requestCount++;

          try {
            const result = await client.getHistoryMessages({
              targetId,
              chatType: "singleChat",
              pageSize: 1,
              searchDirection: "up",
            });

            const messages = (result?.messages || []) as Array<{
              id?: string;
              mid?: string;
              from?: string;
              to?: string;
              time?: number;
              type?: string;
              msg?: string;
              customExts?: unknown;
              "v2:customExts"?: unknown;
              body?: unknown;
              ext?: unknown;
            }>;

            if (messages.length > 0) {
              const latestMessage = messages[0];
              const messageId =
                latestMessage.id ||
                latestMessage.mid ||
                `${latestMessage.from}-${latestMessage.time}`;

              // Check if we've already processed this message
              if (!processedMessageIdsRef.current.has(messageId)) {
                processedMessageIdsRef.current.add(messageId);

                // Check if this message is already in logs (use ref to get latest without triggering re-runs)
                const messageInLogs = logsRef.current.some((log) => {
                  if (typeof log === "string") {
                    return log.includes(messageId);
                  }
                  return log.serverMsgId === messageId;
                });

                if (!messageInLogs) {

                  // Trigger the appropriate handler
                  if (latestMessage.type === "custom" && handlers.onCustomMessage) {
                    handlers.onCustomMessage(latestMessage as MessageBody);
                  } else if (
                    latestMessage.type === "txt" &&
                    handlers.onTextMessage
                  ) {
                    handlers.onTextMessage(latestMessage as MessageBody);
                  }
                }
              }
            }
          } catch (error) {
            console.error(
              `❌ [Global Polling] Error polling conversation ${conversation.id}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("❌ [Global Polling] Error in global polling:", error);
      }
    };

    // Poll immediately, then set up interval
    pollAllConversations();
    const intervalId = setInterval(pollAllConversations, GLOBAL_POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, clientRef, conversations, peerId]); // Include peerId to skip active conversation in global polling

  // Register a user with Agora (called when selecting a user)
  const registerUser = async (username: string): Promise<boolean> => {
    try {
      const endpoint = config.api.registerUserEndpoint;
      const requestBody = { username: username };

      // console.log("🔵 [REGISTER API] Calling registration API:", {
      //   endpoint,
      //   method: "POST",
      //   body: requestBody,
      //   timestamp: new Date().toISOString(),
      // });

      addLog(`Registering user ${username}...`);

      const registerResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // console.log("🟢 [REGISTER API] Response received:", {
      //   status: registerResponse.status,
      //   statusText: registerResponse.statusText,
      //   ok: registerResponse.ok,
      //   url: registerResponse.url,
      // });

      if (registerResponse.ok) {
        // const responseData = await registerResponse.json().catch(() => ({}));
        // console.log("✅ [REGISTER API] Registration successful:", responseData);
        await registerResponse.json().catch(() => ({})); // Consume response body
        addLog(`User ${username} registered successfully`);
        return true;
      } else {
        // User might already be registered
        const errorData = await registerResponse.json().catch(() => ({}));
        // console.log("⚠️ [REGISTER API] Registration response (not ok):", {
        //   status: registerResponse.status,
        //   errorData,
        // });

        // Check if user already exists by status code OR error message
        const errorMessage = errorData.message || errorData.error || '';
        const isDuplicateUser = 
          registerResponse.status === 400 ||
          registerResponse.status === 409 ||
          errorMessage.includes('duplicate_unique_property_exists') ||
          errorMessage.includes('DuplicateUniquePropertyExistsException') ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('duplicate');

        if (isDuplicateUser) {
          // console.log("ℹ️ [REGISTER API] User already exists, proceeding...");
          addLog(`User ${username} already exists, proceeding...`);
          return true; // User exists, can proceed
        } else {
          // console.warn("❌ [REGISTER API] Registration failed:", {
          //   status: registerResponse.status,
          //   error: errorData.error || registerResponse.status,
          // });
          addLog(
            `Registration warning: ${
              errorData.error || registerResponse.status
            }`
          );
          return false;
        }
      }
    } catch (registerError) {
      const errorMessage =
        registerError instanceof Error
          ? registerError.message
          : String(registerError);
      // console.error("❌ [REGISTER API] Registration error:", registerError);
      addLog(`Registration error: ${errorMessage}`);
      return false;
    }
  };

  const handleLogout = (): void => {
    if (
      clientRef.current &&
      typeof (clientRef.current as { close: () => void }).close === "function"
    ) {
      (clientRef.current as { close: () => void }).close();
    }
    setIsLoggedIn(false);
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

  const handleSelectContact = async (contact: Contact): Promise<void> => {
    // console.log("👤 [USER SELECTION] User selected:", {
    //   contactId: contact.id,
    //   contactName: contact.name,
    //   timestamp: new Date().toISOString(),
    // });

    // Generate token if not already available
    if (!token && !isLoggedIn) {
      const newToken = await ensureToken(); 
      if (!newToken) {
        addLog("Failed to generate token. Cannot connect to chat.");
        return;
      }
    }

    // Don't allow selecting blocked UIDs (Recorder and RTST Agent) as a contact
    const contactId = String(contact.id);
    if (contactId === "999999999" || contactId === "999999998") {
      return;
    }

    // No need to register the contact - they should already be registered in Agora
    // Only the current user (userId) needs to be registered, which happens on app load
    setSelectedContact(contact);
    setPeerId(contact.id);
    // setPeerId("1941");
    handleConversationChange(contact);
    // Update conversation in list or add if new (don't update timestamp on selection)
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === contact.id);
      if (existing) {
        return prev.map((c) =>
          c.id === contact.id ? { ...c, ...contact } : c
        );
      }
      return [
        ...prev,
        {
          ...contact,
          lastMessage: "",
          timestamp: new Date(),
          avatar:
            contact.avatar ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
        },
      ];
    });
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
    await handleSelectContact(conversation);
    // On mobile, show chat view when conversation is selected
    if (isMobileView) {
      setShowChatOnMobile(true);
    }
  };

  const handleBackToConversations = (): void => {
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
    if (!peerId || !userId) {
      addLog("Cannot initiate call: Missing user or peer ID");
      return;
    }

    // Generate channel name using format: fp_rtc_call_CALLTYPE_USERID_DIETITIANID
    // CALLTYPE => video or voice
    // USERID => userId (the user's ID)
    // DIETITIANID => peerId (the dietitian/coach ID)
    const callTypeStr = callType === "video" ? "video" : "voice";
    const channel = `fp_rtc_call_${callTypeStr}_${peerId}_${userId}`;

    // Reset call end message sent flag for new call
    callEndMessageSentRef.current = false;

    // DO NOT send initiate message - only send end message with duration
    // Removed: await handleSendMessage(callMessage);

    // Ensure message is cleared
    setMessage("");

    // Set active call state
    setActiveCall({
      userId,
      peerId,
      channel,
      isInitiator: true,
      callType: callType,
      localUserName: coachInfo.coachName || userId, // Use coachName from coachInfo
      peerName: selectedContact?.name || peerId,
      peerAvatar: selectedContact?.avatar,
    });

    addLog(`Initiating ${callType} call with ${peerId}`);
  };

  // Handle accept call
  // @ts-expect-error - May be used in future for incoming call handling
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

  // function formatDurationFromSeconds(totalSeconds: number): string {
  //   const hours = Math.floor(totalSeconds / 3600);
  //   const minutes = Math.floor((totalSeconds % 3600) / 60);
  //   const seconds = totalSeconds % 60;

  //   const parts = [];

  //   if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  //   if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? "s" : ""}`);
  //   if (seconds > 0 || parts.length === 0)
  //     parts.push(`${seconds} sec${seconds > 1 ? "s" : ""}`);

  //   return parts.join(" ");
  // }

  // Handle reject call
  // @ts-expect-error - May be used in future for incoming call handling
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

    // const bothUsersConnected = callInfo.bothUsersConnected === true;

    // // Calculate duration - use provided duration or calculate from timestamps
    // let duration = callInfo.duration || 0;
    // if (duration <= 0 && callInfo.callStartTime && callInfo.callEndTime) {
    //   duration = Math.floor(
    //     (callInfo.callEndTime - callInfo.callStartTime) / 1000
    //   );
    // }

    // Ensure duration is at least 0 (not negative)
    // duration = Math.max(0, duration);

    // if (!bothUsersConnected || duration <= 0) {
    //   console.log("📞 Call End Message - NOT sending (conditions not met):", {
    //     bothUsersConnected,
    //     duration,
    //   });
    //   addLog(
    //     "Call ended without other user joining. Not sending call summary to backend."
    //   );
    //   setActiveCall(null);
    //   setIncomingCall(null);
    //   setMessage("");
    //   return;
    // }

    // try {
    // // Determine message type and title based on call type
    // const isVideoCall = activeCall.callType === "video";
    // const messageType = isVideoCall ? "video_call" : "voice_call";
    // const callTitle = isVideoCall ? "Video call" : "Voice call";

    // // Send call end message with duration
    // const payload = {
    //   title: callTitle,
    //   description: `${formatDurationFromSeconds(duration)}`,
    //   icons_details: {
    //     left_icon: "",
    //     right_icon: "",
    //   },
    //   call_details: {
    //     call_url: "",
    //   },
    //   redirection_details: [],
    // };

    // const body = {
    //   from: userId,
    //   to: peerId,
    //   type: messageType,
    //   data: payload,
    // };

    // try {
    //   const response = await axios.post(config.api.customMessage, body);
    //   console.log(`${callTitle} message sent successfully:`, response.data);

    //   // Mark call end message as sent to prevent duplicates
    //   callEndMessageSentRef.current = true;

    //   // Add message directly to logs for real-time display
    //   if (addLog) {
    //     const messageToLog = JSON.stringify({
    //       type: messageType,
    //       ...payload,
    //     });
    //     addLog({
    //       log: `You → ${peerId}: ${messageToLog}`,
    //       timestamp: new Date(),
    //     });
    //   }
    // } catch (error) {
    //   console.error(
    //     `Error sending ${callTitle.toLowerCase()} message:`,
    //     error
    //   );
    // }

    // addLog(`${callTitle} ended. Duration: ${duration}s`);
    // } catch (error) {
    //   console.error("Error sending call end message:", error);
    //   const errorMessage =
    //     error instanceof Error ? error.message : String(error);
    //   addLog(`Failed to send call end message: ${errorMessage}`);
    //   // Reset flag on error so it can be retried if needed
    //   callEndMessageSentRef.current = false;
    // }

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
    formattedMsg: Message
  ): void => {
    if (!peerId || !formattedMsg) return;

    const preview = generatePreviewFromMessage(formattedMsg);
    const timestamp = formattedMsg.createdAt
      ? new Date(formattedMsg.createdAt)
      : new Date();
    const lastMessageFrom = formattedMsg.sender || peerId;

    // Normalize: try both with and without user_ prefix
    const normalizedPeerId = peerId.startsWith("user_")
      ? peerId
      : `user_${peerId}`;
    const normalizedPeerIdWithoutPrefix = peerId.startsWith("user_")
      ? peerId.replace("user_", "")
      : peerId;

    setConversations((prev) => {
      // Find conversation by matching either format
      const existing = prev.find(
        (c) =>
          c.id === peerId ||
          c.id === normalizedPeerId ||
          c.id === normalizedPeerIdWithoutPrefix ||
          c.id === `user_${normalizedPeerIdWithoutPrefix}`
      );

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
        // or if there's no existing last message
        const existingTimestamp = existing.timestamp
          ? new Date(existing.timestamp)
          : null;
        const shouldUpdate =
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

    if (!peerId) {
      addLog("No recipient selected");
      return;
    }

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
        
        // Prepare message for API
        // Handle both string and object messages
        let apiBody: { from: string; to: string; type: string; data?: unknown } = {
          from: userId,
          to: peerId,
          type: "text",
        };

        if (typeof messageToSend === "string") {
          // Try to parse as JSON to check if it's a custom message
          try {
            const parsed = JSON.parse(messageToSend);
            if (parsed && typeof parsed === "object" && parsed.type) {
              // Custom message - use the parsed type and data
              apiBody.type = parsed.type;
              apiBody.data = parsed;
            } else {
              // Plain text message - use text type with message in data
              apiBody.type = "text";
              apiBody.data = {
                message: messageToSend,
                type: "text",
              };
            }
          } catch {
            // Plain text message - not JSON
            apiBody.type = "text";
            apiBody.data = {
              message: messageToSend,
              type: "text",
            };
          }
        } else {
          // Object message - treat as custom
          apiBody.type = (messageToSend as { type?: string }).type || "text";
          apiBody.data = messageToSend;
        }

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
            const existing = prev.find((c) => c.id === peerId);
            if (existing) {
              return prev.map((conv) =>
                conv.id === peerId
                  ? {
                      ...conv,
                      lastMessage: preview,
                      timestamp: new Date(),
                      lastMessageFrom: userId,
                    }
                  : conv
              );
            }
            return prev;
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

      // Prepare ext properties with sender info
      const extProperties = {
        senderName: coachInfo.coachName || userId,
        senderProfile: coachInfo.profilePhoto || config.defaults.avatar,
        isFromUser: false,
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

        // Default: send as Agora custom message
        options = {
          type: "custom",
          to: peerId,
          chatType: "singleChat",
          customEvent: "customEvent",
          customExts,
          ext: extProperties,
        };
      } else {
        // Plain text message
        options = {
          chatType: "singleChat",
          type: "txt",
          to: peerId,
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
            log: `You → ${peerId}: ${messageString}`,
            timestamp: new Date(),
            serverMsgId: serverMsgId, // Store serverMsgId with the log
          });
        } else {
          // Fallback: add log without serverMsgId if not available
          // Log already added above with serverMsgId if available
        }
      } else {
        // If send failed, still add to log
        addLog(`You → ${peerId}: ${messageString}`);
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

      // Update conversation with last message - normalize conversation ID matching
      // Normalize: try both with and without user_ prefix
      const normalizedPeerId = peerId.startsWith("user_")
        ? peerId
        : `user_${peerId}`;
      const normalizedPeerIdWithoutPrefix = peerId.startsWith("user_")
        ? peerId.replace("user_", "")
        : peerId;


      setConversations((prev) => {
        // Find conversation by matching either format
        const existing = prev.find(
          (c) =>
            c.id === peerId ||
            c.id === normalizedPeerId ||
            c.id === normalizedPeerIdWithoutPrefix ||
            c.id === `user_${normalizedPeerIdWithoutPrefix}`
        );


        if (existing) {
          // Use the existing conversation ID format
          const conversationId = existing.id;
          const updated = prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: preview,
                  timestamp: new Date(),
                  lastMessageFrom: userId, // Current user sent the last message
                }
              : conv
          );
          return updated;
        }
        // If conversation doesn't exist, create it (shouldn't happen, but handle gracefully)
        return prev;
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

  // Show call interface if there's an active call
  if (activeCall) {
    return (
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
    );
  }

  // Determine if chat interface should show loading state
  // Only show loading when actively generating token
  // Allow chat to show even if not fully logged in (messages can be fetched from API)
  // The login will happen in the background via the useEffect
  const isChatConnecting = isGeneratingToken;

  return (
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
          {selectedContact ? (
            isChatConnecting ? (
              <div className="chat-loading-container">
                <div className="chat-loading-spinner" />
                <div className="chat-loading-text">
                  {isGeneratingToken
                    ? "Generating token..."
                    : "Connecting to chat..."}
                </div>
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
          {/* <FPUserDetails
            selectedContact={selectedContact}
            userId={userId}
            peerId={peerId}
            onSend={handleSendMessage}
            addLog={addLog}
          /> */}
        </div>
      </div>
    </div>
  );
}

export default FPChatApp;

/*
 for presence:
  const Presenceoptions = {
        description: "in_call",
        userId: 444,
      };

      clientRef.current
        .publishPresence(Presenceoptions)
        .then((res) => {
          console.log("prseence msg sent");
          console.log(res);
        })
        .catch((e) => {
          console.log("err: ", e);
        });
*/
