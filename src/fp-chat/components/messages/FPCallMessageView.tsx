import React from "react";
import { Video, Phone } from "lucide-react";
import { validateImageUrl } from "../../utils/imageValidator";

interface FPCallMessageViewProps {
  callType: "video_call" | "voice_call";
  title?: string;
  description?: string;
  icons_details?: {
    left_icon?: string;
    right_icon?: string;
  };
  call_details?: {
    call_url?: string;
  };
  redirection_details?: Array<{
    cta_details?: {
      text?: string;
      text_color?: string;
      bg_color?: string;
    };
    redirect_url?: string;
    action_id?: string;
  }>;
  onPlayVideo?: (
    videoUrl: string,
    callType?: "video_call" | "voice_call"
  ) => void;
}

export default function FPCallMessageView({
  callType,
  title,
  description,
  icons_details,
  call_details,
  onPlayVideo,
}: FPCallMessageViewProps): React.JSX.Element {
  const isVideoCall = callType === "video_call";
  const displayTitle = title || (isVideoCall ? "Video call" : "Voice call");
  const displayDescription = description || "";

  const videoUrl = call_details?.call_url;

   // Compact layout for narrower viewports (< 1451px)
   const isCompact =
     typeof window !== "undefined" && window.innerWidth < 1451;

   const containerPadding = isCompact ? "8px" : "12px";
   const iconSize = isCompact ? 16 : 20;
   const iconWrapperSize = isCompact ? 32 : 40;
   const gap = isCompact ? "8px" : "12px";
   const titleFontSize = isCompact ? "12px" : "14px";
   const descFontSize = isCompact ? "10px" : "12px";
   const buttonFontSize = isCompact ? "12px" : "14px";

  const handlePlayVideo = (e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    if (videoUrl && onPlayVideo) {
      onPlayVideo(videoUrl, callType);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#f3f4f6",
        // border: "1px solid #e5e7eb",
      }}
    >
      {/* Top Section: Icon, Title, and Duration */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap,
          padding: containerPadding,
        }}
      >
        {/* Icon with circular background */}
        <div
          style={{
            width: iconWrapperSize,
            height: iconWrapperSize,
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icons_details?.left_icon ? (
            <img
              src={validateImageUrl(icons_details.left_icon, "icon")}
              alt="Call icon"
              style={{
                width: iconSize,
                height: iconSize,
              }}
            />
          ) : (
            <div>
              {isVideoCall ? (
                <Video
                  size={iconSize}
                  style={{
                    color: "",
                  }}
                />
              ) : (
                <Phone
                  size={iconSize}
                  style={{
                    color: "",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Title and Duration */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "#111827",
              fontSize: titleFontSize,
            }}
          >
            {displayTitle}
          </span>
          {displayDescription && (
            <span
              style={{
                fontSize: descFontSize,
                color: "#6b7280",
              }}
            >
              {displayDescription}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Section: Play Recording Button - Show for both video and voice calls if URL exists */}
      {videoUrl && onPlayVideo && (
        <div
          style={{
            background: "#e5e7eb",
            padding: containerPadding,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handlePlayVideo}
            style={{
              background: "transparent",
              border: "none",
              fontSize: buttonFontSize,
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
              transition: "opacity 0.2s",
              color: "#000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isVideoCall ? "Play Video Recording" : "Play Audio Recording"}
          </button>
        </div>
      )}
    </div>
  );
}
