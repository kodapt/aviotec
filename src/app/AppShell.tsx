import { useEffect, useMemo, useState } from 'react';
import Tabs, { TabOption } from '../ui/Tabs';
import Mode2D from '../views/Mode2D/Mode2D';
import Mode3DParam from '../views/Mode3DParam/Mode3DParam';
import Mode3DObj from '../views/Mode3DObj/Mode3DObj';

const STORAGE_KEY = 'aviotec.selectedTab';

const AppShell = () => {
  const tabs: TabOption[] = useMemo(
    () => [
      { id: '2d', label: '2D' },
      { id: '3d-param', label: '3D Param' },
      { id: '3d-obj', label: '3D OBJ' },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState<TabOption>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return tabs.find((tab) => tab.id === stored) ?? tabs[0];
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, activeTab.id);
  }, [activeTab]);

  const renderView = () => {
    switch (activeTab.id) {
      case '2d':
        return <Mode2D />;
      case '3d-param':
        return <Mode3DParam />;
      case '3d-obj':
        return <Mode3DObj />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title__accent">Aviotec</span>
          <span className="app-title__subtitle">Modeling Console</span>
        </div>
        <Tabs tabs={tabs} activeTabId={activeTab.id} onChange={setActiveTab} />
      </header>
      <main className="app-content">{renderView()}</main>
    </div>
  );
};

export default AppShell;
