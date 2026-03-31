import React from "react";
import { formatTextWithTags } from "../../utils/textFormatter";

interface FPTextMessageViewProps {
  content: string | object | null | undefined;
}

export default function FPTextMessageView({
  content,
}: FPTextMessageViewProps): React.JSX.Element {
  // Normalize to string
  const contentToRender =
    typeof content === "string"
      ? content
      : typeof content === "object"
      ? (content as { body?: string }).body || JSON.stringify(content)
      : String(content || "");

  // Preserve line breaks and allow simple tags (<b>, <i>, <u>, <s>) via formatTextWithTags
  const lines = contentToRender.split(/\r?\n/);

  return (
    <div className="message-text">
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {formatTextWithTags(line)}
        </React.Fragment>
      ))}
    </div>
  );
}
