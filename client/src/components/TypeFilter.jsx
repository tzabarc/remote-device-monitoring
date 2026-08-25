import React from "react";
import { TYPE_ICONS } from "../format.js";
import { t, typeLabel } from "../i18n.js";

export default function TypeFilter({ types, selected, onToggle, onClear, lang }) {
  if (types.length === 0) return null;

  return (
    <section className="type-filter">
      <div className="type-filter-header">
        <h2>{t(lang, "filterByType")}</h2>
        {selected.size > 0 && (
          <button className="type-filter-clear" onClick={onClear}>
            {t(lang, "clear")}
          </button>
        )}
      </div>
      <div className="type-filter-chips">
        {types.map((type) => (
          <button
            key={type}
            className={`type-chip${selected.has(type) ? " active" : ""}`}
            onClick={() => onToggle(type)}
          >
            {TYPE_ICONS[type] || "•"} {typeLabel(lang, type)}
          </button>
        ))}
      </div>
    </section>
  );
}
