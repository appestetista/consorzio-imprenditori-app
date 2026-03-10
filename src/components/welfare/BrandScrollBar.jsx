import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Logo URLs per brand noti (cercati via web/CDN affidabili)
const brandLogos = {
  // Alimentari / Supermercati
  "Esselunga": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Esselunga_logo.svg/200px-Esselunga_logo.svg.png",
  "Conad": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Conad_logo.svg/200px-Conad_logo.svg.png",
  "Coop": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Logo_Coop_Italia.svg/200px-Logo_Coop_Italia.svg.png",
  "Carrefour": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/200px-Carrefour_logo.svg.png",
  "Eurospin": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Eurospin_logo.svg/200px-Eurospin_logo.svg.png",
  "Penny Market": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Penny-Logo.svg/200px-Penny-Logo.svg.png",
  "PENNY": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Penny-Logo.svg/200px-Penny-Logo.svg.png",
  "Bennet": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bennet_logo.svg/200px-Bennet_logo.svg.png",
  "Famila": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Famila.svg/200px-Famila.svg.png",
  "Despar": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Spar-logo.svg/200px-Spar-logo.svg.png",
  "DESPAR": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Spar-logo.svg/200px-Spar-logo.svg.png",
  "Sigma": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Sigma_supermarkets_logo.svg/200px-Sigma_supermarkets_logo.svg.png",
  "Todis": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Todis_logo.svg/200px-Todis_logo.svg.png",
  "Pam Panorama": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Logo_Pam_Panorama.svg/200px-Logo_Pam_Panorama.svg.png",
  "MD": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Logo_MD_SpA.svg/200px-Logo_MD_SpA.svg.png",
  "Iperal": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Logo_iperal.svg/200px-Logo_iperal.svg.png",
  // E-commerce / Tech
  "Amazon": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png",
  "Zalando": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Zalando_logo.svg/200px-Zalando_logo.svg.png",
  "Nike": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png",
  "IKEA": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/200px-Ikea_logo.svg.png",
  "H&M": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/200px-H%26M-Logo.svg.png",
  "Decathlon": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Decathlon_Logo.svg/200px-Decathlon_Logo.svg.png",
  "Mediaworld": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/MediaWorld_Logo_2021.svg/200px-MediaWorld_Logo_2021.svg.png",
  "Spotify": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Spotify_logo_with_text.svg/200px-Spotify_logo_with_text.svg.png",
  "Deliveroo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Deliveroo_logo_%282016%29.svg/200px-Deliveroo_logo_%282016%29.svg.png",
  "Glovo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Glovo_logo.svg/200px-Glovo_logo.svg.png",
  "Airbnb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/200px-Airbnb_Logo_B%C3%A9lo.svg.png",
  "Trenitalia": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Trenitalia_logo.svg/200px-Trenitalia_logo.svg.png",
  "Flixbus": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/FlixBus_201x_logo.svg/200px-FlixBus_201x_logo.svg.png",
  "Sephora": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sephora_logo.svg/200px-Sephora_logo.svg.png",
  "Douglas": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Douglas_Logo.svg/200px-Douglas_Logo.svg.png",
  "Unieuro": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Unieuro_logo.svg/200px-Unieuro_logo.svg.png",
  "Nespresso": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Nespresso-logo.svg/200px-Nespresso-logo.svg.png",
  "OVS": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/OVS_%28company%29_logo.svg/200px-OVS_%28company%29_logo.svg.png",
  "Mondadori": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Mondadori_logo.svg/200px-Mondadori_logo.svg.png",
  "Italo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Italo_logo.svg/200px-Italo_logo.svg.png",
  "TheFork": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TheFork_logo.svg/200px-TheFork_logo.svg.png",
  "Old Wild West": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Old_Wild_West_logo.svg/200px-Old_Wild_West_logo.svg.png",
  "GameStop": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/GameStop_logo.svg/200px-GameStop_logo.svg.png",
  "Roadhouse": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Roadhouse_Restaurant_logo.svg/200px-Roadhouse_Restaurant_logo.svg.png",
  "Bimbostore": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Bimbostore_logo.svg/200px-Bimbostore_logo.svg.png",
  "la Feltrinelli": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/La_Feltrinelli_logo.svg/200px-La_Feltrinelli_logo.svg.png",
  "Prénatal": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Prenatal_logo.svg/200px-Prenatal_logo.svg.png",
  "Toys": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Toys_%22R%22_Us_logo.svg/200px-Toys_%22R%22_Us_logo.svg.png",
  "Nintendo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png",
  "PlayStation": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/PlayStation_logo.svg/200px-PlayStation_logo.svg.png",
  "Xbox Game Pass Ultimate": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Xbox_one_logo.svg/200px-Xbox_one_logo.svg.png",
  "Xbox Live": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Xbox_one_logo.svg/200px-Xbox_one_logo.svg.png",
  "FAO Schwarz": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/FAO_Schwarz_logo.svg/200px-FAO_Schwarz_logo.svg.png",
  // Animali
  "Zoologos": "https://www.zoologos.it/wp-content/uploads/2020/09/logo-zoologos.png",
  "Arcaplanet": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Arcaplanet_logo.svg/200px-Arcaplanet_logo.svg.png",
  // Bellezza & Cura
  "Acqua & Sapone": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Logo_Acqua_%26_Sapone.svg/200px-Logo_Acqua_%26_Sapone.svg.png",
  "Coin": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Coin_logo.svg/200px-Coin_logo.svg.png",
  "EsserBella": "https://www.esserbella.it/images/logo-esserbella.png",
  "Tigotà": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tigot%C3%A0_logo.svg/200px-Tigot%C3%A0_logo.svg.png",
  "Bottega Verde": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Bottega_Verde_logo.svg/200px-Bottega_Verde_logo.svg.png",
  "L'Erbolario": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/L%27Erbolario_logo.svg/200px-L%27Erbolario_logo.svg.png",
  "NaturaSi": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/NaturaSi_logo.svg/200px-NaturaSi_logo.svg.png",
  "Scalo Milano": "https://www.scalomilano.it/media/logo_scalo_milano.png",
  "Upim": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Upim_logo.svg/200px-Upim_logo.svg.png",
  // Arredamento & Casa
  "Brico io": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Bricoio_logo.svg/200px-Bricoio_logo.svg.png",
  "Bricocenter": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Bricocenter_logo.svg/200px-Bricocenter_logo.svg.png",
  "Kasanova": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Kasanova_logo.svg/200px-Kasanova_logo.svg.png",
  "Primark": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Primark_logo.svg/200px-Primark_logo.svg.png",
  "Maisons du Monde": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Maisons_du_monde_logo.svg/200px-Maisons_du_monde_logo.svg.png",
  // Abbigliamento
  "Asos": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/ASOS_logo.svg/200px-ASOS_logo.svg.png",
  "Foot Locker": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Foot_Locker_logo.svg/200px-Foot_Locker_logo.svg.png",
  "Mango": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Logo_of_Mango_%28new%29.svg/200px-Logo_of_Mango_%28new%29.svg.png",
  "Calzedonia": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Calzedonia_logo.svg/200px-Calzedonia_logo.svg.png",
  "Coccinelle": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Coccinelle_logo.svg/200px-Coccinelle_logo.svg.png",
  "Falconeri": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Falconeri_logo.svg/200px-Falconeri_logo.svg.png",
  "Guess": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Guess_logo.svg/200px-Guess_logo.svg.png",
  "Intimissimi": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Intimissimi_logo.svg/200px-Intimissimi_logo.svg.png",
  "Kiabi": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Logo_Kiabi.svg/200px-Logo_Kiabi.svg.png",
  "Marionnaud": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Marionnaud_logo.svg/200px-Marionnaud_logo.svg.png",
  "Pittarosso": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Pittarosso_logo.svg/200px-Pittarosso_logo.svg.png",
  "RayBan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ray-Ban_logo.svg/200px-Ray-Ban_logo.svg.png",
  "Salmoiraghi e Viganò": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Salmoiraghi_%26_Vigano_logo.svg/200px-Salmoiraghi_%26_Vigano_logo.svg.png",
  "Terranova": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Terranova_logo.svg/200px-Terranova_logo.svg.png",
  "Tezenis": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Tezenis_logo.svg/200px-Tezenis_logo.svg.png",
  "Rinascimento": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Rinascimento_logo.svg/200px-Rinascimento_logo.svg.png",
  "YOOX": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/YOOX_logo.svg/200px-YOOX_logo.svg.png",
  "AW LAB": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/AW_LAB_logo.svg/200px-AW_LAB_logo.svg.png",
  "Bata": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bata_shoes_logo.svg/200px-Bata_shoes_logo.svg.png",
  "Scarpe&Scarpe": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Scarpe%26Scarpe_logo.svg/200px-Scarpe%26Scarpe_logo.svg.png",
  "Calliope": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Calliope_logo.svg/200px-Calliope_logo.svg.png",
  "Du Pareil au même": "https://upload.wikimedia.org/wikipedia/fr/thumb/5/51/Logo_DPAM.svg/200px-Logo_DPAM.svg.png",
  // Supermercati mancanti
  "Ali Supermercati": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Ali_Supermercati_logo.svg/200px-Ali_Supermercati_logo.svg.png",
  "Almasicily": "https://www.almasicily.it/img/logo.png",
  "Il Viaggiator Goloso": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Il_Viaggiator_Goloso_logo.svg/200px-Il_Viaggiator_Goloso_logo.svg.png",
  "Iper": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Iper_logo.svg/200px-Iper_logo.svg.png",
  "Unes": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Unes_logo.svg/200px-Unes_logo.svg.png",
  "SignorVino": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Signorvino_logo.svg/200px-Signorvino_logo.svg.png",
  "Tannico": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Tannico_logo.svg/200px-Tannico_logo.svg.png",
  "Winelivery": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Winelivery_logo.svg/200px-Winelivery_logo.svg.png",
  "Cortilia": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Cortilia_logo.svg/200px-Cortilia_logo.svg.png",
  "Etruria": "https://www.etruriaretail.it/wp-content/uploads/2020/01/etruria-logo.png",
  "Tigros": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Tigros_logo.svg/200px-Tigros_logo.svg.png",
  "DECO'": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Dec%C3%B2_logo.svg/200px-Dec%C3%B2_logo.svg.png",
  "Il Gigante": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Il_Gigante_logo.svg/200px-Il_Gigante_logo.svg.png",
  "Tosano": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Tosano_logo.svg/200px-Tosano_logo.svg.png",
  "Crai": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Crai_logo.svg/200px-Crai_logo.svg.png",
  "Mercatò": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Mercato_logo.svg/200px-Mercato_logo.svg.png",
  "Basko": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Basko_logo.svg/200px-Basko_logo.svg.png",
  "Italmark": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Italmark_logo.svg/200px-Italmark_logo.svg.png",
  "Rossetto": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Rossetto_logo.svg/200px-Rossetto_logo.svg.png",
  // Esperienze
  "Global Experiences Card": "https://www.globalexperiencescard.com/images/logo.png",
  "Smartbox": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Smartbox_logo.svg/200px-Smartbox_logo.svg.png",
  "Snowit": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Snowit_logo.svg/200px-Snowit_logo.svg.png",
  "QC Terme": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/QC_Terme_logo.svg/200px-QC_Terme_logo.svg.png",
  "Activitygift": "https://www.activitygift.com/images/logo.png",
  "Modena Shopping Card": "https://www.modenashoppingcard.it/images/logo.png",
  "EquoTube": "https://www.equotube.com/images/logo.png",
  // Carburante
  "API IP": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/IP_logo.svg/200px-IP_logo.svg.png",
  "ENILIVE": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Eni_logo.svg/200px-Eni_logo.svg.png",
  "Q8": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Q8_logo.svg/200px-Q8_logo.svg.png",
  "Tamoil": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Tamoil_logo.svg/200px-Tamoil_logo.svg.png",
  // Viaggi
  "Best Western": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Best_Western_logo.svg/200px-Best_Western_logo.svg.png",
  "Flightgift": "https://www.flightgift.com/images/logo.png",
  "Hotelgift": "https://www.hotelgift.com/images/logo.png",
  "Boscolo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Boscolo_logo.svg/200px-Boscolo_logo.svg.png",
  "Ecobnb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Ecobnb_logo.svg/200px-Ecobnb_logo.svg.png",
  "Utravel": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Utravel_logo.svg/200px-Utravel_logo.svg.png",
  // Tecnologia
  "Trony": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Trony_logo.svg/200px-Trony_logo.svg.png",
  "Expert": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Expert_logo.svg/200px-Expert_logo.svg.png",
  // Intrattenimento
  "Dazn": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/DAZN_logo.svg/200px-DAZN_logo.svg.png",
  "UCI Cinemas": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/UCI_Cinemas_logo.svg/200px-UCI_Cinemas_logo.svg.png",
  "PhotoSi": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Photosi_logo.svg/200px-Photosi_logo.svg.png",
  "Lego": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/LEGO_logo.svg/200px-LEGO_logo.svg.png",
  // Libri
  "Giunti al punto": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Giunti_logo.svg/200px-Giunti_logo.svg.png",
  "Happy Card IBS": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/IBS.it_logo.svg/200px-IBS.it_logo.svg.png",
  "Libraccio.it": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Libraccio_logo.svg/200px-Libraccio_logo.svg.png",
  // Salute
  "Salute Semplice": "https://www.salutesemplice.it/images/logo.png",
  "VisionOttica": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/VisionOttica_logo.svg/200px-VisionOttica_logo.svg.png",
  "Nau": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/NAU%21_logo.svg/200px-NAU%21_logo.svg.png",
  "Pharmanow": "https://www.pharmanow.it/images/logo.png",
  // Infanzia
  "Chicco": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Chicco_logo.svg/200px-Chicco_logo.svg.png",
  // Carburante extra
  "Swish": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Swish_logo.svg/200px-Swish_logo.svg.png",
  // Sigma / Todis già presenti sopra
};

// Colori pastello per le iniziali di brand senza logo
const pastelColors = [
  'from-rose-400 to-pink-500',
  'from-orange-400 to-amber-500',
  'from-emerald-400 to-green-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-teal-400 to-cyan-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
  'from-indigo-400 to-blue-500',
  'from-red-400 to-rose-500',
];

// Brand name styling — colori per brand noti per il fallback tipografico
const brandStyles = {
  "Esselunga": { color: '#e30613', weight: 700 },
  "Conad": { color: '#003da5', weight: 700 },
  "Coop": { color: '#e2001a', weight: 800 },
  "Carrefour": { color: '#004e9a', weight: 700 },
  "Eurospin": { color: '#003399', weight: 800 },
  "Nike": { color: '#111', weight: 900 },
  "IKEA": { color: '#0058a3', weight: 900, bg: '#ffcc00' },
  "H&M": { color: '#e50010', weight: 900 },
  "Decathlon": { color: '#0082c3', weight: 700 },
  "Amazon": { color: '#232f3e', weight: 800 },
  "Zalando": { color: '#ff6900', weight: 700 },
  "Sephora": { color: '#000', weight: 700 },
  "Douglas": { color: '#000', weight: 600 },
  "Coin": { color: '#000', weight: 800 },
  "Upim": { color: '#fff', weight: 800, bg: '#333' },
  "Guess": { color: '#fff', weight: 800, bg: '#e4002b' },
  "Primark": { color: '#00a0df', weight: 600 },
  "OVS": { color: '#000', weight: 800 },
  "GameStop": { color: '#000', weight: 800 },
  "Penny Market": { color: '#cc0000', weight: 800 },
  "PENNY": { color: '#cc0000', weight: 800 },
  "Maisons du Monde": { color: '#fff', weight: 700, bg: '#333' },
  "NaturaSi": { color: '#fff', weight: 700, bg: '#4a7c2e' },
  "AW LAB": { color: '#fff', weight: 800, bg: '#0060c0' },
};

function BrandCard({ name, index }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = brandLogos[name];
  const style = brandStyles[name];

  const showLogo = logoUrl && !imgError;

  return (
    <div className="flex-shrink-0 w-[100px] snap-start">
      {/* Card 3D - effetto tasto fisico come nelle immagini */}
      <div 
        className="relative w-[100px] h-[80px] rounded-xl overflow-hidden transition-transform duration-150 active:scale-[0.96] active:translate-y-[2px]"
        style={{
          background: style?.bg && !showLogo
            ? style.bg
            : 'linear-gradient(180deg, #ffffff 0%, #f8f8fa 60%, #eeeff2 100%)',
          boxShadow: '0 4px 0 0 #c8c9cc, 0 6px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 2px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center justify-center h-full p-2.5">
          {showLogo ? (
            <img 
              src={logoUrl} 
              alt={name}
              className="max-w-[70px] max-h-[50px] object-contain"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span 
              className="text-center leading-[1.1] px-1 select-none"
              style={{
                color: style?.color || '#222',
                fontWeight: style?.weight || 700,
                fontSize: name.length > 12 ? '10px' : name.length > 8 ? '12px' : '14px',
                letterSpacing: '-0.02em',
                textTransform: name === name.toUpperCase() ? 'uppercase' : 'none',
              }}
            >
              {name}
            </span>
          )}
        </div>
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-1.5 leading-tight line-clamp-1 px-0.5 font-medium">
        {name}
      </p>
    </div>
  );
}

export default function BrandScrollBar({ brands, title, subtitle }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -260 : 260;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="mb-6">
      {title && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-white font-bold text-sm">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => scroll('left')} 
              className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scroll('right')} 
              className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {brands.map((brand, i) => (
          <BrandCard key={brand} name={brand} index={i} />
        ))}
      </div>
    </div>
  );
}