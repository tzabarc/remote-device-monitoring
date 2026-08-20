import React from "react";

const LABELS = { up: "Up", down: "Down", unknown: "Unknown" };

export default function StatusDot({ status, hideLabel }) {
  return (
    <span className={`status-dot status-${status}`} title={LABELS[status] || status}>
      <span className="dot" />
      {!hideLabel && (LABELS[status] || status)}
    </span>
  );
}
