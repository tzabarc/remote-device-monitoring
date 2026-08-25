import React from "react";
import { t } from "../i18n.js";

const LABEL_KEYS = { up: "statusLabelUp", down: "statusLabelDown", unknown: "statusLabelUnknown" };

export default function StatusDot({ status, hideLabel, lang }) {
  const label = LABEL_KEYS[status] ? t(lang, LABEL_KEYS[status]) : status;
  return (
    <span className={`status-dot status-${status}`} title={label}>
      <span className="dot" />
      {!hideLabel && label}
    </span>
  );
}
