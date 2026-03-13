import React, { useState } from "react";
import DynamicHeader from "./sections/DynamicHeader";
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
import DynamicBottomNav from "./sections/DynamicBottomNav";

const SECTION_MAP = {
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

export default function DynamicAppRenderer({ data }) {
  if (!data) return null;

  const { appName, tagline, primaryColor, secondaryColor, headerStyle, sections, bottomNav } = data;

  return (
    <div className="min-h-full flex flex-col bg-[#0f0f1a]">
      <DynamicHeader
        appName={appName}
        tagline={tagline}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        style={headerStyle}
      />

      <div className="flex-1 pb-14">
        {sections?.map((section, i) => {
          if (section.type === "hero") return null; // hero è gestito dall'header
          const Component = SECTION_MAP[section.type];
          if (!Component) return null;
          return (
            <Component
              key={i}
              title={section.title}
              items={section.items || []}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          );
        })}
      </div>

      {bottomNav && bottomNav.length > 0 && (
        <DynamicBottomNav items={bottomNav} primaryColor={primaryColor} />
      )}
    </div>
  );
}