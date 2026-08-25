import React from "react";
import { t } from "../i18n.js";

const LABEL_KEYS = { up: "statusLabelUp", down: "statusLabelDown", unknown: "statusLabelUnknown" };

export default function StatusDot({ status, hideLabel, lang, pending }) {
  const label = pending ? t(lang, "statusLabelPending") : t(lang, LABEL_KEYS[status] || "statusLabelUnknown");
  return (
    <span className={`status-dot ${pending ? "status-pending" : `status-${status}`}`} title={label}>
      <span className="dot" />
      {!hideLabel && label}
    </span>
  );
}
