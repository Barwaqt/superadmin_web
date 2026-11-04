'use client';

import { useState } from 'react';
import { useApi, type Category, type VendorPayout } from './commerce-client';

export type VendorCategoryChoice = {
  categoryIds: string[];
  commissionBps: number;
  commissionCustom: boolean;
  categoryCommissions?: Record<string, number>;
};

export function VendorCategoryField({ value, onChange }: { value: VendorCategoryChoice; onChange: (value: VendorCategoryChoice) => void }) {
  const categories = useApi<Category[]>('/catalog/categories');
  const [search, setSearch] = useState('');
  const [editingCommission, setEditingCommission] = useState(false);
  const [bulkPercent, setBulkPercent] = useState('');
  const selected = value.categoryIds;
  const primary = categories.data?.find(category => category.id === selected[0]);
  const matches = (categories.data || []).filter(category => selected.includes(category.id) || `${category.name} ${category.slug}`.toLowerCase().includes(search.trim().toLowerCase()));
  const commissions = value.categoryCommissions || {};

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
    const cat = categories.data?.find(c => c.id === id);
    const nextCommissions = { ...commissions };
    if (selected.includes(id)) {
      delete nextCommissions[id];
    } else if (cat && nextCommissions[id] === undefined) {
      nextCommissions[id] = cat.commissionBps;
    }
    const nextPrimary = categories.data?.find(category => category.id === next[0]);
    const nextPrimaryBps = nextPrimary ? (nextCommissions[nextPrimary.id] ?? nextPrimary.commissionBps) : value.commissionBps;
    onChange({
      categoryIds: next,
      commissionBps: nextPrimaryBps,
      commissionCustom: value.commissionCustom,
      categoryCommissions: nextCommissions,
    });
  }

  function editCategoryCommission(id: string, raw: string) {
    const percent = Number(raw);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return;
    const bps = Math.round(percent * 100);
    const nextCommissions = { ...commissions, [id]: bps };
    const primaryBps = nextCommissions[selected[0]] ?? (primary?.commissionBps ?? value.commissionBps);
    onChange({
      ...value,
      commissionBps: primaryBps,
      commissionCustom: true,
      categoryCommissions: nextCommissions,
    });
  }

  function resetCategoryRate(id: string) {
    const cat = categories.data?.find(c => c.id === id);
    if (!cat) return;
    const nextCommissions = { ...commissions, [id]: cat.commissionBps };
    const primaryBps = nextCommissions[selected[0]] ?? cat.commissionBps;
    onChange({
      ...value,
      commissionBps: primaryBps,
      categoryCommissions: nextCommissions,
    });
  }

  function resetAllToDefaults() {
    const nextCommissions: Record<string, number> = {};
    for (const id of selected) {
      const cat = categories.data?.find(c => c.id === id);
      if (cat) nextCommissions[id] = cat.commissionBps;
    }
    const primaryBps = primary?.commissionBps ?? value.commissionBps;
    onChange({
      ...value,
      commissionBps: primaryBps,
      commissionCustom: false,
      categoryCommissions: nextCommissions,
    });
  }

  function applyBulkRate() {
    const percent = Number(bulkPercent);
    if (bulkPercent.trim() === '' || !Number.isFinite(percent) || percent < 0 || percent > 100) return;
    const bps = Math.round(percent * 100);
    const nextCommissions: Record<string, number> = {};
    for (const id of selected) {
      nextCommissions[id] = bps;
    }
    onChange({
      ...value,
      commissionBps: bps,
      commissionCustom: true,
      categoryCommissions: nextCommissions,
    });
  }

  // Calculate rate range or single rate
  const selectedCategories = selected.map(id => categories.data?.find(c => c.id === id)).filter((c): c is Category => Boolean(c));
  const rates = selectedCategories.map(c => (commissions[c.id] ?? c.commissionBps) / 100);
  const minRate = rates.length ? Math.min(...rates) : 0;
  const maxRate = rates.length ? Math.max(...rates) : 0;
  const isUniform = minRate === maxRate;

  return <fieldset>
    <legend>Vendor categories & commission</legend>
    <label>Search categories<input type="search" placeholder="Search category name" value={search} onChange={event => setSearch(event.target.value)} /></label>
    <div role="group" aria-label="Vendor categories" style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e5eaf0', borderRadius: 7, padding: '10px 12px', marginBottom: 14 }}>
      {matches.map(category => {
        const isChecked = selected.includes(category.id);
        const currentBps = commissions[category.id] ?? category.commissionBps;
        return <label key={category.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '6px 0', fontSize: 12, fontWeight: 400 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isChecked} disabled={categories.loading || !!categories.error} onChange={() => toggle(category.id)} />
            <span>{category.name}</span>
          </span>
          <span className="muted">
            {isChecked && currentBps !== category.commissionBps ? (
              <span><b style={{ color: '#0969da' }}>{currentBps / 100}%</b> (def: {category.commissionBps / 100}%)</span>
            ) : (
              <span>{category.commissionBps / 100}%</span>
            )}
          </span>
        </label>;
      })}
      {!categories.loading && !categories.error && !matches.length && <p style={{ margin: 6, fontSize: 12 }}>No matching categories.</p>}
    </div>
    {categories.error && <p role="alert">{categories.error} <button type="button" onClick={categories.reload}>Retry</button></p>}
    <p role="status">{selected.length ? `${selected.length} categor${selected.length === 1 ? 'y' : 'ies'} selected${primary ? ` · Primary: ${primary.name}` : ''}` : 'Select at least one category.'}</p>
    
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
      <span>
        Commission: <b>{isUniform ? `${minRate}%` : `${minRate}% – ${maxRate}% (per category)`}</b>
      </span>
      {selected.length > 0 && (
        <button type="button" className="mini-button" onClick={() => setEditingCommission(!editingCommission)}>
          {editingCommission ? 'Close commission editor' : 'Edit commission'}
        </button>
      )}
    </div>

    {editingCommission && selected.length > 0 && (
      <div style={{ marginTop: 14, border: '1px solid #d0d7de', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <b style={{ fontSize: 13 }}>Edit commission for each selected category:</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="All %"
              style={{ width: 75, margin: 0, padding: '4px 6px', fontSize: 12 }}
              value={bulkPercent}
              onChange={e => setBulkPercent(e.target.value)}
            />
            <button type="button" className="mini-button" onClick={applyBulkRate}>Apply to all</button>
            <button type="button" className="mini-button" onClick={resetAllToDefaults}>Reset all to defaults</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto' }}>
          {selectedCategories.map(category => {
            const currentBps = commissions[category.id] ?? category.commissionBps;
            const currentPercent = currentBps / 100;
            const isCustom = currentBps !== category.commissionBps;
            return (
              <div
                key={category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {category.name}
                    {category.id === selected[0] && <span style={{ marginLeft: 6, fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>Primary</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>Category default: {category.commissionBps / 100}%</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <span>Rate:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      style={{ width: 70, margin: 0, padding: '4px 6px', textAlign: 'right' }}
                      value={currentPercent}
                      onChange={e => editCategoryCommission(category.id, e.target.value)}
                    />
                    <span>%</span>
                  </label>
                  {isCustom && (
                    <button
                      type="button"
                      className="mini-button"
                      style={{ fontSize: 11 }}
                      onClick={() => resetCategoryRate(category.id)}
                      title={`Reset to default rate (${category.commissionBps / 100}%)`}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 11 }}>
          Products belonging to each category calculate commission using that category’s vendor rate at checkout.
        </p>
      </div>
    )}

    <p className="muted" style={{ marginTop: 8 }}>The first selected category is primary. You can adjust the commission for any selected category individually.</p>
  </fieldset>;
}

export function payoutDraft(value?: Partial<VendorPayout>): VendorPayout {
  return {
    method: value?.method || 'BANK_TRANSFER',
    bankName: value?.bankName || '',
    accountTitle: value?.accountTitle || '',
    accountNumber: value?.accountNumber || '',
  };
}

export function VendorPayoutFields({ value, onChange }: { value: VendorPayout; onChange: (value: VendorPayout) => void }) {
  return <fieldset><legend>Vendor payout account</legend><div className="form-grid">
    <label>Payout method<select value={value.method} onChange={event => { const method = event.target.value as VendorPayout['method']; onChange({ ...value, method, bankName: method === 'EASYPAISA' ? 'Easypaisa' : method === 'JAZZCASH' ? 'JazzCash' : '' }); }}>
      <option value="BANK_TRANSFER">Bank account</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option>
    </select></label>
    <label>Account title<input required maxLength={200} autoComplete="off" value={value.accountTitle} onChange={event => onChange({ ...value, accountTitle: event.target.value })} /></label>
    <label>{value.method === 'BANK_TRANSFER' ? 'Account number / IBAN' : 'Wallet account number'}<input required minLength={5} maxLength={100} autoComplete="off" value={value.accountNumber} onChange={event => onChange({ ...value, accountNumber: event.target.value })} /></label>
    <label>{value.method === 'BANK_TRANSFER' ? 'Bank name' : 'Wallet provider'}<input required maxLength={200} readOnly={value.method !== 'BANK_TRANSFER'} value={value.bankName} onChange={event => onChange({ ...value, bankName: event.target.value })} /></label>
  </div></fieldset>;
}
