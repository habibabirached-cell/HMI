import React from 'react';
import { TRADE_SPACE_VIZ_OPTIONS } from './conf_TradeSpacePanel';

const IDEUM_PAGE_TABS = [
  { id: 'configure', label: 'Configure' },
  ...TRADE_SPACE_VIZ_OPTIONS.map((opt) => ({
    id: opt.id,
    label: opt.label.replace(/^\d+\s·\s/, ''),
  })),
];

export default function ConfIdeumPageTabs({ activeTab, onSelectTab }) {
  return (
    <nav className="conf-ideum-page-tabs" aria-label="Configurator views">
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
