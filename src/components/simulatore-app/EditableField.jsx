import React, { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

export default function EditableField({ value, onChange, className, style, tag = "span", multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => { setText(value || ""); }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  if (!onChange) {
    const Tag = tag;
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  if (editing) {
    const sharedClass = `${className || ""} bg-transparent border border-purple-500/50 rounded px-1 outline-none focus:border-purple-400`;
    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => { setEditing(false); if (text !== value) onChange(text); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditing(false); if (text !== value) onChange(text); } }}
          className={sharedClass}
          style={{ ...style, minHeight: 40, resize: "none" }}
          rows={2}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { setEditing(false); if (text !== value) onChange(text); }}
        onKeyDown={e => { if (e.key === "Enter") { setEditing(false); if (text !== value) onChange(text); } }}
        className={sharedClass}
        style={style}
      />
    );
  }

  return (
    <span
      className={`${className || ""} relative group/edit cursor-pointer`}
      style={style}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {value}
      <Pencil className="w-2.5 h-2.5 text-purple-400 opacity-0 group-hover/edit:opacity-100 inline-block ml-1 transition-opacity" />
    </span>
  );
}