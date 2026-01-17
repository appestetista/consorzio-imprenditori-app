import AdminPanel from './pages/AdminPanel';
import CalendarioIncontri from './pages/CalendarioIncontri';
import CompleteProfile from './pages/CompleteProfile';
import Consulenze from './pages/Consulenze';
import ContattaConsorzio from './pages/ContattaConsorzio';
import ContattaMembri from './pages/ContattaMembri';
import ContattaMembriAdmin from './pages/ContattaMembriAdmin';
import CulturaAziendale from './pages/CulturaAziendale';
import FinanziamentiAgevolati from './pages/FinanziamentiAgevolati';
import GestioneBandi from './pages/GestioneBandi';
import GestioneMembri from './pages/GestioneMembri';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Messaggi from './pages/Messaggi';
import MyProfile from './pages/MyProfile';
import ProfiloBandi from './pages/ProfiloBandi';
import RisparmioDettaglio from './pages/RisparmioDettaglio';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import VideoInterviste from './pages/VideoInterviste';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "CalendarioIncontri": CalendarioIncontri,
    "CompleteProfile": CompleteProfile,
    "Consulenze": Consulenze,
    "ContattaConsorzio": ContattaConsorzio,
    "ContattaMembri": ContattaMembri,
    "ContattaMembriAdmin": ContattaMembriAdmin,
    "CulturaAziendale": CulturaAziendale,
    "FinanziamentiAgevolati": FinanziamentiAgevolati,
    "GestioneBandi": GestioneBandi,
    "GestioneMembri": GestioneMembri,
    "Home": Home,
    "Marketplace": Marketplace,
    "Messaggi": Messaggi,
    "MyProfile": MyProfile,
    "ProfiloBandi": ProfiloBandi,
    "RisparmioDettaglio": RisparmioDettaglio,
    "RisparmioEnergetico": RisparmioEnergetico,
    "VideoInterviste": VideoInterviste,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};