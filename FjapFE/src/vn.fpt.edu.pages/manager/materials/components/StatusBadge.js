import React from "react";
export default function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const cls = s === "active" ? "badge active" : "badge inactive";
  return <span className={cls}>{status || (s==="active"?"Active":"Inactive")}</span>;
}
