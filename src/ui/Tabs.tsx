export type TabOption = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabOption[];
  activeTabId: string;
  onChange: (tab: TabOption) => void;
};

const Tabs = ({ tabs, activeTabId, onChange }: TabsProps) => {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab ${activeTabId === tab.id ? 'tab--active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
