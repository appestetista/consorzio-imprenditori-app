import AdminPanel from './pages/AdminPanel';
import CalendarioIncontri from './pages/CalendarioIncontri';
import CatalogoBuoniPasto from './pages/CatalogoBuoniPasto';
import CompleteProfile from './pages/CompleteProfile';
import Consulenze from './pages/Consulenze';
import ContattaConsorzio from './pages/ContattaConsorzio';
import ContattaMembri from './pages/ContattaMembri';
import ContattaMembriAdmin from './pages/ContattaMembriAdmin';
import CulturaAziendale from './pages/CulturaAziendale';
import DirectoryUtenti from './pages/DirectoryUtenti';
import FinanziamentiAgevolati from './pages/FinanziamentiAgevolati';
import Fornitori from './pages/Fornitori';
import GestioneBandi from './pages/GestioneBandi';
import GestioneMembri from './pages/GestioneMembri';
import Home from './pages/Home';
import Imprenditori from './pages/Imprenditori';
import Marketplace from './pages/Marketplace';
import Messaggi from './pages/Messaggi';
import MyProfile from './pages/MyProfile';
import ProfiloBandi from './pages/ProfiloBandi';
import RichiestaWelfare from './pages/RichiestaWelfare';
import RisparmioDettaglio from './pages/RisparmioDettaglio';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import VideoInterviste from './pages/VideoInterviste';
import WelfareNormativa from './pages/WelfareNormativa';
import WelfareOrdina from './pages/WelfareOrdina';
import WelfareTipologie from './pages/WelfareTipologie';
import WelfareAziendale from './pages/WelfareAziendale';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "CalendarioIncontri": CalendarioIncontri,
    "CatalogoBuoniPasto": CatalogoBuoniPasto,
    "CompleteProfile": CompleteProfile,
    "Consulenze": Consulenze,
    "ContattaConsorzio": ContattaConsorzio,
    "ContattaMembri": ContattaMembri,
    "ContattaMembriAdmin": ContattaMembriAdmin,
    "CulturaAziendale": CulturaAziendale,
    "DirectoryUtenti": DirectoryUtenti,
    "FinanziamentiAgevolati": FinanziamentiAgevolati,
    "Fornitori": Fornitori,
    "GestioneBandi": GestioneBandi,
    "GestioneMembri": GestioneMembri,
    "Home": Home,
    "Imprenditori": Imprenditori,
    "Marketplace": Marketplace,
    "Messaggi": Messaggi,
    "MyProfile": MyProfile,
    "ProfiloBandi": ProfiloBandi,
    "RichiestaWelfare": RichiestaWelfare,
    "RisparmioDettaglio": RisparmioDettaglio,
    "RisparmioEnergetico": RisparmioEnergetico,
    "VideoInterviste": VideoInterviste,
    "WelfareNormativa": WelfareNormativa,
    "WelfareOrdina": WelfareOrdina,
    "WelfareTipologie": WelfareTipologie,
    "WelfareAziendale": WelfareAziendale,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};