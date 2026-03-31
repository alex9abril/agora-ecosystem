import { OrderTab, OrderTabId } from './orderPresentation';

interface OrdersOperationalTabsProps {
  tabs: OrderTab[];
  activeTab: OrderTabId;
  counts: Record<OrderTabId, number>;
  onChange: (tab: OrderTabId) => void;
}

export function OrdersOperationalTabs({ tabs, activeTab, counts, onChange }: OrdersOperationalTabsProps) {
  return (
    <div className="mb-3 overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`h-8 whitespace-nowrap rounded-md px-3 text-sm transition-colors ${
                active
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label} <span className="ml-1 text-xs opacity-80">{counts[tab.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
