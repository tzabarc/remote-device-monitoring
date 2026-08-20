import React from "react";
import { TYPE_LABELS, TYPE_ICONS } from "../format.js";

export default function TypeFilter({ types, selected, onToggle, onClear }) {
  if (types.length === 0) return null;

  return (
    <section className="type-filter">
      <div className="type-filter-header">
        <h2>Filter by type</h2>
        {selected.size > 0 && (
          <button className="type-filter-clear" onClick={onClear}>
            Clear
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
            {TYPE_ICONS[type] || "•"} {TYPE_LABELS[type] || type}
          </button>
        ))}
      </div>
    </section>
  );
}
