import React, { useState, useCallback } from "react";
import DynamicHeader from "./sections/DynamicHeader";
import HeroBannerSection from "./sections/HeroBannerSection";
import MenuListSection from "./sections/MenuListSection";
import ProductGridSection from "./sections/ProductGridSection";
import ServiceListSection from "./sections/ServiceListSection";
import StatsGridSection from "./sections/StatsGridSection";
import ActivityFeedSection from "./sections/ActivityFeedSection";
import GallerySection from "./sections/GallerySection";
import CtaBannerSection from "./sections/CtaBannerSection";
import BookingSection from "./sections/BookingSection";
import ContactSection from "./sections/ContactSection";
import PricingSection from "./sections/PricingSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import FeaturesSection from "./sections/FeaturesSection";
import MenuNavSection from "./sections/MenuNavSection";
import CartBar from "./sections/CartBar";
import DynamicBottomNav from "./sections/DynamicBottomNav";

const SECTION_MAP = {
  menu_nav: MenuNavSection,
  hero_banner: HeroBannerSection,
  menu_list: MenuListSection,
  product_grid: ProductGridSection,
  service_list: ServiceListSection,
  stats_grid: StatsGridSection,
  activity_feed: ActivityFeedSection,
  gallery: GallerySection,
  cta_banner: CtaBannerSection,
  booking: BookingSection,
  contact: ContactSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  features: FeaturesSection,
};

export default function DynamicAppRenderer({ data, editable, onDataChange }) {
  if (!data) return null;

  const { appName, tagline, logoUrl, primaryColor, secondaryColor, accentColor, headerStyle, darkMode, fontStyle, sections, bottomNav } = data;

  // Global cart state
  const [cart, setCart] = useState([]);

  const handleAddToCart = useCallback((item) => {
    const price = parseFloat(String(item.price).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    setCart(prev => {
      const existing = prev.findIndex(c => c.name === item.name && c.price === price);
      if (existing >= 0) {
        return prev.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { name: item.name, price, qty: 1 }];
    });
  }, []);

  const handleRemoveFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateCartQty = useCallback((index, qty) => {
    setCart(prev => prev.map((c, i) => i === index ? { ...c, qty } : c));
  }, []);

  const handleItemChange = (sectionIndex, itemIndex, field, value) => {
    if (!onDataChange) return;
    const newData = { ...data, sections: data.sections.map((s, si) => {
      if (si !== sectionIndex) return s;
      return { ...s, items: s.items.map((item, ii) => {
        if (ii !== itemIndex) return item;
        return { ...item, [field]: value };
      })};
    })};
    onDataChange(newData);
  };

  const handleSectionChange = (sectionIndex, field, value) => {
    if (!onDataChange) return;
    const newData = { ...data, sections: data.sections.map((s, si) => {
      if (si !== sectionIndex) return s;
      return { ...s, [field]: value };
    })};
    onDataChange(newData);
  };

  // Scroll to category section
  const handleCategoryClick = (label) => {
    const el = document.getElementById(`menu-section-${label.replace(/\s+/g, '-').toLowerCase()}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: darkMode === false ? (secondaryColor || "#fafafa") : "#0a0a0a" }}>
      {/* Decorative vertical text */}
      {darkMode !== false && (
        <div className="fixed right-1 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <span className="text-[7px] text-white/[0.04] tracking-[0.35em] font-semibold uppercase" style={{ writingMode: "vertical-rl" }}>
            ESPLORA
          </span>
        </div>
      )}

      <DynamicHeader
        appName={appName}
        tagline={tagline}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        style={headerStyle}
        fontStyle={fontStyle}
        darkMode={darkMode}
        editable={editable}
        onAppNameChange={editable && onDataChange ? (v) => onDataChange({ ...data, appName: v }) : null}
        onTaglineChange={editable && onDataChange ? (v) => onDataChange({ ...data, tagline: v }) : null}
      />

      <div className={`flex-1 relative z-10 ${cart.length > 0 ? "pb-28" : "pb-16"}`}>
        {sections?.map((section, i) => {
          if (section.type === "hero") return null;
          const Component = SECTION_MAP[section.type];
          if (!Component) return null;

          // For menu_nav, pass category click handler; for menu_list, pass cart handler
          const extraProps = section.type === "menu_nav"
            ? { onCategoryClick: handleCategoryClick }
            : section.type === "menu_list"
              ? { onAddToCart: handleAddToCart }
              : {};

          // Add anchor id for menu_list sections so menu_nav can scroll to them
          const anchorId = section.type === "menu_list" && section.title
            ? `menu-section-${section.title.replace(/\s+/g, '-').toLowerCase()}`
            : undefined;

          return (
            <div key={i} id={anchorId} data-section-type={section.type}>
              {i > 0 && section.type !== "menu_nav" && <div className="mx-6 h-px" style={{ background: darkMode === false ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)" }} />}
              <Component
                title={section.title}
                subtitle={section.subtitle}
                items={section.items || []}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor || primaryColor}
                accentColor={accentColor || primaryColor}
                editable={editable}
                onItemChange={(itemIndex, field, value) => handleItemChange(i, itemIndex, field, value)}
                onSectionChange={(field, value) => handleSectionChange(i, field, value)}
                {...extraProps}
              />
            </div>
          );
        })}
      </div>

      <CartBar
        cart={cart}
        primaryColor={primaryColor}
        darkMode={darkMode}
        onRemove={handleRemoveFromCart}
        onUpdateQty={handleUpdateCartQty}
      />

      {bottomNav && bottomNav.length > 0 && cart.length === 0 && (
        <DynamicBottomNav items={bottomNav} primaryColor={primaryColor} darkMode={darkMode} />
      )}
    </div>
  );
}