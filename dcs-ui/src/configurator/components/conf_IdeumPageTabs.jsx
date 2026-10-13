import React from 'react';
import { TRADE_SPACE_VIZ_OPTIONS } from './conf_TradeSpacePanel';

export const IDEUM_DATA_EXPLORATION_TAB_ID = 'data-exploration';

const IDEUM_PAGE_TABS = [
  { id: 'configure', label: 'Inputs' },
  ...TRADE_SPACE_VIZ_OPTIONS.map((opt) => ({
    id: opt.id,
    label: opt.label.replace(/^\d+\s·\s/, ''),
  })),
  { id: IDEUM_DATA_EXPLORATION_TAB_ID, label: 'Data Exploration' },
];

export default function ConfIdeumPageTabs({
  activeTab,
  onSelectTab,
  onLocalMartinConfigure,
  localMartinBusy = false,
}) {
  return (
    <nav className="conf-ideum-page-tabs" aria-label="Configurator views">
      {onLocalMartinConfigure && (
        <button
          type="button"
          className="conf-ideum-page-tabs__btn conf-ideum-page-tabs__btn--localMartin"
          onClick={onLocalMartinConfigure}
          disabled={localMartinBusy}
          title="Run Martin Waco study and show the wall layout on this screen (does not send to Maingear)"
        >
          {localMartinBusy ? 'Running…' : 'Preview'}
        </button>
      )}
      {IDEUM_PAGE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`conf-ideum-page-tabs__btn${activeTab === tab.id ? ' conf-ideum-page-tabs__btn--active' : ''}`}
          onClick={() => onSelectTab(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
