import { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface BomComponent {
  childItemId: string;
  childItemName: string;
  childItemSku: string | null;
  quantityRequired: number;
  quantityAvailable: number;
  canBuild: number;
  sufficient: boolean;
  unitCost: number | null;
  lineCost: number | null;
}

interface BomData {
  canBuild: number;
  totalCost: number | null;
  components: BomComponent[];
}

interface Props {
  itemId: string;
  hasSubItems: boolean;
}

export default function ItemBom({ itemId, hasSubItems }: Props) {
  const [bom, setBom] = useState<BomData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!hasSubItems || !expanded) return;
    setLoading(true);
    itemsApi.getBom(itemId)
      .then(res => setBom(res.data.data))
      .catch(() => setBom(null))
      .finally(() => setLoading(false));
  }, [itemId, hasSubItems, expanded]);

  if (!hasSubItems) return null;

  return (
    <div className="card p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <ClipboardDocumentListIcon className="w-5 h-5" style={{ color: '#f59e0b' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Bill of Materials</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {expanded && bom ? `Can build ${bom.canBuild} units` : 'Click to calculate'}
          </p>
        </div>
        {expanded && bom && (
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: bom.canBuild > 0 ? '#22c55e' : '#ef4444' }}>{bom.canBuild}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>buildable</p>
          </div>
        )}
      </button>

      {expanded && (
        <div className="mt-4">
          {loading ? (
            <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>Calculating...</div>
          ) : bom ? (
            <div className="space-y-3">
              {bom.totalCost != null && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total cost per unit: </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>${bom.totalCost.toFixed(2)}</span>
                </div>
              )}
              <div className="space-y-2">
                {bom.components.map((comp) => (
                  <div key={comp.childItemId} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CubeIcon className="w-5 h-5 flex-shrink-0" style={{ color: comp.sufficient ? '#22c55e' : '#ef4444' }} />
                      <div className="min-w-0">
                        <Link to={`/items/${comp.childItemId}`} className="font-medium text-sm hover:underline" style={{ color: 'var(--text-primary)' }}>
                          {comp.childItemName}
                        </Link>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Need {comp.quantityRequired} · Have {comp.quantityAvailable}
                          {comp.unitCost != null && ` · $${comp.unitCost.toFixed(2)} ea`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: comp.sufficient ? '#22c55e' : '#ef4444' }}>
                      {comp.canBuild} builds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load BOM data</p>
          )}
        </div>
      )}
    </div>
  );
}
