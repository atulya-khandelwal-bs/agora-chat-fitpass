import { useState, useCallback } from "react";
import type { Connection } from "agora-chat";
import axios from "axios";
import config from "../../common/config.ts"; // Currently using hardcoded URLs

export interface Summary {
  summary_id: number;
  conversation_id: string;
  summary_version: number;
  summary_text: string;
  covered_from_time: string;
  covered_to_time: string;
  created_at: string;
  timestamp?: number; // Parsed timestamp for easier use
}

interface UseChatSummaryOptions {
  chatClient: Connection | null; // Kept for API compatibility but not used
  peerId: string | null;
  userId: string;
  enabled?: boolean;
}

export function useChatSummary({
  chatClient: _chatClient, // Unused but kept for API compatibility
  peerId,
  userId: _userId, // Unused but kept for API compatibility
  enabled: _enabled, // Unused but kept for API compatibility
}: UseChatSummaryOptions): {
  summaries: Summary[];
  isLoading: boolean;
  error: string | null;
  generateSummary: () => Promise<void>;
  statusMessage: string | null;
  fetchSummaries: () => Promise<void>;
  clearStatusMessage: () => void;
} {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Get conversation ID from peerId
  const getConversationId = useCallback((): string | null => {
    if (!peerId) return null;
    // Normalize: ensure it has user_ prefix
    return peerId.startsWith("user_") ? peerId : `user_${peerId}`;
  }, [peerId]);

  // Fetch summaries from API
  const fetchSummaries = useCallback(
    async (preserveStatusMessage = false): Promise<void> => {
      const conversationId = getConversationId();
      if (!conversationId) {
        setError("No conversation ID available");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use fetch for external API to avoid CORS issues with axios credentials
        const url = new URL(config.api.getChatSummaries);
        url.searchParams.append("conversationId", conversationId);
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.summaries && Array.isArray(data.summaries)) {
          // Process summaries and add timestamp
          const processedSummaries: Summary[] = data.summaries.map(
            (summary: Summary) => ({
              ...summary,
              timestamp: new Date(summary.created_at).getTime(),
            })
          );

          // Sort by timestamp (newest first)
          processedSummaries.sort((a, b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeB - timeA;
          });

          setSummaries(processedSummaries);
          // Only clear status message if not preserving it
          if (!preserveStatusMessage) {
            setStatusMessage(null);
          }
        } else {
          setSummaries([]);
        }
      } catch (err: any) {
        console.error("[Chat Summary] Error fetching summaries:", {
          error: err,
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
        });
        setError(err?.message || "Failed to fetch summaries");
        setSummaries([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getConversationId]
  );

  // Generate summary
  const generateSummary = useCallback(async (): Promise<void> => {
    const conversationId = getConversationId();
    if (!conversationId) {
      setError("No conversation ID available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      // Step 1: Call generate-chat-summary API (use fetch for external API to avoid CORS issues)
      const generateResponse = await fetch(config.api.generateChatSummary, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(`API request failed: ${generateResponse.status} ${generateResponse.statusText}`);
      }

      const generateData = await generateResponse.json();

      console.log("[Chat Summary] Generate response:", generateData);

      if (generateData.status === "no_new_content") {
        setStatusMessage("Summary is up to date");
        setIsLoading(false);
        // Still fetch existing summaries, but preserve the status message
        await fetchSummaries(true);
        return;
      }

      if (generateData.status === "created") {
        // Step 2: Automatically fetch summaries
        await fetchSummaries();
      } else {
        setError("Unknown response status from generate API");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("[Chat Summary] Error generating summary:", {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      setError(err?.message || "Failed to generate summary");
      setIsLoading(false);
    }
  }, [getConversationId, fetchSummaries]);

  // Clear status message
  const clearStatusMessage = useCallback((): void => {
    setStatusMessage(null);
  }, []);

  return {
    summaries,
    isLoading,
    error,
    generateSummary,
    statusMessage,
    fetchSummaries,
    clearStatusMessage,
  };
}
