import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import {
  GIFT_CATALOG_ERROR_LABEL,
  GIFT_CONFIG_UI,
  GiftCatalogItem,
  GiftCatalogState,
  GiftRule,
  createRuleFromCatalog,
} from '../../constants/giftConfig';
import { removeDiacritics } from '../../constants/champions';
import { adminSocket } from '../../services/socket';
import { GiftIcon } from './GiftIcon';

const FIELD_CLASS = 'bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400';
const EMPTY_CATALOG: GiftCatalogState = { items: [], fetchedAt: 0, error: null };

interface GiftCatalogPickerProps {
  configuredKeys: ReadonlySet<string>;
  onAdd: (rule: GiftRule) => void;
}

const matchesQuery = (item: GiftCatalogItem, query: string): boolean =>
  !query || removeDiacritics(item.name.toLowerCase()).includes(query);

/** The live room's real gift list (loaded on connect or on demand) plus a manual "add by name" field. */
export function GiftCatalogPicker({ configuredKeys, onAdd }: GiftCatalogPickerProps) {
  const [catalog, setCatalog] = useState<GiftCatalogState>(EMPTY_CATALOG);
  const [query, setQuery] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCoins, setManualCoins] = useState('');

  useEffect(() => adminSocket.onGiftCatalog(setCatalog), []);

  const visibleItems = useMemo(() => {
    const normalizedQuery = removeDiacritics(query.trim().toLowerCase());
    return catalog.items
      .filter((item) => !configuredKeys.has(item.giftId) && matchesQuery(item, normalizedQuery))
      .slice(0, GIFT_CONFIG_UI.CATALOG_PREVIEW_LIMIT);
  }, [catalog.items, configuredKeys, query]);

  const handleManualAdd = () => {
    const name = manualName.trim();
    if (!name) return;
    onAdd(createRuleFromCatalog({ giftId: '', name, coins: Math.max(0, Math.round(Number(manualCoins) || 0)), imageUrl: '' }));
    setManualName('');
    setManualCoins('');
  };

  const statusText = catalog.error
    ? GIFT_CATALOG_ERROR_LABEL[catalog.error] ?? catalog.error
    : `${catalog.items.length} quà từ phòng live${catalog.fetchedAt ? ` · tải lúc ${new Date(catalog.fetchedAt).toLocaleTimeString()}` : ''}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => adminSocket.emitFetchGiftCatalog()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tải danh sách quà từ phòng live
        </button>
        <span className={`text-[11px] ${catalog.error ? 'text-rose-300' : 'text-slate-400'}`}>{statusText}</span>
      </div>

      {catalog.items.length > 0 && (
        <>
          <label className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm quà (Rose, Galaxy...)" className={`${FIELD_CLASS} flex-1`} />
          </label>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5 max-h-56 overflow-y-auto pr-1">
            {visibleItems.map((item) => (
              <button
                key={item.giftId}
                type="button"
                onClick={() => onAdd(createRuleFromCatalog(item))}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 text-left"
                title="Thêm vào cấu hình"
              >
                <GiftIcon imageUrl={item.imageUrl} name={item.name} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[11px] font-bold text-white truncate">{item.name}</span>
                  <span className="block text-[10px] font-mono text-amber-300">{item.coins.toLocaleString()} xu</span>
                </span>
                <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        <span>Thêm tay (khớp theo tên, dùng khi chưa live / để giả lập):</span>
        <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Tên quà" className={`${FIELD_CLASS} w-36`} />
        <input value={manualCoins} onChange={(event) => setManualCoins(event.target.value)} placeholder="Số xu" inputMode="numeric" className={`${FIELD_CLASS} w-20`} />
        <button type="button" onClick={handleManualAdd} className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold">
          Thêm
        </button>
      </div>
    </div>
  );
}
