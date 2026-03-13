import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EditableImage({ src, alt, className, style, onChange, children }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  if (!onChange) {
    if (children) return children;
    return <img src={src} alt={alt || ""} className={className} style={style} onError={e => { e.target.style.display = "none"; }} />;
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative group/img cursor-pointer" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
      {children || (
        <img src={src} alt={alt || ""} className={className} style={style} onError={e => { e.target.style.display = "none"; }} />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-inherit pointer-events-none">
        {uploading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white" />
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
}