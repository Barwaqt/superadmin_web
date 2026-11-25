'use client';
import { useState, type ReactNode } from 'react';
import { api, useApi, type Brand } from '../components/commerce-client';
import { UploadField } from '../components/upload-field';
type Page<T> = { items: T[]; total: number; page: number; limit: number };
const blank = { name: '', slug: '', image: '', description: '' };
function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (n: number) => void }) {
  return <div className="live-actions"><button disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} · {total} brands</span><button disabled={page * 20 >= total} onClick={() => onChange(page + 1)}>Next</button></div>;
}
function Editor({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxHeight: '90vh', overflow: 'auto' }}><button className="modal-close" aria-label="Close dialog" onClick={onClose}>×</button><h2>{title}</h2>{children}</section></div>;
}
export function Brands() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const list = useApi<Page<Brand>>(`/admin/brands?page=${page}&search=${encodeURIComponent(search)}`);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  function changeName(name: string) {
    setDraft(d => ({ ...d, name, slug: !d.slug || d.slug === slugify(d.name) ? slugify(name) : d.slug }));
  }
  async function remove(brand: Brand) {
    if (!confirm(`Delete the brand “${brand.name}”? Products keep their listing but lose this brand.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await api('/admin/brands/' + brand.id, 'DELETE');
      list.reload();
      setMessage('Brand deleted.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="panel">
    <div className="panel-heading"><h2>Brands</h2><button className="primary" onClick={() => { setDraft(blank); setEditing(''); setMessage(''); }}>Add brand</button></div>
    <p className="muted">Brands such as Samsung or iPhone appear in the vendor product form and on the customer homepage. Upload a logo for each brand.</p>
    <input aria-label="Search brands" placeholder="Search brands" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
    <p role="status">{list.error || (list.loading ? 'Loading…' : '')}</p>
    <div className="table-scroll"><table><thead><tr><th>Logo</th><th>Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead><tbody>{list.data?.items.map(brand => <tr key={brand.id}>
      <td>{brand.image ? <img src={brand.image} alt={`${brand.name} logo`} width={48} height={32} style={{ objectFit: 'contain' }} /> : <span className="muted">No logo</span>}</td>
      <td><b>{brand.name}</b>{brand.description && <div className="muted">{brand.description}</div>}</td>
      <td className="muted">/{brand.slug}</td>
      <td>{brand._count?.products || 0}</td>
      <td><button onClick={() => { setDraft({ name: brand.name, slug: brand.slug, image: brand.image || '', description: brand.description || '' }); setEditing(brand.id); setMessage(''); }}>Edit</button><button disabled={busy} onClick={() => void remove(brand)}>Delete</button></td>
    </tr>)}</tbody></table></div>
    <Pager page={page} total={list.data?.total || 0} onChange={setPage} />
    <p role="status">{message}</p>
    {editing !== null && <Editor title={editing ? 'Edit brand' : 'Add brand'} onClose={() => setEditing(null)}>
      <form onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          await api('/admin/brands' + (editing ? '/' + editing : ''), editing ? 'PATCH' : 'POST', { name: draft.name, slug: draft.slug, image: draft.image || null, description: draft.description });
          setEditing(null);
          list.reload();
          setMessage('Brand saved.');
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}>
        <label>Brand name<input required maxLength={200} value={draft.name} onChange={e => changeName(e.target.value)} placeholder="e.g. Samsung" /></label>
        <label>Slug<input required maxLength={180} pattern="[a-z0-9-]+" value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} placeholder="e.g. samsung" /></label>
        <label>Description<textarea maxLength={5000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <label>Logo image<input value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} placeholder="https://… or upload below" /></label>
        <UploadField onUploaded={url => setDraft(d => ({ ...d, image: url }))} />
        {draft.image && <div style={{ margin: '8px 0 16px' }}><img src={draft.image} alt="Brand logo preview" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }} /></div>}
        <div className="live-actions"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save brand'}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
        <p role="alert">{message}</p>
      </form>
    </Editor>}
  </section>;
}
