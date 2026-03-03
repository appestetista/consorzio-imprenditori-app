import React from 'react';
import { usePanels } from './GlobalTopIcons';
import NotificationsPanel from '../home/NotificationsPanel';
import MessagesSidePanel from '../home/MessagesSidePanel';

/**
 * Pannelli globali messaggi + notifiche.
 * Renderizzato una sola volta nel Layout.
 */
export default function GlobalPanels({ userEmail, userRegime }) {
  const { msgPanelOpen, notifPanelOpen, closeAll } = usePanels();

  return (
    <>
      <MessagesSidePanel
        open={msgPanelOpen}
        onClose={closeAll}
        userEmail={userEmail}
      />
      <NotificationsPanel
        open={notifPanelOpen}
        onClose={closeAll}
        userEmail={userEmail}
        userRegime={userRegime}
      />
    </>
  );
}