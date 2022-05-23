import type { CalendarEvent } from "@calcom/types/Calendar";

const sendPayload = async (
  triggerEvent: string,
  createdAt: string,
  data: CalendarEvent & {
    metadata?: { [key: string]: string | number };
    rescheduleUid?: string;
  }
) => {
  if (!data) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const url = process.env.WOMBO_BOOKING_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing required url to send webhook payload.");
  }

  data.description = data.description || data.additionalNotes;

  let body = JSON.stringify({
    triggerEvent: triggerEvent,
    createdAt: createdAt,
    payload: data,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    message: text,
  };
};

export default sendPayload;
