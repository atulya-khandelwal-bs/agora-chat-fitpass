import { Message } from "../../../common/types/chat";
import React from "react";
import { validateImageUrl } from "../../utils/imageValidator";

interface FPMealPlanUpdatedViewProps {
  msg: Message;
}

export default function FPMealPlanUpdatedView({
  msg,
}: FPMealPlanUpdatedViewProps): React.JSX.Element {
  const iconsDetails = msg.system?.payload?.icons_details as
    | { left_icon?: string; right_icon?: string }
    | undefined;
  const title =
    msg.system?.payload?.title || msg.content || "Meal Plan Updated";

  // Extract redirection_details
  const redirectionDetails = msg.system?.payload?.redirection_details as
    | Array<{
        cta_details?: {
          text?: string;
          text_color?: string;
          bg_color?: string;
        };
        redirect_url?: string;
        action_id?: string;
      }>
    | undefined;

  // Get first redirect URL if available; whole bubble is clickable when present
  const redirectUrl = redirectionDetails?.[0]?.redirect_url;
  const hasLink = Boolean(redirectUrl);

  const handleClick = (): void => {
    if (redirectUrl) {
      if (
        redirectUrl.startsWith("http://") ||
        redirectUrl.startsWith("https://")
      ) {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = redirectUrl;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (hasLink && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        position: "relative",
        margin: "0.15rem 0",
      }}
    >
      {/* Left line */}
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "#E5E7EB",
        }}
      />
      {/* Slim bubble: icon + title only; whole area clickable when link present */}
      <div
        role={hasLink ? "button" : undefined}
        tabIndex={hasLink ? 0 : undefined}
        onKeyDown={hasLink ? handleKeyDown : undefined}
        onClick={hasLink ? handleClick : undefined}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          margin: "0 6px",
          padding: "4px 8px",
          width: "fit-content",
          background: hasLink ? "#EFF6FF" : "#f3f4f6",
          color: hasLink ? "#1e40af" : "#111827",
          borderRadius: "6px",
          boxShadow: hasLink
            ? "0 1px 1px rgba(30, 64, 175, 0.12), inset 0 0 0 1px rgba(30, 64, 175, 0.18)"
            : "inset 0 0 0 1px #e5e7eb",
          position: "relative",
          zIndex: 1,
          cursor: hasLink ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
          transition: "background 0.15s ease, transform 0.1s ease",
        }}
        onTouchStart={
          hasLink
            ? (e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(0.98)";
              }
            : undefined
        }
        onTouchEnd={
          hasLink
            ? (e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              }
            : undefined
        }
      >
        <img
          src={validateImageUrl(iconsDetails?.left_icon, "icon", "ForkKnife")}
          alt=""
          style={{ width: "12px", height: "12px", flexShrink: 0 }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
      </div>
      {/* Right line */}
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "#E5E7EB",
        }}
      />
    </div>
  );
}
