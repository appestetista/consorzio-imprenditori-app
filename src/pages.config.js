import AdminPanel from './pages/AdminPanel';
import CalendarioIncontri from './pages/CalendarioIncontri';
import Consulenze from './pages/Consulenze';
import ContattaConsorzio from './pages/ContattaConsorzio';
import ContattaMembri from './pages/ContattaMembri';
import FinanziamentiAgevolati from './pages/FinanziamentiAgevolati';
import GestioneBandi from './pages/GestioneBandi';
import GestioneMembri from './pages/GestioneMembri';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Messaggi from './pages/Messaggi';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import VideoInterviste from './pages/VideoInterviste';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "CalendarioIncontri": CalendarioIncontri,
    "Consulenze": Consulenze,
    "ContattaConsorzio": ContattaConsorzio,
    "ContattaMembri": ContattaMembri,
    "FinanziamentiAgevolati": FinanziamentiAgevolati,
    "GestioneBandi": GestioneBandi,
    "GestioneMembri": GestioneMembri,
    "Home": Home,
    "Marketplace": Marketplace,
    "Messaggi": Messaggi,
    "RisparmioEnergetico": RisparmioEnergetico,
    "VideoInterviste": VideoInterviste,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};