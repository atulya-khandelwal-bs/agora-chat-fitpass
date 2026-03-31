/**
 * Message event handlers for Agora Chat SDK
 * Handles incoming text messages, custom messages, and connection events
 */

import config from "../../common/config.ts";
import { Contact, LogEntry } from "../../common/types/chat";
import type { MessageBody } from "agora-chat";
import React from "react";
import { isBlockedUID } from "./blockedUIDs";

interface IncomingCall {
  from: string;
  channel: string;
  callId?: string;
  callType?: "video" | "audio";
}

interface MessageHandlersOptions {
  userId: string;
  setIsLoggedIn: (value: boolean) => void;
  setIsLoggingIn: (value: boolean) => void;
  addLog: (log: string | LogEntry) => void;
  setConversations: React.Dispatch<React.SetStateAction<Contact[]>>;
  generateNewToken: () => Promise<string | null>;
  handleIncomingCall: (callData: IncomingCall) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
  clientRef: React.RefObject<unknown> | (() => unknown) | { current?: unknown };
}

/**
 * Format date as "11 Aug 10:00 am" (no seconds, with AM/PM)
 */

export function formatScheduledDate(date: Date): string {
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
}

/**
 * Creates message event handlers for the chat client
 */
export function createMessageHandlers({
  userId,
  setIsLoggedIn,
  setIsLoggingIn,
  addLog,
  setConversations,
  generateNewToken,
  handleIncomingCall,
  onPresenceStatus,
  clientRef,
}: MessageHandlersOptions): {
  onConnected: () => void;
  onDisconnected: () => void;
  onTextMessage: (msg: MessageBody) => void;
  onCustomMessage: (msg: MessageBody) => void;
  onTokenWillExpire: () => Promise<void>;
  onTokenExpired: () => Promise<void>;
  onError: (e: { message: string }) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
} {
  // Helper to get the actual client ref
  const getClientRef = (): unknown => {
    if (typeof clientRef === "function") {
      return clientRef();
    }
    if (clientRef && typeof clientRef === "object" && "current" in clientRef) {
      return (clientRef as { current?: unknown }).current;
    }
    return clientRef;
  };

  // Helper function to fetch user details and update conversation
  const fetchAndUpdateUserDetails = async (
    conversationId: string,
    userIdWithoutPrefix: string
  ): Promise<void> => {
    console.log('[fetchAndUpdateUserDetails] Starting fetch for:', { conversationId, userIdWithoutPrefix });
    try {
      // Strip "user_" prefix if present for API call
      const cleanId = userIdWithoutPrefix.startsWith("user_")
        ? userIdWithoutPrefix.replace("user_", "")
        : userIdWithoutPrefix;

      const response = await fetch(`/fitpass-users/${cleanId}/panel-data`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const userName = data.userData?.user_name || null;
      const userPhoto = data.userData?.user_photo || data.userData?.photo_url || null;

      console.log('[fetchAndUpdateUserDetails] User data received:', { userName, hasPhoto: !!userPhoto });

      if (userName || userPhoto) {
        setConversations((prev) => {
          return prev.map((conv) => {
            // Match by either format (with or without user_ prefix)
            if (
              conv.id === conversationId ||
              conv.id === cleanId ||
              conv.id === `user_${cleanId}` ||
              (conversationId.startsWith("user_") && conv.id === conversationId.replace("user_", "")) ||
              (!conversationId.startsWith("user_") && conv.id === `user_${conversationId}`)
            ) {
              console.log('[fetchAndUpdateUserDetails] Updating conversation:', { 
                oldName: conv.name, 
                newName: userName || conv.name,
                oldAvatar: conv.avatar,
                newAvatar: userPhoto || conv.avatar 
              });
              return {
                ...conv,
                name: userName || conv.name,
                avatar: userPhoto || conv.avatar || config.defaults.avatar,
              };
            }
            return conv;
          });
        });
      } else {
        console.log('[fetchAndUpdateUserDetails] No user name or photo found in response');
      }
    } catch (error) {
      console.error('[fetchAndUpdateUserDetails] Error:', error);
    }
  };

  return {
    onConnected: () => {
      setIsLoggedIn(true);
      setIsLoggingIn(false);
      addLog(`User ${userId} connected`);
    },
    onDisconnected: () => {
      setIsLoggedIn(false);
      addLog("Disconnected");
    },
    onTextMessage: (msg: MessageBody) => {
      // Debug: inspect incoming text messages in browser console
      console.log("[FPChat][RX][text]", {
        from: msg.from,
        to: msg.to,
        type: msg.type,
        msg: (msg as { msg?: unknown }).msg,
        raw: msg,
      });
      // Ignore messages from blocked UIDs (Recorder and RTST Agent)
      const fromId = msg.from || "";
      if (isBlockedUID(fromId)) {
        return;
      }

      // Check if this is actually a custom message (Agora might deliver custom as text)
      if (msg.type === "custom") {
        // Handle as custom message
        let preview = "Attachment";
        let messageContent = "";

        try {
          // First check customExts (standard Agora Chat format)
          let paramsData = null;
          if (msg.customExts && typeof msg.customExts === "object") {
            paramsData = msg.customExts;
          } else if (
            msg["v2:customExts"] &&
            typeof msg["v2:customExts"] === "object"
          ) {
            paramsData = msg["v2:customExts"];
          } else if (msg.body && typeof msg.body === "object") {
            const bodyObj = msg.body as {
              customExts?: unknown;
              "v2:customExts"?: unknown;
              messageType?: string;
              payload?: unknown;
            };
            // Check for API format first (messageType + payload)
            if (bodyObj.messageType && bodyObj.payload) {
              paramsData = {
                messageType: bodyObj.messageType,
                payload: bodyObj.payload,
              };
              console.log("Found API format in msg.body:", paramsData);
            } else if (bodyObj.customExts) {
              paramsData = bodyObj.customExts;
            } else if (bodyObj["v2:customExts"]) {
              paramsData = bodyObj["v2:customExts"];
            }
          } else if (msg.params) {
            paramsData =
              typeof msg.params === "string"
                ? JSON.parse(msg.params)
                : msg.params;
            console.log(
              "Extracted from msg.params:",
              JSON.stringify(paramsData, null, 2)
            );
          }

          // Normalize the message structure for UI parsing (same as onCustomMessage)
          let normalizedData = paramsData;

          // Handle case where customExts has a stringified 'data' field (e.g., from backend API)
          // Example: { type: 'call_scheduled', data: '{"time":"1765953010","type":"call_scheduled"}' }
          if (
            paramsData &&
            typeof paramsData === "object" &&
            "data" in paramsData &&
            typeof paramsData.data === "string"
          ) {
            try {
              const parsedData = JSON.parse(paramsData.data);
              // Merge parsed data with the outer object, preserving type from outer if not in parsed
              normalizedData = {
                ...parsedData,
                type: parsedData.type || (paramsData as { type?: string }).type,
              };
              // Parsed stringified data field
            } catch (parseError) {
              // Failed to parse data field
              // Fall through to other normalization logic
            }
          }
          // Handle API format with messageType and payload
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "messageType" in paramsData &&
            "payload" in paramsData
          ) {
            normalizedData = {
              ...(paramsData.payload as object),
              type: paramsData.messageType,
            };
          }
          // Handle API format with just payload
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "payload" in paramsData &&
            !("type" in paramsData) &&
            msg.type
          ) {
            normalizedData = {
              ...(paramsData.payload as object),
              type: msg.type,
            };
          }
          // If paramsData has action_type but no type, use action_type as type
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "action_type" in paramsData &&
            !("type" in paramsData)
          ) {
            normalizedData = {
              ...paramsData,
              type: paramsData.action_type,
            };
          }

          if (
            normalizedData &&
            typeof normalizedData === "object" &&
            Object.keys(normalizedData).length > 0 &&
            ("type" in normalizedData || "action_type" in normalizedData)
          ) {
            const paramsObj = normalizedData as {
              type?: string;
              action_type?: string;
              fileName?: string;
              title?: string;
            };
            const t = String(
              paramsObj.type || paramsObj.action_type || ""
            ).toLowerCase();
            if (t === "image") preview = "Photo";
            else if (t === "file")
              preview = paramsObj.fileName
                ? `📎 ${paramsObj.fileName}`
                : "File";
            else if (t === "audio") preview = "Audio";
            else if (t === "coach_assigned" || t === "coach_details")
              preview = paramsObj.title || "New nutritionist assigned";
            else if (t === "meal_plan_updated" || t === "meal_plan_update")
              preview = "Meal plan updated";
            else if (t === "products" || t === "recommended_products")
              preview = "Products";
            else if (
              t === "general_notification" ||
              t === "general-notification"
            )
              preview = paramsObj.title || "Notification";
            else if (
              t === "video_call" ||
              t === "voice_call" ||
              t === "documents"
            )
              preview = paramsObj.title || "Message";
            else if (t === "call_scheduled") {
              const time = (paramsObj as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
              } else {
                preview = "Call scheduled";
              }
            } else if (t === "scheduled_call_canceled")
              preview = "Scheduled call cancelled";

            // Ensure the logged message has 'type' field for UI parsing
            messageContent = JSON.stringify(normalizedData);
          } else {
            messageContent = JSON.stringify(normalizedData || {});
          }
        } catch {
          messageContent = JSON.stringify(
            msg.customExts || msg["v2:customExts"] || msg.params || {}
          );
        }

        // Use object format with actual msg.time for correct ordering
        const msgTime = (msg as { time?: number }).time;
        addLog({
          log: `${msg.from}: ${messageContent}`,
          timestamp: msgTime ? new Date(msgTime) : new Date(),
          serverMsgId:
            (msg as { id?: string; mid?: string }).id ||
            (msg as { id?: string; mid?: string }).mid,
        });

        // Update conversation - normalize conversation ID matching
        // For self-sent messages, update conversation for the recipient (msg.to)
        // For incoming messages, update conversation for the sender (msg.from)
        // fromId is already defined at the top of onTextMessage function
        const isSelfSentCustom =
          fromId === userId || String(fromId) === String(userId);
        if (msg.from) {
          // Determine which conversation to update
          const conversationIdToUpdate = isSelfSentCustom
            ? msg.to || msg.from // If self-sent, use recipient; fallback to sender
            : msg.from; // If incoming, use sender

          if (!conversationIdToUpdate) {
            return; // Can't update without a conversation ID
          }

          // Normalize: try both with and without user_ prefix
          const normalizedId = conversationIdToUpdate.startsWith("user_")
            ? conversationIdToUpdate
            : `user_${conversationIdToUpdate}`;
          const normalizedIdWithoutPrefix = conversationIdToUpdate.startsWith(
            "user_"
          )
            ? conversationIdToUpdate.replace("user_", "")
            : conversationIdToUpdate;

          console.log("🔄 [onTextMessage] Updating conversation preview:", {
            fromId,
            conversationIdToUpdate,
            normalizedId,
            normalizedIdWithoutPrefix,
            preview,
            isSelfSent: isSelfSentCustom,
          });

          setConversations((prev) => {
            // Find conversation by matching either format
            const existing = prev.find(
              (c) =>
                c.id === conversationIdToUpdate ||
                c.id === normalizedId ||
                c.id === normalizedIdWithoutPrefix ||
                c.id === `user_${normalizedIdWithoutPrefix}`
            );


            if (existing) {
              // Use the existing conversation ID format
              const conversationId = existing.id;
              
              // Get message timestamp from Agora message
              const messageTime = (msg as { time?: number }).time || Date.now();
              const messageDate = new Date(messageTime);
              
              // Only update if this message is newer than existing timestamp
              const existingTimestamp = existing.timestamp 
                ? new Date(existing.timestamp).getTime() 
                : 0;
              const shouldUpdate = messageDate.getTime() > existingTimestamp;
              
              if (!shouldUpdate) {
                // Message is older, don't update timestamp to preserve order
                return prev;
              }
              
              const updated = prev.map((conv) =>
                conv.id === conversationId
                  ? {
                      ...conv,
                      lastMessage: preview,
                      timestamp: messageDate, // Use actual message timestamp
                      lastMessageFrom: isSelfSentCustom ? userId : msg.from,
                    }
                  : conv
              );
              return updated;
            }
            // Only create new conversation for incoming messages (not self-sent)
            if (!isSelfSentCustom) {
              // Use message timestamp for new conversations too
              const messageTime = (msg as { time?: number }).time || Date.now();
              // Fetch user details asynchronously after creating conversation
              fetchAndUpdateUserDetails(normalizedId, normalizedIdWithoutPrefix).catch(() => {});
              const newConversation = {
                id: normalizedId,
                name: normalizedIdWithoutPrefix,
                lastMessage: preview,
                timestamp: new Date(messageTime), // Use actual message timestamp
                avatar: config.defaults.avatar,
                replyCount: 0,
                lastSeen: "",
                lastMessageFrom: msg.from,
              };
              return [newConversation, ...prev];
            }
            // For self-sent messages, don't create new conversation if it doesn't exist
            return prev;
          });
        }
        return; // Don't process as text message
      }

      // Regular text message handling
      // Derive a friendly preview for conversation list
      let preview = msg.msg || "";
      let normalizedMessageContent: string | null = null; // Store normalized content for logging
      try {
        // Only try to parse if it looks like JSON
        if (typeof msg.msg === "string" && msg.msg.trim().startsWith("{")) {
          let obj = JSON.parse(msg.msg as string);
          const originalObj = { ...obj }; // Keep original for comparison

          // Normalize API format with messageType and payload
          if (
            obj &&
            typeof obj === "object" &&
            "messageType" in obj &&
            "payload" in obj
          ) {
            obj = {
              ...obj.payload,
              type: obj.messageType,
            };
          }
          // Normalize if it has payload but no type
          else if (
            obj &&
            typeof obj === "object" &&
            "payload" in obj &&
            !("type" in obj)
          ) {
            obj = {
              ...obj.payload,
              type: obj.action_type || "unknown",
            };
          }
          // Normalize if it has action_type but no type
          else if (
            obj &&
            typeof obj === "object" &&
            "action_type" in obj &&
            !("type" in obj)
          ) {
            obj = {
              ...obj,
              type: obj.action_type,
            };
          }

          // If we normalized the object, use normalized version for logging
          if (JSON.stringify(obj) !== JSON.stringify(originalObj)) {
            normalizedMessageContent = JSON.stringify(obj);
          }

          if (obj && typeof obj === "object" && "type" in obj) {
            const objTyped = obj as {
              type?: string;
              fileName?: string;
              callType?: string;
              action?: string;
              channel?: string;
              from?: string;
            };
            const t = String(objTyped.type).toLowerCase();
            if (t === "image") preview = "Photo";
            else if (t === "file")
              preview = objTyped.fileName ? `📎 ${objTyped.fileName}` : "File";
            else if (t === "audio") preview = "Audio";
            else if (t === "text")
              preview = (objTyped as { body?: string }).body ?? "";
            else if (t === "call") {
              // Handle call messages - generate preview based on callType
              const callType =
                objTyped.callType === "video" ? "Video" : "Audio";
              preview = `${callType} call`;
              // Handle incoming call notification if action is initiate
              if (objTyped.action === "initiate" && handleIncomingCall) {
                console.log(
                  "Incoming call detected in text message:",
                  objTyped
                );
                if (objTyped.channel && objTyped.from) {
                  console.log("Calling handleIncomingCall with:", {
                    from: objTyped.from,
                    channel: objTyped.channel,
                    callId: objTyped.channel,
                  });
                  handleIncomingCall({
                    from: objTyped.from,
                    channel: objTyped.channel,
                    callId: objTyped.channel,
                    callType:
                      objTyped.callType === "video" ||
                      objTyped.callType === "audio"
                        ? objTyped.callType
                        : "video", // Default to video if not specified
                  });
                } else {
                  console.warn(
                    "Call message missing channel or from:",
                    objTyped
                  );
                }
              }
            } else if (t === "meal_plan_updated" || t === "meal_plan_update")
              preview = "Meal plan updated";
            else if (
              t === "new_nutritionist" ||
              t === "new_nutrionist" ||
              t === "coach_assigned" ||
              t === "coach_details"
            )
              preview =
                (objTyped as { title?: string; name?: string }).title ||
                (objTyped as { title?: string; name?: string }).name ||
                "New nutritionist assigned";
            else if (t === "products" || t === "recommended_products")
              preview = "Products";
            else if (
              t === "general_notification" ||
              t === "general-notification"
            )
              preview =
                (objTyped as { title?: string }).title || "Notification";
            else if (t === "video_call") {
              // Ensure objTyped has all required fields for UI parsing
              const videoCallData = {
                ...objTyped,
                type: "video_call",
                title: (objTyped as { title?: string }).title || "Video call",
                description: (objTyped as { description?: string }).description,
                call_details: (objTyped as { call_details?: unknown })
                  .call_details,
                icons_details: (objTyped as { icons_details?: unknown })
                  .icons_details,
              };
              // Update the object to include all fields
              Object.assign(objTyped, videoCallData);
              preview = videoCallData.title || "Video call";
            } else if (t === "voice_call") {
              // Ensure objTyped has all required fields for UI parsing
              const voiceCallData = {
                ...objTyped,
                type: "voice_call",
                title: (objTyped as { title?: string }).title || "Voice call",
                description: (objTyped as { description?: string }).description,
                call_details: (objTyped as { call_details?: unknown })
                  .call_details,
                icons_details: (objTyped as { icons_details?: unknown })
                  .icons_details,
              };
              // Update the object to include all fields
              Object.assign(objTyped, voiceCallData);
              preview = voiceCallData.title || "Voice call";
            } else if (t === "documents")
              preview = (objTyped as { title?: string }).title || "Document";
            else if (t === "call_scheduled") {
              const time = (objTyped as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
              } else {
                preview = "Call scheduled";
              }
            } else if (t === "scheduled_call_canceled")
              preview = "Scheduled call cancelled";
            // If we successfully parsed and generated a preview, use it
            // Otherwise, preview remains as the original msg.msg
          }
        }
      } catch {
        // If parsing fails, preview stays as msg.msg (plain text)
        // This is fine for regular text messages
      }

      // Use normalized content if available, otherwise use original message
      const messageToLog = normalizedMessageContent || msg.msg;

      // Check if this is a self-sent message (from current user)
      const fromIdForText = msg.from || "";
      const isSelfSentText =
        fromIdForText === userId || String(fromIdForText) === String(userId);
      const logPrefixText = isSelfSentText
        ? `You → ${msg.to || "unknown"}`
        : `${msg.from}`;

      // Use actual message timestamp from Agora (msg.time) to avoid wrong order/display
      const msgTime = (msg as { time?: number }).time;
      addLog({
        log: `${logPrefixText}: ${messageToLog}`,
        timestamp: msgTime ? new Date(msgTime) : new Date(),
        serverMsgId:
          (msg as { id?: string; mid?: string }).id ||
          (msg as { id?: string; mid?: string }).mid,
      });

      // Update conversation when receiving a message - normalize conversation ID matching
      // For self-sent messages, update conversation for the recipient (msg.to)
      // For incoming messages, update conversation for the sender (msg.from)
      if (msg.from) {
        // Determine which conversation to update
        const conversationIdToUpdate = isSelfSentText
          ? msg.to || msg.from // If self-sent, use recipient; fallback to sender
          : msg.from; // If incoming, use sender

        if (!conversationIdToUpdate) {
          return; // Can't update without a conversation ID
        }

        // Normalize: try both with and without user_ prefix
        const normalizedId = conversationIdToUpdate.startsWith("user_")
          ? conversationIdToUpdate
          : `user_${conversationIdToUpdate}`;
        const normalizedIdWithoutPrefix = conversationIdToUpdate.startsWith(
          "user_"
        )
          ? conversationIdToUpdate.replace("user_", "")
          : conversationIdToUpdate;

        setConversations((prev) => {
          // Find conversation by matching either format
          const existing = prev.find(
            (c) =>
              c.id === conversationIdToUpdate ||
              c.id === normalizedId ||
              c.id === normalizedIdWithoutPrefix ||
              c.id === `user_${normalizedIdWithoutPrefix}`
          );

          if (existing) {
            // Use the existing conversation ID format
            const conversationId = existing.id;
            
            // Get message timestamp from Agora message (time is in milliseconds)
            const messageTime = (msg as { time?: number }).time || Date.now();
            const messageDate = new Date(messageTime);
            
            // Only update if this message is newer than existing timestamp
            const existingTimestamp = existing.timestamp 
              ? new Date(existing.timestamp).getTime() 
              : 0;
            const shouldUpdate = messageDate.getTime() > existingTimestamp;
            
            if (!shouldUpdate) {
              // Message is older, don't update timestamp to preserve order
              return prev;
            }
            
            return prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessage: preview,
                    timestamp: messageDate, // Use actual message timestamp
                    lastMessageFrom: isSelfSentText ? userId : msg.from,
                  }
                : conv
            );
          }
          // Only create new conversation for incoming messages (not self-sent)
          if (!isSelfSentText) {
            // Use message timestamp for new conversations too
            const messageTime = (msg as { time?: number }).time || Date.now();
            // Fetch user details asynchronously after creating conversation
            fetchAndUpdateUserDetails(normalizedId, normalizedIdWithoutPrefix).catch(() => {});
            return [
              {
                id: normalizedId,
                name: normalizedIdWithoutPrefix,
                lastMessage: preview,
                timestamp: new Date(messageTime), // Use actual message timestamp
                avatar: config.defaults.avatar,
                replyCount: 0,
                lastSeen: "",
                lastMessageFrom: msg.from,
              },
              ...prev,
            ];
          }
          // For self-sent messages, don't create new conversation if it doesn't exist
          return prev;
        });
      }
    },
    onCustomMessage: (msg: MessageBody) => {
      // Enhanced logging for debugging message delivery
      console.log("📨 [onCustomMessage] Received custom message:", {
        from: msg.from,
        to: msg.to,
        type: msg.type,
        timestamp: new Date().toISOString(),
        hasBody: !!msg.body,
        hasExt: !!msg.ext,
        hasCustomExts: !!msg.customExts,
        hasV2CustomExts: !!msg["v2:customExts"],
      });

      // Extra debug: show customEvent/customExts payload clearly in console
      console.log("[FPChat][RX][custom:meta]", {
        customEvent: (msg as { customEvent?: unknown }).customEvent,
        customExts: (msg as { customExts?: unknown }).customExts,
        v2CustomExts: (msg as { "v2:customExts"?: unknown })["v2:customExts"],
        body: msg.body,
      });

      // Ignore messages from blocked UIDs (Recorder and RTST Agent)
      const fromId = msg.from || "";
      if (isBlockedUID(fromId)) {
        console.log("🚫 Ignoring custom message from blocked UID:", fromId);
        return;
      }

      // Handle custom messages (attachments)

      let preview = "Attachment";
      let messageContent = "";

      try {
        // Custom messages store data in v2:customExts or customExts
        let paramsData = null;

        // First priority: Check msg.body for API format (messageType + payload)
        // This is likely where API-sent custom messages arrive
        if (msg.body && typeof msg.body === "object") {
          const bodyObj = msg.body as {
            messageType?: string;
            payload?: unknown;
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj.messageType && bodyObj.payload) {
            paramsData = {
              messageType: bodyObj.messageType,
              payload: bodyObj.payload,
            };
          }
        }

        // Second priority: Check customExts at top level (standard Agora Chat format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.customExts &&
          typeof msg.customExts === "object"
        ) {
          console.log("Trying msg.customExts:", msg.customExts);
          paramsData = msg.customExts;
          console.log("Extracted from customExts:", paramsData);
        }

        // Third priority: Check v2:customExts at top level (alternative format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg["v2:customExts"] &&
          typeof msg["v2:customExts"] === "object"
        ) {
          console.log("Trying msg['v2:customExts']:", msg["v2:customExts"]);
          paramsData = msg["v2:customExts"];
          console.log("Extracted from v2:customExts:", paramsData);
        }

        // Fourth priority: Check body.customExts (if not already extracted API format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.body &&
          typeof msg.body === "object"
        ) {
          const bodyObj = msg.body as {
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj.customExts) {
            paramsData = bodyObj.customExts;
          }
        }

        // Fifth priority: Check body.v2:customExts
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.body &&
          typeof msg.body === "object"
        ) {
          const bodyObj = msg.body as {
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj["v2:customExts"]) {
            paramsData = bodyObj["v2:customExts"];
          }
        }

        // Sixth priority: Check bodies array for v2:customExts or customExts
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.bodies &&
          Array.isArray(msg.bodies) &&
          msg.bodies.length > 0
        ) {
          for (const bodyItem of msg.bodies) {
            if (
              bodyItem &&
              typeof bodyItem === "object" &&
              bodyItem["v2:customExts"]
            ) {
              paramsData = bodyItem["v2:customExts"];
              break;
            }
            // Also check customExts array (without v2: prefix)
            if (
              bodyItem &&
              typeof bodyItem === "object" &&
              bodyItem.customExts &&
              Array.isArray(bodyItem.customExts) &&
              bodyItem.customExts.length > 0
            ) {
              const customExt = bodyItem.customExts[0];
              if (customExt && typeof customExt === "object" && customExt.url) {
                // Extract all properties from customExt
                paramsData = { ...customExt };
                break;
              }
            }
          }
        }

        // Seventh priority: Try params
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.params !== undefined &&
          msg.params !== null
        ) {
          if (typeof msg.params === "string") {
            try {
              paramsData = JSON.parse(msg.params);
            } catch (parseError) {
              paramsData = msg.params;
            }
          } else if (typeof msg.params === "object") {
            paramsData = msg.params;
          }
        }

        // Eighth priority: Try ext - we're putting data there (both as ext.data and spread directly)
        if (
          !paramsData ||
          (typeof paramsData === "object" &&
            Object.keys(paramsData).length === 0)
        ) {
          if (msg.ext && typeof msg.ext === "object") {

            // Check if ext has the attachment properties directly (we spread them)
            if (
              msg.ext.type &&
              (msg.ext.type === "image" ||
                msg.ext.type === "file" ||
                msg.ext.type === "audio")
            ) {
              paramsData = {
                type: msg.ext.type,
                url: msg.ext.url,
                fileName: msg.ext.fileName,
                mimeType: msg.ext.mimeType,
                size: msg.ext.size,
                duration: msg.ext.duration,
                transcription: msg.ext.transcription,
              };
            }

            // If still empty, try ext.data
            if (
              (!paramsData || Object.keys(paramsData).length === 0) &&
              msg.ext.data
            ) {
              try {
                paramsData =
                  typeof msg.ext.data === "string"
                    ? JSON.parse(msg.ext.data)
                    : msg.ext.data;
              } catch {}
            }

            // Last resort: use entire ext object if it has useful data
            if (
              (!paramsData || Object.keys(paramsData).length === 0) &&
              Object.keys(msg.ext).length > 0
            ) {
              // Filter out the 'data' key if it exists and is a string (already tried)
              const extCopy = { ...msg.ext };
              if (extCopy.data && typeof extCopy.data === "string") {
                delete extCopy.data;
              }
              if (Object.keys(extCopy).length > 0) {
                paramsData = extCopy;
              }
            }
          }

          // Try body - check for API format with messageType and payload
          if (
            (!paramsData || Object.keys(paramsData).length === 0) &&
            msg.body
          ) {
            try {
              const bodyData =
                typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;

              // Check if body has the API format (messageType + payload)
              if (
                bodyData &&
                typeof bodyData === "object" &&
                "messageType" in bodyData &&
                "payload" in bodyData
              ) {
                // Extract payload and add type field
                paramsData = {
                  ...(bodyData.payload as object),
                  type: bodyData.messageType,
                };
              } else {
                paramsData = bodyData;
              }
            } catch (parseError) {
              // Failed to parse msg.body
            }
          }

          // Last resort: try msg.msg if it exists
          if (
            (!paramsData || Object.keys(paramsData).length === 0) &&
            msg.msg
          ) {
            try {
              const msgData =
                typeof msg.msg === "string" ? JSON.parse(msg.msg) : msg.msg;

              // Check if msg.msg has the API format (messageType + payload)
              if (
                msgData &&
                typeof msgData === "object" &&
                "messageType" in msgData &&
                "payload" in msgData
              ) {
                paramsData = {
                  messageType: msgData.messageType,
                  payload: msgData.payload,
                };
              } else {
                paramsData = msgData;
              }
            } catch (parseError) {
              // Failed to parse msg.msg
            }
          }
        }


        // Normalize the message structure for UI parsing
        let normalizedData = paramsData;

        // Handle case where customExts has a stringified 'data' field (e.g., from backend API)
        // Example: { type: 'call_scheduled', data: '{"time":"1765953010","type":"call_scheduled"}' }
        if (
          paramsData &&
          typeof paramsData === "object" &&
          "data" in paramsData &&
          typeof paramsData.data === "string"
        ) {
          try {
            const parsedData = JSON.parse(paramsData.data);
            // Merge parsed data with the outer object, preserving type from outer if not in parsed
            normalizedData = {
              ...parsedData,
              type: parsedData.type || (paramsData as { type?: string }).type,
            };
            // Parsed stringified data field
          } catch (parseError) {
            // Failed to parse data field
            // Fall through to other normalization logic
          }
        }
        // Handle API format with messageType and payload
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "messageType" in paramsData &&
          "payload" in paramsData
        ) {
          // Merge messageType into payload for UI compatibility
          normalizedData = {
            ...(paramsData.payload as object),
            type: paramsData.messageType,
          };
        }
        // Handle API format with just payload (messageType might be in msg.type)
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "payload" in paramsData &&
          !("type" in paramsData) &&
          msg.type
        ) {
          normalizedData = {
            ...(paramsData.payload as object),
            type: msg.type,
          };
        }
        // If paramsData has action_type but no type, use action_type as type
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "action_type" in paramsData &&
          !("type" in paramsData)
        ) {
          normalizedData = {
            ...paramsData,
            type: paramsData.action_type,
          };
        }

        if (
          normalizedData &&
          typeof normalizedData === "object" &&
          Object.keys(normalizedData).length > 0 &&
          ("type" in normalizedData || "action_type" in normalizedData)
        ) {
          const paramsObj = normalizedData as {
            type?: string;
            action_type?: string;
            fileName?: string;
            callType?: string;
            action?: string;
            channel?: string;
            from?: string;
            title?: string;
          };
          const t = String(
            paramsObj.type || paramsObj.action_type || ""
          ).toLowerCase();
          if (t === "image") preview = "Photo";
          else if (t === "file")
            preview = paramsObj.fileName ? `📎 ${paramsObj.fileName}` : "File";
          else if (t === "audio") preview = "Audio";
          else if (t === "call") {
            // Handle call messages - generate preview based on callType
            const callType = paramsObj.callType === "video" ? "Video" : "Audio";
            preview = `${callType} call`;
            // Handle incoming call notification if action is initiate
            if (paramsObj.action === "initiate" && handleIncomingCall) {
              console.log(
                "Incoming call detected in custom message:",
                paramsObj
              );
              if (paramsObj.channel && paramsObj.from) {
                handleIncomingCall({
                  from: paramsObj.from,
                  channel: paramsObj.channel,
                  callId: paramsObj.channel,
                  callType:
                    paramsObj.callType === "video" ||
                    paramsObj.callType === "audio"
                      ? paramsObj.callType
                      : "video", // Default to video if not specified
                });
              }
            }
          } else if (t === "meal_plan_updated" || t === "meal_plan_update")
            preview = "Meal plan updated";
          else if (
            t === "new_nutritionist" ||
            t === "new_nutrionist" ||
            t === "coach_assigned" ||
            t === "coach_details"
          )
            preview = paramsObj.title || "New nutritionist assigned";
          else if (t === "products" || t === "recommended_products")
            preview = "Products";
          else if (t === "general_notification" || t === "general-notification")
            preview = paramsObj.title || "Notification";
          else if (t === "video_call") {
            // Ensure normalizedData has all required fields for UI parsing
            normalizedData = {
              ...normalizedData,
              type: "video_call",
              title:
                (normalizedData as { title?: string }).title || "Video call",
              description: (normalizedData as { description?: string })
                .description,
              call_details: (normalizedData as { call_details?: unknown })
                .call_details,
              icons_details: (normalizedData as { icons_details?: unknown })
                .icons_details,
            };
            preview =
              (normalizedData as { title?: string }).title || "Video call";
          } else if (t === "voice_call") {
            // Ensure normalizedData has all required fields for UI parsing
            normalizedData = {
              ...normalizedData,
              type: "voice_call",
              title:
                (normalizedData as { title?: string }).title || "Voice call",
              description: (normalizedData as { description?: string })
                .description,
              call_details: (normalizedData as { call_details?: unknown })
                .call_details,
              icons_details: (normalizedData as { icons_details?: unknown })
                .icons_details,
            };
            preview =
              (normalizedData as { title?: string }).title || "Voice call";
          } else if (t === "documents") preview = paramsObj.title || "Document";
          else if (t === "call_scheduled") {
            const time = (paramsObj as { time?: number | string }).time;
            if (time) {
              const scheduledDate = new Date(
                typeof time === "number"
                  ? time * 1000
                  : parseInt(time, 10) * 1000
              );
              preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
            } else {
              preview = "Call scheduled";
            }
          } else if (t === "scheduled_call_canceled")
            preview = "Scheduled call cancelled";

          // Ensure the logged message has 'type' field for UI parsing
          messageContent = JSON.stringify(normalizedData);
          console.log(
            "Normalized messageContent (stringified):",
            messageContent
          );
        } else {
          // Log what we got for debugging
          // paramsData is not valid or empty, falling back to stringifying entire msg object
          messageContent = JSON.stringify(msg);
        }
      } catch (error) {
        console.error("Error processing custom message:", error, msg);
        messageContent = JSON.stringify(msg.params || msg.body || msg || {});
      }

      // Check if this is a self-sent message (from current user)
      // This handles cases where backend sends messages on behalf of the user
      const isSelfSent = fromId === userId || String(fromId) === String(userId);
      const logPrefix = isSelfSent
        ? `You → ${msg.to || "unknown"}`
        : `${msg.from}`;

      // Use actual message timestamp from Agora (msg.time) to avoid wrong order/display
      const msgTime = (msg as { time?: number }).time;
      addLog({
        log: `${logPrefix}: ${messageContent}`,
        timestamp: msgTime ? new Date(msgTime) : new Date(),
        serverMsgId:
          (msg as { id?: string; mid?: string }).id ||
          (msg as { id?: string; mid?: string }).mid,
      });

      // Update conversation when receiving a custom message - normalize conversation ID matching
      // For self-sent messages, update conversation for the recipient (msg.to)
      // For incoming messages, update conversation for the sender (msg.from)
      if (msg.from) {
        // Determine which conversation to update
        const conversationIdToUpdate = isSelfSent
          ? msg.to || msg.from // If self-sent, use recipient; fallback to sender
          : msg.from; // If incoming, use sender

        if (!conversationIdToUpdate) {
          return; // Can't update without a conversation ID
        }

        // Normalize: try both with and without user_ prefix
        const normalizedId = conversationIdToUpdate.startsWith("user_")
          ? conversationIdToUpdate
          : `user_${conversationIdToUpdate}`;
        const normalizedIdWithoutPrefix = conversationIdToUpdate.startsWith(
          "user_"
        )
          ? conversationIdToUpdate.replace("user_", "")
          : conversationIdToUpdate;

        setConversations((prev) => {
          // Find conversation by matching either format
          const existing = prev.find(
            (c) =>
              c.id === conversationIdToUpdate ||
              c.id === normalizedId ||
              c.id === normalizedIdWithoutPrefix ||
              c.id === `user_${normalizedIdWithoutPrefix}`
          );

          if (existing) {
            // Use the existing conversation ID format
            const conversationId = existing.id;
            
            // Get message timestamp from Agora message
            const messageTime = (msg as { time?: number }).time || Date.now();
            const messageDate = new Date(messageTime);
            
            // Only update if this message is newer than existing timestamp
            const existingTimestamp = existing.timestamp 
              ? new Date(existing.timestamp).getTime() 
              : 0;
            const shouldUpdate = messageDate.getTime() > existingTimestamp;
            
            if (!shouldUpdate) {
              // Message is older, don't update timestamp to preserve order
              return prev;
            }
            
            return prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessage: preview,
                    timestamp: messageDate, // Use actual message timestamp
                    lastMessageFrom: isSelfSent ? userId : msg.from,
                  }
                : conv
            );
          }
          // Only create new conversation for incoming messages (not self-sent)
          if (!isSelfSent) {
            // Use message timestamp for new conversations too
            const messageTime = (msg as { time?: number }).time || Date.now();
            // Fetch user details asynchronously after creating conversation
            fetchAndUpdateUserDetails(normalizedId, normalizedIdWithoutPrefix).catch(() => {});
            return [
              {
                id: normalizedId,
                name: normalizedIdWithoutPrefix,
                lastMessage: preview,
                timestamp: new Date(messageTime), // Use actual message timestamp
                avatar: config.defaults.avatar,
                replyCount: 0,
                lastSeen: "",
                lastMessageFrom: msg.from,
              },
              ...prev,
            ];
          }
          // For self-sent messages, don't create new conversation if it doesn't exist
          return prev;
        });
      }
    },
    onTokenWillExpire: async (): Promise<void> => {
      addLog("Token will expire soon - renewing...");
      const newToken = await generateNewToken();
      const client = getClientRef() as {
        renewToken?: (token: string) => Promise<void>;
      } | null;
      if (newToken && client && typeof client.renewToken === "function") {
        try {
          // Renew the token using Agora Chat SDK
          await client.renewToken(newToken);
          addLog("Token renewed successfully");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("❌ [messageHandlers] Token renewal failed:", errorMessage);
          addLog(`Token renewal failed: ${errorMessage}`);
        }
      }
    },
    onTokenExpired: async (): Promise<void> => {
      addLog("Token expired - attempting to renew...");
      setIsLoggedIn(false);

      const newToken = await generateNewToken();
      const client = getClientRef() as {
        open?: (options: {
          user: string;
          accessToken: string;
        }) => Promise<void>;
      } | null;
      
      // Use original userId - Agora Chat SDK handles multi-session natively
      if (newToken && client && userId && typeof client.open === "function") {
        try {
          // Try to reconnect with the new token
          await client.open({ user: userId, accessToken: newToken });
          addLog("Reconnected with new token");
          setIsLoggedIn(true);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("❌ [messageHandlers] Reconnection failed:", errorMessage);
          addLog(`Reconnection failed: ${errorMessage}`);
          setIsLoggingIn(false);
        }
      } else {
        addLog(
          "Cannot reconnect: Token generation failed or client unavailable"
        );
        setIsLoggingIn(false);
      }
    },
    onError: (e: { message: string }): void => {
      const errorMessage = e?.message || String(e);
      const errorLower = errorMessage.toLowerCase();
      
      // Handle "user not found" - retry registration and login
      if (errorLower.includes("user not found") || errorLower.includes("sorry, user not found")) {
        addLog("User not registered. Registering and retrying...");
        fetch(config.api.registerUserEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: userId }),
        })
          .then(() => generateNewToken())
          .then((newToken) => {
            if (newToken) {
              const client = getClientRef() as { open?: (options: { user: string; accessToken: string }) => Promise<void> };
              return client.open?.({ user: userId, accessToken: newToken });
            }
          })
          .catch((err) => console.error("Retry failed:", err));
        return;
      }
      
      // Handle "already logged" - expected with multi-session, just log it
      if (errorLower.includes("already logged") || errorLower.includes("another device")) {
        if (config.chat.allowMultipleSessions) {
          return; // Multi-session enabled, ignore this
        }
      }
      
      // Handle OAuth/authentication errors - regenerate token and retry
      if (errorLower.includes("oauth") || errorLower.includes("unauthorized") || errorLower.includes("unable to authenticate")) {
        addLog("Authentication error. Regenerating token...");
        generateNewToken()
          .then((newToken) => {
            if (newToken) {
              const client = getClientRef() as { open?: (options: { user: string; accessToken: string }) => Promise<void> };
              return client.open?.({ user: userId, accessToken: newToken });
            }
          })
          .catch((err) => console.error("Token regeneration failed:", err));
        return;
      }
      
      console.error("❌ [messageHandlers] Agora Chat SDK Error:", errorMessage);
      addLog(`Error: ${errorMessage}`);
      setIsLoggingIn(false);
    },
    onPresenceStatus: onPresenceStatus
      ? (presenceData: { userId: string; description: string }): void => {
          addLog(
            `Presence update from ${presenceData.userId}: ${presenceData.description}`
          );
          onPresenceStatus(presenceData);
        }
      : undefined,
  };
}
