import React, { useState } from "react";
import { Search, ShoppingCart, Heart } from "lucide-react";

const PRODUCTS = [
  { id: 1, nome: "Giacca Vintage", prezzo: 89, img: "🧥", tag: "Nuovo" },
  { id: 2, nome: "Sneakers Limited", prezzo: 129, img: "👟", tag: "Top" },
  { id: 3, nome: "Borsa Artigianale", prezzo: 65, img: "👜", tag: null },
  { id: 4, nome: "Occhiali Retro", prezzo: 45, img: "🕶️", tag: "Sale" },
  { id: 5, nome: "Orologio Classic", prezzo: 199, img: "⌚", tag: null },
  { id: 6, nome: "Cappello Lana", prezzo: 35, img: "🧢", tag: "Nuovo" },
];

export default function EcommerceTemplate({ nome }) {
  const [cart, setCart] = useState([]);
  const [liked, setLiked] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const toggleLike = (id) => setLiked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addCart = (p) => setCart(prev => [...prev, p]);
  const totale = cart.reduce((s, p) => s + p.prezzo, 0);

  return (
    <div className="min-h-full bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="text-base font-black text-white">{nome || "Shop"}</h2>
        <div className="flex gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <button onClick={() => setShowCart(!showCart)} className="relative">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-600 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-3 mb-3 rounded-xl p-4" style={{ background: "linear-gradient(135deg, #6b21a8, #9333ea)" }}>
        <p className="text-[10px] text-purple-200">Nuova collezione</p>
        <p className="text-sm font-bold text-white mt-0.5">Spedizione gratuita sopra €50</p>
      </div>

      {/* Mini cart */}
      {showCart && cart.length > 0 && (
        <div className="mx-3 mb-3 bg-[#1a1a2e] rounded-xl p-3 border border-purple-500/20">
          <p className="text-[10px] text-purple-400 font-medium mb-2">Carrello ({cart.length})</p>
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-300 py-0.5">
              <span>{item.nome}</span>
              <span className="text-purple-400">€{item.prezzo}</span>
            </div>
          ))}
          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-white">€{totale}</span>
            <button className="px-3 py-1 bg-purple-600 rounded-lg text-xs font-bold text-white">
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Griglia prodotti */}
      <div className="flex-1 px-3 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {PRODUCTS.map(p => (
            <div key={p.id} className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5">
              <div className="h-24 flex items-center justify-center text-4xl bg-[#12121f] relative">
                {p.img}
                {p.tag && (
                  <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    p.tag === "Sale" ? "bg-red-500 text-white" : "bg-purple-600 text-white"
                  }`}>{p.tag}</span>
                )}
                <button onClick={() => toggleLike(p.id)} className="absolute top-1.5 right-1.5">
                  <Heart className={`w-3.5 h-3.5 ${liked.includes(p.id) ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
                </button>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-white truncate">{p.nome}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-black text-purple-400">€{p.prezzo}</span>
                  <button
                    onClick={() => addCart(p)}
                    className="w-6 h-6 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-400 text-xs font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}