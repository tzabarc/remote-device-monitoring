import React from "react";
import { CHANGELOG } from "../changelog.js";
import { t } from "../i18n.js";

const APP_NAME = "Tzabtor";
const APP_VERSION = "2.2.0";
const APP_AUTHOR = "Tzabar Cohen";

export default function AboutModal({ onClose, lang }) {
  return (
    <div className="about-backdrop" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close about-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="about-name">{APP_NAME}</div>
        <div className="about-version">
          {t(lang, "version")} {APP_VERSION}
        </div>
        <div className="about-author">{t(lang, "by", { author: APP_AUTHOR })}</div>

        <div className="about-changelog">
          <div className="about-changelog-title">{t(lang, "whatsNew")}</div>
          <div className="about-changelog-list">
            {CHANGELOG.map((release) => (
              <div className="about-release" key={release.version}>
                <div className="about-release-header">
                  <span className="about-release-version">v{release.version}</span>
                  <span className="about-release-date">{release.date}</span>
                </div>
                <ul>
                  {release.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
