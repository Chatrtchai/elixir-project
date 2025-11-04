// src/lib/history.js

export const HISTORY_TYPES = ["transaction", "request_transaction"];

export const HISTORY_TYPE_LABELS = {
  transaction: "คลังของ",
  request_transaction: "รายการคำขอสั่งซื้อ",
};

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  second: "2-digit",
  minute: "2-digit",
  hour: "2-digit",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatHistoryDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return HISTORY_DATE_FORMATTER.format(date);
}
