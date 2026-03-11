/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminPanel from './pages/AdminPanel';
import AnalisiContratti from './pages/AnalisiContratti';
import AsteImmobiliari from './pages/AsteImmobiliari';
import AsteSalvate from './pages/AsteSalvate';
import CalendarioIncontri from './pages/CalendarioIncontri';
import CatalogoBuoniPasto from './pages/CatalogoBuoniPasto';
import CompleteProfile from './pages/CompleteProfile';
import CompleteRegistration from './pages/CompleteRegistration';
import ComplianceAziendale from './pages/ComplianceAziendale';
import Consulenze from './pages/Consulenze';
import ContattaConsorzio from './pages/ContattaConsorzio';
import ContattaMembri from './pages/ContattaMembri';
import ContattaMembriAdmin from './pages/ContattaMembriAdmin';
import CruscottoFiscale from './pages/CruscottoFiscale';
import CulturaAziendale from './pages/CulturaAziendale';
import Dashboard from './pages/Dashboard';
import DirectoryUtenti from './pages/DirectoryUtenti';
import Esplora from './pages/Esplora';
import FinanziamentiAgevolati from './pages/FinanziamentiAgevolati';
import FiscalitaEnergetica from './pages/FiscalitaEnergetica';
import Fornitori from './pages/Fornitori';
import GestioneCostiAI from './pages/GestioneCostiAI';
import GestioneMembri from './pages/GestioneMembri';
import GestioneVantaggi from './pages/GestioneVantaggi';
import GestioneZone from './pages/GestioneZone';
import Home from './pages/Home';
import ImportExport from './pages/ImportExport';
import Imprenditori from './pages/Imprenditori';
import Marketplace from './pages/Marketplace';
import Messaggi from './pages/Messaggi';
import MiePrenotazioniVantaggi from './pages/MiePrenotazioniVantaggi';
import MioQRCode from './pages/MioQRCode';
import MyProfile from './pages/MyProfile';
import Pricing from './pages/Pricing';
import ProfiloBandi from './pages/ProfiloBandi';
import ProfiloUtente from './pages/ProfiloUtente';
import PromemoriaAste from './pages/PromemoriaAste';
import QRCodeHub from './pages/QRCodeHub';
import RichiestaWelfare from './pages/RichiestaWelfare';
import RisparmioDettaglio from './pages/RisparmioDettaglio';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import ScannerQRVantaggi from './pages/ScannerQRVantaggi';
import SimulatoreCostoPersonale from './pages/SimulatoreCostoPersonale';
import SimulatoreFiscale from './pages/SimulatoreFiscale';
import VantaggiIscritti from './pages/VantaggiIscritti';
import VideoInterviste from './pages/VideoInterviste';
import VideoRecensioni from './pages/VideoRecensioni';
import WelfareAziendale from './pages/WelfareAziendale';
import WelfareNormativa from './pages/WelfareNormativa';
import WelfareOrdina from './pages/WelfareOrdina';
import WelfareStorico from './pages/WelfareStorico';
import WelfareTipologie from './pages/WelfareTipologie';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "AnalisiContratti": AnalisiContratti,
    "AsteImmobiliari": AsteImmobiliari,
    "AsteSalvate": AsteSalvate,
    "CalendarioIncontri": CalendarioIncontri,
    "CatalogoBuoniPasto": CatalogoBuoniPasto,
    "CompleteProfile": CompleteProfile,
    "CompleteRegistration": CompleteRegistration,
    "ComplianceAziendale": ComplianceAziendale,
    "Consulenze": Consulenze,
    "ContattaConsorzio": ContattaConsorzio,
    "ContattaMembri": ContattaMembri,
    "ContattaMembriAdmin": ContattaMembriAdmin,
    "CruscottoFiscale": CruscottoFiscale,
    "CulturaAziendale": CulturaAziendale,
    "Dashboard": Dashboard,
    "DirectoryUtenti": DirectoryUtenti,
    "Esplora": Esplora,
    "FinanziamentiAgevolati": FinanziamentiAgevolati,
    "FiscalitaEnergetica": FiscalitaEnergetica,
    "Fornitori": Fornitori,
    "GestioneCostiAI": GestioneCostiAI,
    "GestioneMembri": GestioneMembri,
    "GestioneVantaggi": GestioneVantaggi,
    "GestioneZone": GestioneZone,
    "Home": Home,
    "ImportExport": ImportExport,
    "Imprenditori": Imprenditori,
    "Marketplace": Marketplace,
    "Messaggi": Messaggi,
    "MiePrenotazioniVantaggi": MiePrenotazioniVantaggi,
    "MioQRCode": MioQRCode,
    "MyProfile": MyProfile,
    "Pricing": Pricing,
    "ProfiloBandi": ProfiloBandi,
    "ProfiloUtente": ProfiloUtente,
    "PromemoriaAste": PromemoriaAste,
    "QRCodeHub": QRCodeHub,
    "RichiestaWelfare": RichiestaWelfare,
    "RisparmioDettaglio": RisparmioDettaglio,
    "RisparmioEnergetico": RisparmioEnergetico,
    "ScannerQRVantaggi": ScannerQRVantaggi,
    "SimulatoreCostoPersonale": SimulatoreCostoPersonale,
    "SimulatoreFiscale": SimulatoreFiscale,
    "VantaggiIscritti": VantaggiIscritti,
    "VideoInterviste": VideoInterviste,
    "VideoRecensioni": VideoRecensioni,
    "WelfareAziendale": WelfareAziendale,
    "WelfareNormativa": WelfareNormativa,
    "WelfareOrdina": WelfareOrdina,
    "WelfareStorico": WelfareStorico,
    "WelfareTipologie": WelfareTipologie,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};