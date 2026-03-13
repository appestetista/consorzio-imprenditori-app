import { useEffect } from "react";

/**
 * Disabilita il pull-to-refresh del browser mobile 
 * aggiungendo overscroll-behavior-y: none su html e body.
 * Lo rimuove allo smontaggio del componente.
 */
export default function useDisablePullToRefresh() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = body.style.overscrollBehaviorY;

    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";

    return () => {
      html.style.overscrollBehaviorY = prevHtml;
      body.style.overscrollBehaviorY = prevBody;
    };
  }, []);
}