import { useState } from "react";

interface Business {
  business_id: string;
  business_name: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => Promise<void>;
  onDeactivate: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onAssignBranch: (branchId: string) => Promise<void>;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  totalCount?: number;
  availableBusinesses: Business[];
}

export default function BulkActionsBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onDuplicate,
  onAssignBranch,
  onClearSelection,
  onSelectAll,
  totalCount,
  availableBusinesses,
}: BulkActionsBarProps) {
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (
    action: () => Promise<void>,
    label: string,
  ) => {
    setLoadingAction(label);
    try {
      await action();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 text-sm">
      <span className="font-medium whitespace-nowrap">
        {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
      </span>

      {onSelectAll && totalCount && selectedCount < totalCount && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-gray-300 hover:text-white underline underline-offset-2 text-xs whitespace-nowrap"
        >
          Seleccionar todos ({totalCount})
        </button>
      )}

      <div className="w-px h-5 bg-gray-600" />

      <button
        type="button"
        disabled={loadingAction !== null}
        onClick={() => handleAction(onActivate, "activate")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {loadingAction === "activate" ? (
          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-green-400" />
        )}
        Activar
      </button>

      <button
        type="button"
        disabled={loadingAction !== null}
        onClick={() => handleAction(onDeactivate, "deactivate")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {loadingAction === "deactivate" ? (
          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-gray-400" />
        )}
        Desactivar
      </button>

      <button
        type="button"
        disabled={loadingAction !== null}
        onClick={() => handleAction(onDuplicate, "duplicate")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {loadingAction === "duplicate" ? (
          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
        Duplicar
      </button>

      {availableBusinesses.length > 0 && (
        <div className="relative">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Asignar sucursal
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBranchDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBranchDropdown(false)}
              />
              <div className="absolute bottom-full mb-2 left-0 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px] max-h-60 overflow-y-auto">
                {availableBusinesses.map((b) => (
                  <button
                    key={b.business_id}
                    type="button"
                    onClick={async () => {
                      setShowBranchDropdown(false);
                      await handleAction(
                        () => onAssignBranch(b.business_id),
                        `branch-${b.business_id}`,
                      );
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    {b.business_name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="w-px h-5 bg-gray-600" />

      <button
        type="button"
        onClick={onClearSelection}
        className="text-gray-400 hover:text-white transition-colors"
        title="Cancelar selección"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
