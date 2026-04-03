import { Contact } from "../../common/types/chat";
import React from "react";

interface FPInfoTabProps {
  selectedContact: Contact | null;
}

// Format date to "11 Nov, 2025 12:20 pm" format
const formatChatInitiationDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  const day = dateObj.getDate();
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
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${day} ${month}, ${year} ${hours}:${minutesStr} ${ampm}`;
};

export default function FPInfoTab({
  selectedContact,
}: FPInfoTabProps): React.JSX.Element {
  const formattedDate = selectedContact?.createdAt
    ? formatChatInitiationDate(selectedContact.createdAt)
    : null;

  return (
    <div className="tab-content">
      <div className="info-content">
        {formattedDate && (
          <div
            style={{
              backgroundColor: "#FCE7F3",
              color: "#000000",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 400, marginBottom: "0.25rem" }}>
              Chat initiated on
            </div>
            <div style={{ fontWeight: 600 }}>
              {formattedDate} – {selectedContact?.name || "User"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
