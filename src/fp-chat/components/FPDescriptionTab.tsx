import { Contact } from "../../common/types/chat";
import React, { useEffect, useState } from "react";
import type { Connection } from "agora-chat";
import { useChatSummary } from "../hooks/useChatSummary";

interface FPDescriptionTabProps {
  selectedContact: Contact | null;
  chatClient: Connection | null;
  group_id: string | null;
  userId: string;
}

export default function FPDescriptionTab({
  selectedContact,
  chatClient,
  group_id,
  userId,
}: FPDescriptionTabProps): React.JSX.Element {
  const {
    summaries,  
    isLoading,
    error,
    generateSummary,
    statusMessage,
    fetchSummaries,
    clearStatusMessage,
  } = useChatSummary({
    chatClient,
    group_id,
    userId,
    enabled: !!group_id && !!chatClient,
  });

  console.log("group_id", group_id);

  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);

  // Scroll to top when Description tab is opened
  useEffect(() => {
    // Find the parent scrollable container (chat-area) and scroll to top
    const scrollableContainer = document.querySelector(".chat-area");
    if (scrollableContainer) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollableContainer) {
          scrollableContainer.scrollTop = 0;
        }
      });
    }
  }, []); // Run once when component mounts

  // Automatically fetch summaries when tab is opened (component mounts or peerId changes)
  useEffect(() => {
    if (group_id && chatClient) {
      fetchSummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group_id, chatClient]);

  // Show banner when statusMessage changes and auto-dismiss after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      setShowBanner(true);
      setIsDismissing(false);
      const timer = setTimeout(() => {
        setIsDismissing(true);
        // Clear status message after animation completes
        setTimeout(() => {
          setShowBanner(false);
          if (clearStatusMessage) {
            clearStatusMessage();
          }
        }, 300); // Wait for slide-up animation
      }, 5000); // 5 seconds

      return () => {
        clearTimeout(timer);
      };
    } else {
      setShowBanner(false);
      setIsDismissing(false);
    }
  }, [statusMessage, clearStatusMessage]);

  // Handle manual dismiss
  const handleDismissBanner = (): void => {
    setIsDismissing(true);
    // Clear status message after animation completes
    setTimeout(() => {
      setShowBanner(false);
      if (clearStatusMessage) {
        clearStatusMessage();
      }
    }, 300); // Wait for slide-up animation
  };

  // Format date for display (e.g., "Today, 10 Nov 2025 06:19 pm")
  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

    let dateStr = "";
    if (isToday) {
      dateStr = "Today";
    } else if (isYesterday) {
      dateStr = "Yesterday";
    } else {
      dateStr = date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr}, ${timeStr}`;
  };

  // Process summary text: remove prefix, extract bullet points, and merge 2-3 into paragraphs
  const processSummary = (summaryText: string): string[] => {
    if (!summaryText) return [];

    // Remove the prefix line if it exists (case insensitive, handles variations)
    let processed = summaryText
      .replace(
        /^Here's a summary of the chat in clear bullet points:\s*\n*\s*/gi,
        ""
      )
      .replace(/^Here's a summary:\s*\n*\s*/gi, "")
      .replace(/^Summary:\s*\n*\s*/gi, "")
      .trim();

    if (!processed) return [];

    const bulletPoints: string[] = [];

    // Split by bullet points (•, \u2022, \u25CF) or lines starting with bullet
    // Handle both "• text" and "•text" formats
    const lines = processed.split(/\n/);

    for (const line of lines) {
      // Remove bullet point and trim
      const cleaned = line
        .replace(/^[•\u2022\u25CF\-\*]\s*/, "") // Remove bullet and optional space
        .trim();

      if (cleaned) {
        bulletPoints.push(cleaned);
      }
    }

    // If no bullet points were found, try splitting by double newlines
    if (bulletPoints.length === 0) {
      const doubleNewlineSplit = processed.split(/\n\s*\n/);
      if (doubleNewlineSplit.length > 1) {
        for (const para of doubleNewlineSplit) {
          const trimmed = para.trim();
          if (trimmed) {
            bulletPoints.push(trimmed);
          }
        }
      } else {
        return [processed];
      }
    }

    // Merge 2-3 bullet points into one paragraph
    const paragraphs: string[] = [];
    for (let i = 0; i < bulletPoints.length; i += 3) {
      // Take 2-3 items at a time
      const group = bulletPoints.slice(i, i + 3);
      // Join with a space to create a paragraph
      paragraphs.push(group.join(" "));
    }

    return paragraphs.length > 0 ? paragraphs : [processed];
  };

  return (
    <div className="tab-content">
      <div className="description-content" style={{ position: "relative" }}>
        {/* Status Banner - slides down from top of description tab */}
        {statusMessage && showBanner && (
          <div
            style={{
              position: "relative",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              backgroundColor: "#dbeafe",
              color: "#1e40af",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              animation: isDismissing
                ? "slideUp 0.3s ease-out"
                : "slideDown 0.3s ease-out",
              borderBottom: "1px solid #93c5fd",
              marginBottom: "1rem",
              borderRadius: "0.375rem",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                flex: 1,
              }}
            >
              {statusMessage}
            </div>
            <button
              onClick={handleDismissBanner}
              style={{
                background: "transparent",
                border: "none",
                color: "#1e40af",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.25rem",
                marginLeft: "1rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(30, 64, 175, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
        {/* Generate Summary Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
            padding: "0.5rem 0",
          }}
        >
          <button
            onClick={generateSummary}
            disabled={isLoading || !group_id}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: isLoading ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: isLoading || !group_id ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {isLoading ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Generating...
              </>
            ) : (
              "Generate Summary"
            )}
          </button>
        </div>

        {/* Loading State */}
        {isLoading && summaries.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            <div
              className="spinner"
              style={{
                width: "24px",
                height: "24px",
                border: "3px solid #e5e7eb",
                borderTop: "3px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            Loading summary...
          </div>
        ) : error ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#ef4444",
            }}
          >
            Error: {error}
          </div>
        ) : summaries.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            No summary available yet. Click "Generate Summary" to create one.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              padding: "1rem 0",
            }}
          >
            {summaries.map((summary) => (
              <div
                key={summary.summary_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {/* Date and horizontal line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    marginBottom: "0.5rem",
                  }}
                >
                  {/* Date on the left */}
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {formatDateTime(
                      summary.timestamp ||
                        new Date(summary.created_at).getTime()
                    )}
                  </div>
                  {/* Horizontal line on the right */}
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "#E5E7EB",
                      marginLeft: "12px",
                    }}
                  />
                </div>

                {/* Profile photo and name in the same line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Avatar */}
                  <img
                    src={
                      selectedContact?.avatar ||
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
                    }
                    alt={selectedContact?.name || "User"}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />

                  {/* Name */}
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {selectedContact?.name || "User"}
                  </div>
                </div>

                {/* Summary text below - displayed as separate paragraphs */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {processSummary(summary.summary_text).map(
                    (paragraph, index) => (
                      <div
                        key={index}
                        style={{
                          fontSize: "0.875rem",
                          lineHeight: "1.5",
                          color: "#374151",
                          textAlign: "left",
                          paddingBottom:
                            index <
                            processSummary(summary.summary_text).length - 1
                              ? "0.5rem"
                              : "0",
                        }}
                      >
                        {paragraph}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
