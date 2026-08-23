import React from "react";

const APP_NAME = "Tzabtor";
const APP_VERSION = "1.1.0";
const APP_AUTHOR = "Tzabar Cohen";

export default function AboutModal({ onClose }) {
  return (
    <div className="about-backdrop" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close about-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="about-name">{APP_NAME}</div>
        <div className="about-version">Version {APP_VERSION}</div>
        <div className="about-author">By {APP_AUTHOR}</div>
      </div>
    </div>
  );
}
