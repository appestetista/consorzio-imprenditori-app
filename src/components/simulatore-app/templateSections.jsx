// Genera sections strutturate per DynamicAppRenderer partendo da un template della libreria
// Ogni template diventa un'app completa con hero, menu/servizi, gallery, contatti, bottomNav
// Se pdfMenuData e' presente, i dati reali sostituiscono i placeholder

export function buildTemplateSections(template, pdfMenuData) {
  const t = template;
  const cat = t.category;

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
                  "Scopri di piu",
    }],
  };

  // Helper: genera sezioni menu_nav + menu_list dai dati reali PDF
  function buildRealMenuSections() {
    if (!pdfMenuData || !pdfMenuData.sections || pdfMenuData.sections.length === 0) return null;
    var navItems = pdfMenuData.sections.map(function(sec) { return { label: sec.section_title || "Altro" }; });
    var menuNav = { type: "menu_nav", items: navItems };
    var menuLists = pdfMenuData.sections.map(function(sec) {
      return {
        type: "menu_list",
        title: sec.section_title || "Altro",
        subtitle: "MENU",
        items: (sec.items || []).map(function(item, idx) {
          return {
            name: item.name || "Prodotto",
            description: item.description || "",
            price: item.price || "",
            image_url: item.image_url || "",
            badge: idx === 0 ? "Popolare" : undefined,
          };
        }),
      };
    });
    return [menuNav].concat(menuLists);
  }

  // Helper: converte i dati PDF in items per service_list / product_grid
  function buildRealServiceItems() {
    if (!pdfMenuData || !pdfMenuData.sections || pdfMenuData.sections.length === 0) return null;
    var result = [];
    pdfMenuData.sections.forEach(function(sec) {
      (sec.items || []).forEach(function(item, idx) {
        result.push({
          name: item.name || "Servizio",
          description: item.description || "",
          price: item.price || "Su richiesta",
          image_url: item.image_url || t.heroImage,
          badge: idx === 0 ? "Top" : undefined,
        });
      });
    });
    return result;
  }

  var realMenu = buildRealMenuSections();
  var realServices = buildRealServiceItems();

  // Placeholder per ristorazione
  function defaultRistorazioneSections() {
    return [
      { type: "menu_nav", items: [{ label: "Antipasti" }, { label: "Primi" }, { label: "Secondi" }, { label: "Dolci" }] },
      { type: "menu_list", title: "Antipasti", subtitle: "MENU", items: [
        { name: t.previewItems[0], description: "Ingredienti freschi selezionati", price: "14.00", image_url: t.heroImage, badge: "Popolare" },
        { name: "Bruschetta Classica", description: "Pomodorini, basilico, olio EVO", price: "8.00", image_url: t.heroImage },
        { name: "Carpaccio di Manzo", description: "Con rucola e parmigiano", price: "16.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Primi", subtitle: "MENU", items: [
        { name: t.previewItems[1], description: "Preparazione tradizionale", price: "18.00", image_url: t.heroImage, badge: "Chef Pick" },
        { name: "Spaghetti alle Vongole", description: "Vongole veraci, aglio, prezzemolo", price: "16.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Secondi", subtitle: "MENU", items: [
        { name: "Branzino al Forno", description: "Con patate e olive taggiasche", price: "22.00", image_url: t.heroImage },
        { name: "Tagliata di Manzo", description: "Con rucola e grana", price: "24.00", image_url: t.heroImage },
      ]},
      { type: "menu_list", title: "Dolci", subtitle: "MENU", items: [
        { name: t.previewItems[2], description: "Dolce della casa", price: "8.00", image_url: t.heroImage },
        { name: "Tiramisu", description: "Ricetta tradizionale", price: "7.00", image_url: t.heroImage },
      ]},
    ];
  }

  var galleryRistorante = { type: "gallery", title: "Il Locale", subtitle: "GALLERIA", items: [
    { title: "Sala Principale", image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400" },
    { title: "Terrazza", image_url: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=400" },
    { title: "Cucina a Vista", image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400" },
    { title: "Cantina", image_url: "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=400" },
  ]};
  var contactRistorante = { type: "contact", title: "Contattaci", subtitle: "INFO", items: [{
    email: "info@ristorante.it", phone: "+39 02 1234567",
    address: "Via Roma 1, Milano", hours: "12:00 - 23:00",
  }]};

  var galleryBeauty = { type: "gallery", title: "Il Nostro Studio", subtitle: "GALLERIA", items: [
    { title: "Reception", image_url: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=400" },
    { title: "Sala Trattamenti", image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400" },
    { title: "Area Relax", image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=400" },
    { title: "Prodotti", image_url: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400" },
  ]};
  var testimonialsBeauty = { type: "testimonials", title: "Recensioni", subtitle: "CLIENTI", items: [
    { name: "Laura M.", text: "Esperienza fantastica, tornero sicuramente!", rating: 5 },
    { name: "Marco R.", text: "Professionali e attenti ai dettagli.", rating: 5 },
  ]};
  var bookingBeauty = { type: "booking", title: "Prenota", subtitle: "APPUNTAMENTO", items: [{ buttonText: "Prenota Ora", description: "Scegli data e orario" }] };
  var contactBeauty = { type: "contact", title: "Dove Siamo", subtitle: "CONTATTI", items: [{
    email: "info@beautyspa.it", phone: "+39 02 9876543",
    address: "Via Montenapoleone 10, Milano", hours: "9:00 - 20:00",
  }]};

  var statsFitness = { type: "stats_grid", title: "I Numeri", subtitle: "STATISTICHE", items: [
    { label: "Iscritti", value: "500+" }, { label: "Corsi", value: "25" },
    { label: "Trainer", value: "12" }, { label: "Anni", value: "8" },
  ]};
  var pricingFitness = { type: "pricing", title: "Abbonamenti", subtitle: "PIANI", items: [
    { name: "Base", price: "E39/mese", features: ["Accesso palestra", "Spogliatoio"] },
    { name: "Premium", price: "E69/mese", features: ["Accesso palestra", "Tutti i corsi", "Personal trainer"], badge: "Consigliato" },
  ]};
  var contactFitness = { type: "contact", title: "Vieni a Trovarci", subtitle: "CONTATTI", items: [{
    email: "info@gymclub.it", phone: "+39 06 5551234",
    address: "Via dello Sport 5, Roma", hours: "6:00 - 23:00",
  }]};

  var featuresEcommerce = { type: "features", title: "Perche Sceglierci", subtitle: "VANTAGGI", items: [
    { name: "Spedizione Gratuita", description: "Su ordini sopra 50 euro" },
    { name: "Reso Facile", description: "30 giorni per ripensarci" },
    { name: "Pagamenti Sicuri", description: "SSL e 3D Secure" },
  ]};
  var testimonialsEcommerce = { type: "testimonials", title: "Recensioni", subtitle: "CLIENTI", items: [
    { name: "Giulia B.", text: "Qualita eccellente, spedizione velocissima!", rating: 5 },
    { name: "Andrea P.", text: "Prodotti come da foto, soddisfatto.", rating: 4 },
  ]};
  var contactEcommerce = { type: "contact", title: "Assistenza", subtitle: "CONTATTI", items: [{
    email: "shop@store.it", phone: "+39 800 123456",
    address: "Via del Commercio 20, Firenze", hours: "Lun-Ven 9:00-18:00",
  }]};

  var featuresDefault = { type: "features", title: "Perche Noi", subtitle: "VANTAGGI", items: [
    { name: "Esperienza", description: "Anni di attivita nel settore" },
    { name: "Qualita", description: "Standard elevati garantiti" },
    { name: "Assistenza", description: "Sempre a disposizione" },
  ]};
  var galleryDefault = { type: "gallery", title: "Gallery", subtitle: "IMMAGINI", items: [
    { title: "Il Nostro Team", image_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400" },
    { title: "I Nostri Spazi", image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400" },
    { title: "Al Lavoro", image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400" },
    { title: "Risultati", image_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400" },
  ]};
  var contactDefault = { type: "contact", title: "Contattaci", subtitle: "INFO", items: [{
    email: "info@azienda.it", phone: "+39 02 0001111",
    address: "Via Esempio 1, Milano", hours: "Lun-Ven 9:00-18:00",
  }]};

  // Builder per categoria
  function buildRistorazione() {
    var menuSections = realMenu || defaultRistorazioneSections();
    var result = [hero];
    result = result.concat(menuSections);
    result.push(galleryRistorante);
    result.push(contactRistorante);
    return result;
  }

  function buildBeauty() {
    var defaultServices = [
      { name: t.previewItems[0], description: "Trattamento professionale completo", price: "E65", duration: "60 min", image_url: t.heroImage, badge: "Top" },
      { name: t.previewItems[1], description: "Per una pelle radiosa", price: "E45", duration: "45 min", image_url: t.heroImage },
      { name: t.previewItems[2], description: "Rilassamento profondo", price: "E80", duration: "90 min", image_url: t.heroImage },
    ];
    var result = [hero];
    if (realMenu) {
      result = result.concat(realMenu);
    } else {
      result.push({ type: "service_list", title: "I Nostri Trattamenti", subtitle: "SERVIZI", items: realServices || defaultServices });
    }
    result.push(galleryBeauty, testimonialsBeauty, bookingBeauty, contactBeauty);
    return result;
  }

  function buildFitness() {
    var defaultServices = [
      { name: t.previewItems[0], description: "Allenamento ad alta intensita", price: "E15/lezione", image_url: t.heroImage, badge: "Popolare" },
      { name: t.previewItems[1], description: "Per tutti i livelli", price: "E12/lezione", image_url: t.heroImage },
      { name: t.previewItems[2], description: "Cardio e resistenza", price: "E10/lezione", image_url: t.heroImage },
    ];
    var result = [hero, statsFitness];
    if (realMenu) {
      result = result.concat(realMenu);
    } else {
      result.push({ type: "service_list", title: "Corsi e Attivita", subtitle: "PROGRAMMA", items: realServices || defaultServices });
    }
    result.push(pricingFitness, contactFitness);
    return result;
  }

  function buildEcommerce() {
    var defaultProducts = [
      { name: t.previewItems[0], price: "E49.00", image_url: t.heroImage, badge: "Nuovo" },
      { name: t.previewItems[1], price: "E79.00", image_url: t.heroImage, badge: "Bestseller" },
      { name: t.previewItems[2], price: "E129.00", image_url: t.heroImage },
      { name: "Accessorio Premium", price: "E35.00", image_url: t.heroImage },
    ];
    var result = [hero];
    if (realMenu) {
      result = result.concat(realMenu);
    } else {
      result.push({ type: "product_grid", title: "Prodotti in Evidenza", subtitle: "SHOP", items: realServices || defaultProducts });
    }
    result.push(featuresEcommerce, testimonialsEcommerce, contactEcommerce);
    return result;
  }

  function buildDefault() {
    var defaultServices = [
      { name: t.previewItems[0], description: "Servizio professionale", price: "Su richiesta", image_url: t.heroImage },
      { name: t.previewItems[1], description: "Consulenza specializzata", price: "Su richiesta", image_url: t.heroImage },
      { name: t.previewItems[2], description: "Supporto dedicato", price: "Su richiesta", image_url: t.heroImage },
    ];
    var result = [hero];
    if (realMenu) {
      result = result.concat(realMenu);
    } else {
      result.push({ type: "service_list", title: "I Nostri Servizi", subtitle: "SERVIZI", items: realServices || defaultServices });
    }
    result.push(featuresDefault, galleryDefault, contactDefault);
    return result;
  }

  var builders = {
    ristorazione: buildRistorazione,
    beauty: buildBeauty,
    fitness: buildFitness,
    ecommerce: buildEcommerce,
  };

  var builder = builders[cat] || buildDefault;
  var sections = builder();

  // BottomNav standard
  var bottomNav;
  if (cat === "ristorazione") {
    bottomNav = [
      { label: "Home", icon: "\uD83C\uDFE0", active: true },
      { label: "Menu", icon: "\uD83D\uDCCB" },
      { label: "Prenota", icon: "\uD83D\uDCC5" },
      { label: "Info", icon: "\uD83D\uDCCD" },
    ];
  } else if (cat === "beauty") {
    bottomNav = [
      { label: "Home", icon: "\uD83C\uDFE0", active: true },
      { label: "Servizi", icon: "\u2728" },
      { label: "Prenota", icon: "\uD83D\uDCDD" },
      { label: "Profilo", icon: "\uD83D\uDC64" },
    ];
  } else if (cat === "fitness") {
    bottomNav = [
      { label: "Home", icon: "\uD83C\uDFE0", active: true },
      { label: "Corsi", icon: "\uD83D\uDCCB" },
      { label: "Profilo", icon: "\uD83D\uDC64" },
      { label: "Info", icon: "\uD83D\uDCCD" },
    ];
  } else if (cat === "ecommerce") {
    bottomNav = [
      { label: "Home", icon: "\uD83C\uDFE0", active: true },
      { label: "Shop", icon: "\uD83D\uDECD\uFE0F" },
      { label: "Carrello", icon: "\uD83D\uDED2" },
      { label: "Profilo", icon: "\uD83D\uDC64" },
    ];
  } else {
    bottomNav = [
      { label: "Home", icon: "\uD83C\uDFE0", active: true },
      { label: "Servizi", icon: "\uD83D\uDCCB" },
      { label: "Contatti", icon: "\uD83D\uDCCD" },
      { label: "Profilo", icon: "\uD83D\uDC64" },
    ];
  }

  return {
    appName: t.name,
    tagline: t.target,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    accentColor: t.accentColor,
    darkMode: t.darkMode,
    fontStyle: t.fontStyle,
    headerStyle: "modern",
    sections: sections,
    bottomNav: bottomNav,
  };
}