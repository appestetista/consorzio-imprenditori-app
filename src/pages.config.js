import Home from './pages/Home';
import CalendarioIncontri from './pages/CalendarioIncontri';
import VideoInterviste from './pages/VideoInterviste';
import Consulenze from './pages/Consulenze';
import Messaggi from './pages/Messaggi';
import ContattaMembri from './pages/ContattaMembri';
import Marketplace from './pages/Marketplace';
import ContattaConsorzio from './pages/ContattaConsorzio';
import RisparmioEnergetico from './pages/RisparmioEnergetico';
import AdminPanel from './pages/AdminPanel';
import GestioneMembri from './pages/GestioneMembri';


export const PAGES = {
    "Home": Home,
    "CalendarioIncontri": CalendarioIncontri,
    "VideoInterviste": VideoInterviste,
    "Consulenze": Consulenze,
    "Messaggi": Messaggi,
    "ContattaMembri": ContattaMembri,
    "Marketplace": Marketplace,
    "ContattaConsorzio": ContattaConsorzio,
    "RisparmioEnergetico": RisparmioEnergetico,
    "AdminPanel": AdminPanel,
    "GestioneMembri": GestioneMembri,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};