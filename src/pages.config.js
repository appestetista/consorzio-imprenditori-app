import CalendarioIncontri from './pages/CalendarioIncontri';
import Consulenze from './pages/Consulenze';
import ContattaConsorzio from './pages/ContattaConsorzio';
import ContattaMembri from './pages/ContattaMembri';
import ContattaMembriAdmin from './pages/ContattaMembriAdmin';
import CulturaAziendale from './pages/CulturaAziendale';
import DirectoryUtenti from './pages/DirectoryUtenti';
import FinanziamentiAgevolati from './pages/FinanziamentiAgevolati';
import GestioneBandi from './pages/GestioneBandi';
import GestioneMembri from './pages/GestioneMembri';
import Marketplace from './pages/Marketplace';
import Messaggi from './pages/Messaggi';
import ProfiloBandi from './pages/ProfiloBandi';
import RisparmioDettaglio from './pages/RisparmioDettaglio';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import VideoInterviste from './pages/VideoInterviste';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CalendarioIncontri": CalendarioIncontri,
    "Consulenze": Consulenze,
    "ContattaConsorzio": ContattaConsorzio,
    "ContattaMembri": ContattaMembri,
    "ContattaMembriAdmin": ContattaMembriAdmin,
    "CulturaAziendale": CulturaAziendale,
    "DirectoryUtenti": DirectoryUtenti,
    "FinanziamentiAgevolati": FinanziamentiAgevolati,
    "GestioneBandi": GestioneBandi,
    "GestioneMembri": GestioneMembri,
    "Marketplace": Marketplace,
    "Messaggi": Messaggi,
    "ProfiloBandi": ProfiloBandi,
    "RisparmioDettaglio": RisparmioDettaglio,
    "RisparmioEnergetico": RisparmioEnergetico,
    "VideoInterviste": VideoInterviste,
}

export const pagesConfig = {
    mainPage: "CalendarioIncontri",
    Pages: PAGES,
    Layout: __Layout,
};