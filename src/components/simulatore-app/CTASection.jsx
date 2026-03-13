import React, { useState } from "react";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function CTASection({ onReset }) {
  const [sent, setSent] = useState(false);

  const handleContact = async () => {
    setSent(true);
    toast.success("Richiesta inviata! Ti contatteremo presto.");
  };

  return (
    <div className="mt-8 text-center">
      <p className="text-sm text-gray-400 mb-5">Questo potrebbe essere tuo. Davvero.</p>
      <div className="flex gap-3 justify-center">
        {!sent ? (
          <button
            onClick={handleContact}
            className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all"
          >
            Lo voglio, parliamone
          </button>
        ) : (
          <div className="px-6 py-3 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 font-bold text-sm">
            ✓ Richiesta inviata!
          </div>
        )}
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl bg-[#1a2035] border border-white/10 text-gray-300 font-medium text-sm hover:border-white/20 transition-all flex items-center gap-2"
        >
          <ArrowDown className="w-3.5 h-3.5" /> Prova un'altra idea
        </button>
      </div>
    </div>
  );
}