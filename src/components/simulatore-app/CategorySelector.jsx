import React from "react";

export default function CategorySelector({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            selected === cat.id
              ? "bg-purple-600/20 border-purple-500 text-purple-300"
              : "bg-[#1a2035] border-white/10 text-gray-300 hover:border-white/20"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}