// Genera sections strutturate per DynamicAppRenderer partendo da un template della libreria
// Ogni template diventa un'app completa con hero, menu/servizi, gallery, contatti, bottomNav

export function buildTemplateSections(template, pdfMenuData) {
  const t = template;
  const cat = t.category;

  // Hero banner — sempre presente
  const hero = {
    type: "hero_banner",
    title: t.name,
    items: [{
      headline: t.name,
      subtitle: t.target,
      image_url: t.heroImage,
      buttonText: cat === "ristorazione" ? "Scopri il Menu" :
                  cat === "beauty" ? "Prenota Ora" :
                  cat === "fitness" ? "Inizia Oggi" :
                  cat === "ecommerce" ? "Acquista Ora" :
                  cat === "turismo" ? "Esplora" :
                  cat === "salute" ? "Prenota Visita" :
                  "Scopri di più",
    }],
  };

  // Helper: se ci sono dati reali dal PDF, genera menu_nav + menu_list reali
  const buildRealMenuSections = () => {
    if (!pdfMenuData?.sections?.length) return null;
    const navItems = pdfMenuData.sections.map(sec => ({ label: sec.section_title || "Altro" }));
    const menuNav = { type: "menu_nav", items: navItems };
    const menuLists = pdfMenuData.sections.map(sec => ({
      type: "menu_list",
      title: sec.section_title || "Altro",
      subtitle: "MENU",
      items: (sec.items || []).map((item, idx) => ({
        name: item.name || "Prodotto",
        description: item.description || "",
        price: item.price || "",
        image_url: item.image_url || "",
        badge: idx === 0 ? "Popolare" : undefined,
      })),
    }));
    return [menuNav, ...menuLists];
  };

  const realMenu = buildRealMenuSections();

  // Sezioni specifiche per categoria
  const sectionsByCategory = {
    ristorazione: () => {
      // Se ci sono dati reali dal PDF, usa quelli al posto dei placeholder
      if (realMenu) return [hero, ...realMenu];
      return [
      hero,
      { type: "menu_nav", items: [{ label: "Antipasti" }, { label: "Primi" }, { label: "Secondi" }, { label: "Dolci" }] },
      { type: "menu_list", title: "Antipasti", subtitle: "MENU", items: [
        { name: t.previewItems[0], description: "Ingredienti freschi selezionati", price: "14.00", image_url: t.heroImage, badge: "Popolare" },
        { name: "Bruschetta Classica", description: "Pomodorini, basilico, olio EVO", price: "8.00", image_url: t.heroImage },
        { name: "Carpaccio di Manzo", description: "Con rucola e parmigiano", price: "16.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Primi", subtitle: "MENU", items: [
        { name: t.previewItems[1], description: "Preparazione tradizionale", price: "18.00", image_url: t.heroImage, badge: "Chef's Pick" },
        { name: "Spaghetti alle Vongole", description: "Vongole veraci, aglio, prezzemolo", price: "16.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Secondi", subtitle: "MENU", items: [
        { name: "Branzino al Forno", description: "Con patate e olive taggiasche", price: "22.00", image_url: t.heroImage },
        { name: "Tagliata di Manzo", description: "Con rucola e grana", price: "24.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Dolci", subtitle: "MENU", items: [
        { name: t.previewItems[2], description: "Dolce della casa", price: "8.00", image_url: t.heroImage },
        { name: "Tiramisù", description: "Ricetta tradizionale", price: "7.00", image_url: t.heroImage },
      ]},
    ]},
      { type: "gallery", title: "Il Locale", subtitle: "GALLERIA", items: [
        { title: "Sala Principale", image_url: t.heroImage },
        { title: "Terrazza", image_url: t.heroImage },
        { title: "Cucina a Vista", image_url: t.heroImage },
        { title: "Cantina", image_url: t.heroImage },
      ]},
      { type: "contact", title: "Contattaci", subtitle: "INFO", items: [{
        email: "info@ristorante.it", phone: "+39 02 1234567",
        address: "Via Roma 1, Milano", hours: "12:00 - 23:00",
      }]},
    ],
    beauty: () => [
      hero,
      { type: "service_list", title: "I Nostri Trattamenti", subtitle: "SERVIZI", items: [
        { name: t.previewItems[0], description: "Trattamento professionale completo", price: "€65", duration: "60 min", image_url: t.heroImage, badge: "Top" },
        { name: t.previewItems[1], description: "Per una pelle radiosa", price: "€45", duration: "45 min", image_url: t.heroImage },
        { name: t.previewItems[2], description: "Rilassamento profondo", price: "€80", duration: "90 min", image_url: t.heroImage },
      ]},
      { type: "gallery", title: "Il Nostro Studio", subtitle: "GALLERIA", items: [
        { title: "Reception", image_url: t.heroImage },
        { title: "Sala Trattamenti", image_url: t.heroImage },
        { title: "Area Relax", image_url: t.heroImage },
        { title: "Prodotti", image_url: t.heroImage },
      ]},
      { type: "testimonials", title: "Recensioni", subtitle: "CLIENTI", items: [
        { name: "Laura M.", text: "Esperienza fantastica, tornerò sicuramente!", rating: 5 },
        { name: "Marco R.", text: "Professionali e attenti ai dettagli.", rating: 5 },
      ]},
      { type: "booking", title: "Prenota", subtitle: "APPUNTAMENTO", items: [{ buttonText: "Prenota Ora", description: "Scegli data e orario" }] },
      { type: "contact", title: "Dove Siamo", subtitle: "CONTATTI", items: [{
        email: "info@beautyspa.it", phone: "+39 02 9876543",
        address: "Via Montenapoleone 10, Milano", hours: "9:00 - 20:00",
      }]},
    ],
    fitness: () => [
      hero,
      { type: "stats_grid", title: "I Numeri", subtitle: "STATISTICHE", items: [
        { label: "Iscritti", value: "500+" }, { label: "Corsi", value: "25" },
        { label: "Trainer", value: "12" }, { label: "Anni", value: "8" },
      ]},
      { type: "service_list", title: "Corsi & Attività", subtitle: "PROGRAMMA", items: [
        { name: t.previewItems[0], description: "Allenamento ad alta intensità", price: "€15/lezione", image_url: t.heroImage, badge: "Popolare" },
        { name: t.previewItems[1], description: "Per tutti i livelli", price: "€12/lezione", image_url: t.heroImage },
        { name: t.previewItems[2], description: "Cardio e resistenza", price: "€10/lezione", image_url: t.heroImage },
      ]},
      { type: "pricing", title: "Abbonamenti", subtitle: "PIANI", items: [
        { name: "Base", price: "€39/mese", features: ["Accesso palestra", "Spogliatoio"] },
        { name: "Premium", price: "€69/mese", features: ["Accesso palestra", "Tutti i corsi", "Personal trainer"], badge: "Consigliato" },
      ]},
      { type: "contact", title: "Vieni a Trovarci", subtitle: "CONTATTI", items: [{
        email: "info@gymclub.it", phone: "+39 06 5551234",
        address: "Via dello Sport 5, Roma", hours: "6:00 - 23:00",
      }]},
    ],
    ecommerce: () => [
      hero,
      { type: "product_grid", title: "Prodotti in Evidenza", subtitle: "SHOP", items: [
        { name: t.previewItems[0], price: "€49.00", image_url: t.heroImage, badge: "Nuovo" },
        { name: t.previewItems[1], price: "€79.00", image_url: t.heroImage, badge: "Bestseller" },
        { name: t.previewItems[2], price: "€129.00", image_url: t.heroImage },
        { name: "Accessorio Premium", price: "€35.00", image_url: t.heroImage },
      ]},
      { type: "features", title: "Perché Sceglierci", subtitle: "VANTAGGI", items: [
        { name: "Spedizione Gratuita", description: "Su ordini sopra €50" },
        { name: "Reso Facile", description: "30 giorni per ripensarci" },
        { name: "Pagamenti Sicuri", description: "SSL e 3D Secure" },
      ]},
      { type: "testimonials", title: "Recensioni", subtitle: "CLIENTI", items: [
        { name: "Giulia B.", text: "Qualità eccellente, spedizione velocissima!", rating: 5 },
        { name: "Andrea P.", text: "Prodotti come da foto, soddisfatto.", rating: 4 },
      ]},
      { type: "contact", title: "Assistenza", subtitle: "CONTATTI", items: [{
        email: "shop@store.it", phone: "+39 800 123456",
        address: "Via del Commercio 20, Firenze", hours: "Lun-Ven 9:00-18:00",
      }]},
    ],
    _default: () => [
      hero,
      { type: "service_list", title: "I Nostri Servizi", subtitle: "SERVIZI", items: [
        { name: t.previewItems[0], description: "Servizio professionale", price: "Su richiesta", image_url: t.heroImage },
        { name: t.previewItems[1], description: "Consulenza specializzata", price: "Su richiesta", image_url: t.heroImage },
        { name: t.previewItems[2], description: "Supporto dedicato", price: "Su richiesta", image_url: t.heroImage },
      ]},
      { type: "features", title: "Perché Noi", subtitle: "VANTAGGI", items: [
        { name: "Esperienza", description: "Anni di attività nel settore" },
        { name: "Qualità", description: "Standard elevati garantiti" },
        { name: "Assistenza", description: "Sempre a disposizione" },
      ]},
      { type: "gallery", title: "Gallery", subtitle: "IMMAGINI", items: [
        { title: "Il Nostro Team", image_url: t.heroImage },
        { title: "I Nostri Spazi", image_url: t.heroImage },
        { title: "Al Lavoro", image_url: t.heroImage },
        { title: "Risultati", image_url: t.heroImage },
      ]},
      { type: "contact", title: "Contattaci", subtitle: "INFO", items: [{
        email: "info@azienda.it", phone: "+39 02 0001111",
        address: "Via Esempio 1, Milano", hours: "Lun-Ven 9:00-18:00",
      }]},
    ],
  };

  const builder = sectionsByCategory[cat] || sectionsByCategory._default;
  const sections = builder();

  // BottomNav standard
  const bottomNav = cat === "ristorazione"
    ? [{ label: "Home", icon: "🏠", active: true }, { label: "Menu", icon: "📋" }, { label: "Prenota", icon: "📅" }, { label: "Info", icon: "📍" }]
    : cat === "beauty"
    ? [{ label: "Home", icon: "🏠", active: true }, { label: "Servizi", icon: "✨" }, { label: "Prenota", icon: "📝" }, { label: "Profilo", icon: "👤" }]
    : cat === "fitness"
    ? [{ label: "Home", icon: "🏠", active: true }, { label: "Corsi", icon: "📋" }, { label: "Profilo", icon: "👤" }, { label: "Info", icon: "📍" }]
    : cat === "ecommerce"
    ? [{ label: "Home", icon: "🏠", active: true }, { label: "Shop", icon: "🛍️" }, { label: "Carrello", icon: "🛒" }, { label: "Profilo", icon: "👤" }]
    : [{ label: "Home", icon: "🏠", active: true }, { label: "Servizi", icon: "📋" }, { label: "Contatti", icon: "📍" }, { label: "Profilo", icon: "👤" }];

  return {
    appName: t.name,
    tagline: t.target,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    accentColor: t.accentColor,
    darkMode: t.darkMode,
    fontStyle: t.fontStyle,
    headerStyle: "modern",
    sections,
    bottomNav,
  };
}