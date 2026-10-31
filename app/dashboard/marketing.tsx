'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { api, useApi } from '../components/commerce-client';
import { Icon } from '../components/ui';

type Campaign = {
  id: string;
  name: string;
  createdAt: string;
  messages: {
    id: string;
    phone: string;
    channel: string;
    status: string;
    providerId: string | null;
    error: string | null;
  }[];
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  tag: string;
  createdAt: string;
};

type CustomerItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
};

function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('03') && digits.length === 11) return '+92' + digits.slice(1);
  if (digits.startsWith('92') && !digits.startsWith('+')) return '+' + digits;
  if (!digits.startsWith('+') && digits.length === 10) return '+92' + digits;
  return digits || trimmed;
}

const STORAGE_KEY = 'barwaqt_marketing_phonebook_v1';

export function Marketing() {
  const config = useApi<{ smsConfigured: boolean; whatsappConfigured: boolean; maxRecipients: number }>(
    '/admin/marketing/config',
  );
  const history = useApi<Campaign[]>('/admin/marketing/campaigns');
  const reload = history.reload;

  // Poll for status updates
  useEffect(() => {
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [reload]);

  // Phone Book / Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveContacts = (updated: Contact[]) => {
    setContacts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // UI Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhoneBookModal, setShowPhoneBookModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Search & Filters
  const [campaignSearch, setCampaignSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilterTag, setContactFilterTag] = useState('ALL');

  // New Campaign Form State
  const [name, setName] = useState('');
  const [sms, setSms] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [text, setText] = useState('');
  const [template, setTemplate] = useState('');
  const [header, setHeader] = useState('');
  const [variables, setVariables] = useState('');
  const [recipientMode, setRecipientMode] = useState<'phonebook' | 'manual'>('phonebook');
  const [selectedContactPhones, setSelectedContactPhones] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const request = useRef<{ body: string; key: string } | null>(null);

  // Phone Book Management Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactTag, setNewContactTag] = useState('Customer');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [bulkTag, setBulkTag] = useState('Customer');
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [phoneBookTab, setPhoneBookTab] = useState<'single' | 'bulk'>('single');

  // Stats computation
  const stats = useMemo(() => {
    const list = history.data || [];
    let totalMessages = 0;
    let acceptedMessages = 0;
    let failedMessages = 0;
    for (const c of list) {
      for (const m of c.messages) {
        totalMessages++;
        if (m.status === 'ACCEPTED') acceptedMessages++;
        if (m.status === 'FAILED' || m.status === 'UNKNOWN') failedMessages++;
      }
    }
    const rate = totalMessages > 0 ? Math.round((acceptedMessages / totalMessages) * 100) : 0;
    return {
      campaignCount: list.length,
      totalMessages,
      acceptedMessages,
      failedMessages,
      successRate: rate,
    };
  }, [history.data]);

  // Contact tags
  const tags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.tag) set.add(c.tag);
    });
    return Array.from(set);
  }, [contacts]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesTag = contactFilterTag === 'ALL' || c.tag === contactFilterTag;
      const q = contactSearch.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.tag.toLowerCase().includes(q);
      return matchesTag && matchesSearch;
    });
  }, [contacts, contactFilterTag, contactSearch]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.toLowerCase();
    if (!q) return history.data || [];
    return (history.data || []).filter((c) => c.name.toLowerCase().includes(q));
  }, [history.data, campaignSearch]);

  // Handlers for Phone Book
  const handleAddSingleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim()) return;
    const formatted = formatPhone(newContactPhone);
    const existingIndex = contacts.findIndex((c) => c.phone === formatted);
    if (existingIndex >= 0) {
      alert(`Phone number ${formatted} is already in the Phone Book.`);
      return;
    }
    const newEntry: Contact = {
      id: crypto.randomUUID(),
      name: newContactName.trim() || 'Contact',
      phone: formatted,
      tag: newContactTag.trim() || 'General',
      createdAt: new Date().toISOString(),
    };
    saveContacts([newEntry, ...contacts]);
    setNewContactName('');
    setNewContactPhone('');
  };

  const handleAddBulkContacts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNumbers.trim()) return;
    const rawList = bulkNumbers.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const existingSet = new Set(contacts.map((c) => c.phone));
    const added: Contact[] = [];
    for (const raw of rawList) {
      const p = formatPhone(raw);
      if (p && !existingSet.has(p)) {
        existingSet.add(p);
        added.push({
          id: crypto.randomUUID(),
          name: `Contact ${p.slice(-4)}`,
          phone: p,
          tag: bulkTag.trim() || 'Bulk',
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (added.length === 0) {
      alert('All provided numbers already exist in your Phone Book or were invalid.');
      return;
    }
    saveContacts([...added, ...contacts]);
    setBulkNumbers('');
    alert(`Successfully added ${added.length} contacts to your Phone Book!`);
  };

  const handleImportCustomers = async () => {
    try {
      setImportingCustomers(true);
      const res = await api<{ items: CustomerItem[]; total: number }>('/admin/customers?limit=100');
      if (res && res.items) {
        const existingSet = new Set(contacts.map((c) => c.phone));
        const imported: Contact[] = [];
        for (const cust of res.items) {
          if (cust.phone) {
            const p = formatPhone(cust.phone);
            if (!existingSet.has(p)) {
              existingSet.add(p);
              imported.push({
                id: crypto.randomUUID(),
                name: `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Customer',
                phone: p,
                tag: 'Registered Customer',
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
        if (imported.length > 0) {
          saveContacts([...imported, ...contacts]);
          alert(`Successfully imported ${imported.length} customer phone numbers!`);
        } else {
          alert('No new customer phone numbers found to import.');
        }
      }
    } catch (err) {
      alert('Failed to import customers: ' + (err as Error).message);
    } finally {
      setImportingCustomers(false);
    }
  };

  const handleDeleteContact = (id: string) => {
    saveContacts(contacts.filter((c) => c.id !== id));
    setSelectedContactPhones((prev) => prev.filter((p) => p !== contacts.find((c) => c.id === id)?.phone));
  };

  const handleClearAllContacts = () => {
    if (confirm('Are you sure you want to clear your entire Phone Book?')) {
      saveContacts([]);
      setSelectedContactPhones([]);
    }
  };

  // Toggle selection for campaign
  const toggleContactPhone = (phone: string) => {
    setSelectedContactPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone].slice(0, 100),
    );
  };

  const selectAllFilteredContacts = () => {
    const phones = filteredContacts.map((c) => c.phone);
    const combined = Array.from(new Set([...selectedContactPhones, ...phones])).slice(0, 100);
    setSelectedContactPhones(combined);
  };

  const deselectAllFilteredContacts = () => {
    const phones = new Set(filteredContacts.map((c) => c.phone));
    setSelectedContactPhones((prev) => prev.filter((p) => !phones.has(p)));
  };

  // Handle Campaign Submit
  const handleCreateCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    let recipients: string[] = [];
    if (recipientMode === 'phonebook') {
      recipients = selectedContactPhones;
    } else {
      recipients = manualNumbers
        .split(/[\n,;]+/)
        .map((v) => formatPhone(v))
        .filter(Boolean);
    }

    if (recipients.length === 0) {
      setFeedback({ type: 'error', message: 'Please select or enter at least one recipient phone number.' });
      setBusy(false);
      return;
    }

    if (recipients.length > 100) {
      setFeedback({ type: 'error', message: 'Maximum 100 recipients allowed per campaign.' });
      setBusy(false);
      return;
    }

    const body = {
      name: name.trim(),
      recipients,
      channels: [...(sms ? ['SMS'] : []), ...(whatsapp ? ['WHATSAPP'] : [])],
      ...(sms ? { smsText: text } : {}),
      ...(whatsapp
        ? {
            whatsapp: {
              templateId: Number(template),
              headerVariables: header ? [header] : [],
              bodyVariables: variables ? variables.split('\n') : [],
            },
          }
        : {}),
    };

    const serialized = JSON.stringify(body);
    if (request.current?.body !== serialized) {
      request.current = { body: serialized, key: crypto.randomUUID() };
    }

    try {
      const result = await api<Campaign>('/admin/marketing/campaigns', 'POST', body, request.current.key);
      setFeedback({
        type: 'success',
        message: `Campaign "${result.name}" queued with ${result.messages.length} messages!`,
      });
      history.reload();
      setTimeout(() => {
        setShowCreateModal(false);
        setName('');
        setText('');
        setSelectedContactPhones([]);
        setManualNumbers('');
        setFeedback(null);
      }, 1500);
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Top Header & Action Row */}
      <section className="panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="bell" size={24} />
              Marketing & SMS Campaigns
            </h2>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              Broadcast SMS and WhatsApp promotions to customers, manage your phone directory, and track real-time delivery status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
              }}
              onClick={() => {
                setFeedback(null);
                setShowCreateModal(true);
              }}
            >
              <Icon name="bell" size={17} />
              + Create Campaign
            </button>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                background: '#f0fdf4',
                color: '#15803d',
                borderColor: '#bbf7d0',
              }}
              onClick={() => setShowPhoneBookModal(true)}
            >
              <Icon name="user" size={17} />
              Manage Phone Book ({contacts.length})
            </button>

            <button
              type="button"
              className="mini-button"
              style={{ padding: '9px 14px' }}
              onClick={reload}
              title="Refresh campaigns"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Real-time Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              Total Campaigns
            </span>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{stats.campaignCount}</div>
            <small style={{ color: '#64748b', fontSize: 11 }}>Broadcast records</small>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              Messages Sent
            </span>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>{stats.totalMessages}</div>
            <small style={{ color: '#0284c7', fontSize: 11 }}>All-time recipient targets</small>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              Accepted by Veevo
            </span>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
              {stats.acceptedMessages}{' '}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#15803d' }}>({stats.successRate}%)</span>
            </div>
            <small style={{ color: '#16a34a', fontSize: 11 }}>Successfully accepted gateway hits</small>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              Gateway Status
            </span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                  background: config.data?.smsConfigured ? '#dcfce7' : '#fee2e2',
                  color: config.data?.smsConfigured ? '#15803d' : '#b91c1c',
                }}
              >
                SMS: {config.data?.smsConfigured ? 'Ready' : 'Not configured'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                  background: config.data?.whatsappConfigured ? '#dcfce7' : '#f1f5f9',
                  color: config.data?.whatsappConfigured ? '#15803d' : '#64748b',
                }}
              >
                WhatsApp: {config.data?.whatsappConfigured ? 'Ready' : 'Off'}
              </span>
            </div>
            <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 4 }}>
              Max {config.data?.maxRecipients || 100} recipients / send
            </small>
          </div>
        </div>
      </section>

      {/* Campaigns History Section */}
      <section className="panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Campaign History & Stats</h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              Inspect status for each broadcast. Click on any campaign to see recipient details and delivery status.
            </p>
          </div>
          <div style={{ width: 280 }}>
            <input
              type="search"
              placeholder="Search campaigns..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              style={{ width: '100%', margin: 0, padding: '8px 12px', fontSize: 13 }}
            />
          </div>
        </div>

        {history.error && <p role="alert">{history.error}</p>}

        {filteredCampaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Icon name="bell" size={32} />
            <p style={{ marginTop: 12, fontWeight: 500 }}>No marketing campaigns found.</p>
            <button
              type="button"
              className="primary"
              style={{ marginTop: 8 }}
              onClick={() => setShowCreateModal(true)}
            >
              + Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Campaign Name</th>
                  <th style={{ padding: '12px 16px' }}>Channels</th>
                  <th style={{ padding: '12px 16px' }}>Recipients</th>
                  <th style={{ padding: '12px 16px' }}>Delivery Progress</th>
                  <th style={{ padding: '12px 16px' }}>Created Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const accepted = c.messages.filter((m) => m.status === 'ACCEPTED').length;
                  const total = c.messages.length;
                  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;
                  const channels = Array.from(new Set(c.messages.map((m) => m.channel)));

                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => setSelectedCampaign(c)}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <b>{c.name}</b>
                        <div style={{ fontSize: 11, color: '#64748b' }}>ID: {c.id.slice(0, 8)}...</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {channels.map((ch) => (
                            <span
                              key={ch}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: ch === 'SMS' ? '#eff6ff' : '#ecfdf5',
                                color: ch === 'SMS' ? '#1d4ed8' : '#047857',
                                border: `1px solid ${ch === 'SMS' ? '#bfdbfe' : '#a7f3d0'}`,
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {total} {total === 1 ? 'contact' : 'contacts'}
                      </td>
                      <td style={{ padding: '14px 16px', minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              background: '#e2e8f0',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: pct === 100 ? '#16a34a' : pct > 0 ? '#3b82f6' : '#ef4444',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 45 }}>
                            {accepted}/{total}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="mini-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCampaign(c);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-modal-title"
            style={{ width: 840, maxWidth: '95vw', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
              ×
            </button>
            <h2 id="campaign-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
              <Icon name="bell" size={24} />
              Create Marketing Campaign
            </h2>

            <form onSubmit={handleCreateCampaign} style={{ display: 'grid', gap: 18 }}>
              {/* Campaign Name */}
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Campaign Name *</span>
                <input
                  required
                  maxLength={100}
                  placeholder="e.g. November Flash Sale / VIP Discount"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              {/* Channels Selection */}
              <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                <legend style={{ fontWeight: 600, padding: '0 6px', fontSize: 13 }}>Broadcast Channels *</legend>
                <div style={{ display: 'flex', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
                    <span>
                      <b>SMS Channel</b>
                      <small style={{ display: 'block', color: config.data?.smsConfigured ? '#16a34a' : '#dc2626' }}>
                        {config.data?.smsConfigured ? 'Ready to send' : 'Gateway not configured'}
                      </small>
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
                    <span>
                      <b>WhatsApp Channel</b>
                      <small style={{ display: 'block', color: config.data?.whatsappConfigured ? '#16a34a' : '#64748b' }}>
                        {config.data?.whatsappConfigured ? 'Ready to send' : 'Optional template API'}
                      </small>
                    </span>
                  </label>
                </div>
              </fieldset>

              {/* RECIPIENT NUMBERS SELECTION */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    Recipients ({recipientMode === 'phonebook' ? selectedContactPhones.length : manualNumbers.split(/[\n,;]+/).filter(Boolean).length} / 100)
                  </span>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: recipientMode === 'phonebook' ? '#0f172a' : '#fff',
                        color: recipientMode === 'phonebook' ? '#fff' : '#0f172a',
                      }}
                      onClick={() => setRecipientMode('phonebook')}
                    >
                      Select from Phone Book ({contacts.length})
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: recipientMode === 'manual' ? '#0f172a' : '#fff',
                        color: recipientMode === 'manual' ? '#fff' : '#0f172a',
                      }}
                      onClick={() => setRecipientMode('manual')}
                    >
                      Paste Numbers Manually
                    </button>
                  </div>
                </div>

                {recipientMode === 'phonebook' ? (
                  <div>
                    {contacts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 10px', background: '#fff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Your Phone Book is currently empty.</p>
                        <button
                          type="button"
                          className="primary"
                          style={{ marginTop: 10, fontSize: 12, padding: '6px 14px' }}
                          onClick={() => {
                            setShowPhoneBookModal(true);
                          }}
                        >
                          + Add Numbers to Phone Book
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="search"
                            placeholder="Filter contacts..."
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            style={{ flex: 1, minWidth: 160, padding: '6px 10px', fontSize: 12, margin: 0 }}
                          />
                          <select
                            value={contactFilterTag}
                            onChange={(e) => setContactFilterTag(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: 12, margin: 0 }}
                          >
                            <option value="ALL">All Tags</option>
                            {tags.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={selectAllFilteredContacts}
                          >
                            Select All Filtered
                          </button>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={deselectAllFilteredContacts}
                          >
                            Deselect
                          </button>
                        </div>

                        {/* Contacts Selection Grid */}
                        <div
                          style={{
                            maxHeight: 220,
                            overflowY: 'auto',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: 8,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {filteredContacts.map((c) => {
                            const isSelected = selectedContactPhones.includes(c.phone);
                            return (
                              <label
                                key={c.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: `1px solid ${isSelected ? '#86efac' : '#f1f5f9'}`,
                                  background: isSelected ? '#f0fdf4' : '#fafafa',
                                  cursor: 'pointer',
                                  margin: 0,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleContactPhone(c.phone)}
                                  style={{ margin: 0 }}
                                />
                                <div style={{ overflow: 'hidden' }}>
                                  <b style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {c.name}
                                  </b>
                                  <small style={{ color: '#64748b', fontSize: 11 }}>{c.phone}</small>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={4}
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      placeholder="+923001234567, +923451234567&#10;or 03001234567 (one number per line)"
                      style={{ width: '100%', fontSize: 13, fontFamily: 'monospace' }}
                    />
                    <small style={{ color: '#64748b' }}>
                      Tip: Enter numbers with country code (e.g. +923001234567) or local format (03001234567). Up to 100 recipients.
                    </small>
                  </div>
                )}
              </div>

              {/* SMS Message content */}
              {sms && (
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>SMS Message Text *</span>
                    <small style={{ color: text.length > 160 ? '#d97706' : '#64748b' }}>
                      {text.length} characters ({Math.ceil(text.length / 160) || 1} SMS unit{text.length > 160 ? 's' : ''})
                    </small>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={1600}
                    placeholder="Write your promotional SMS message here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
              )}

              {/* WhatsApp options */}
              {whatsapp && (
                <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', padding: 14, borderRadius: 8, display: 'grid', gap: 10 }}>
                  <b style={{ color: '#166534', fontSize: 13 }}>WhatsApp Template Details (Veevo)</b>
                  <label>
                    Template ID *
                    <input
                      required
                      type="number"
                      min={1}
                      placeholder="e.g. 1024"
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                    />
                  </label>
                  <label>
                    Header Text Variable (Optional)
                    <input
                      maxLength={1000}
                      placeholder="e.g. Mega Sale"
                      value={header}
                      onChange={(e) => setHeader(e.target.value)}
                    />
                  </label>
                  <label>
                    Body Variables (one per line)
                    <textarea
                      rows={3}
                      placeholder="50% Off&#10;BARWAQT2026"
                      value={variables}
                      onChange={(e) => setVariables(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {feedback && (
                <p
                  role="alert"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
                  }}
                >
                  {feedback.message}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || (!sms && !whatsapp) || (sms && !config.data?.smsConfigured)}
                  style={{ minWidth: 160 }}
                >
                  {busy ? 'Queuing Campaign...' : '🚀 Send Campaign'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* PHONE BOOK & CONTACTS MODAL */}
      {showPhoneBookModal && (
        <div className="modal-backdrop" onClick={() => setShowPhoneBookModal(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phonebook-title"
            style={{ width: 880, maxWidth: '95vw', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowPhoneBookModal(false)}>
              ×
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 id="phonebook-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                <Icon name="user" size={24} />
                Manage Phone Book ({contacts.length} numbers)
              </h2>
              <button
                type="button"
                className="mini-button"
                disabled={importingCustomers}
                onClick={handleImportCustomers}
                style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 600 }}
              >
                {importingCustomers ? 'Importing...' : '📥 Import from Customers'}
              </button>
            </div>

            {/* Mode switch for adding numbers */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: phoneBookTab === 'single' ? '#0f172a' : '#fff',
                  color: phoneBookTab === 'single' ? '#fff' : '#0f172a',
                }}
                onClick={() => setPhoneBookTab('single')}
              >
                + Add Single Contact
              </button>
              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: phoneBookTab === 'bulk' ? '#0f172a' : '#fff',
                  color: phoneBookTab === 'bulk' ? '#fff' : '#0f172a',
                }}
                onClick={() => setPhoneBookTab('bulk')}
              >
                + Bulk Paste Numbers
              </button>
            </div>

            {/* Add single contact form */}
            {phoneBookTab === 'single' ? (
              <form
                onSubmit={handleAddSingleContact}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px',
                  gap: 10,
                  background: '#f8fafc',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  alignItems: 'end',
                  marginBottom: 20,
                }}
              >
                <label style={{ margin: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Contact Name</span>
                  <input
                    placeholder="e.g. Asad Khan"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    style={{ margin: 0, padding: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ margin: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Phone Number *</span>
                  <input
                    required
                    placeholder="+923001234567 or 0300..."
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    style={{ margin: 0, padding: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ margin: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Tag / Group</span>
                  <input
                    placeholder="Customer / VIP"
                    value={newContactTag}
                    onChange={(e) => setNewContactTag(e.target.value)}
                    style={{ margin: 0, padding: 8, fontSize: 13 }}
                  />
                </label>
                <button type="submit" className="primary" style={{ padding: '9px 12px', fontSize: 12 }}>
                  Add Contact
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleAddBulkContacts}
                style={{
                  background: '#f8fafc',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ margin: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Paste multiple numbers (one per line or comma-separated)</span>
                    <textarea
                      required
                      rows={3}
                      placeholder="+923001234567&#10;03451234567&#10;+923331234567"
                      value={bulkNumbers}
                      onChange={(e) => setBulkNumbers(e.target.value)}
                      style={{ width: '100%', marginTop: 6, fontSize: 12, fontFamily: 'monospace' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ margin: 0, flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Assign Tag to these numbers</span>
                      <input
                        value={bulkTag}
                        onChange={(e) => setBulkTag(e.target.value)}
                        placeholder="e.g. VIP Customers"
                        style={{ margin: 0, padding: 6, fontSize: 12 }}
                      />
                    </label>
                    <button type="submit" className="primary" style={{ padding: '8px 16px', fontSize: 12, marginTop: 14 }}>
                      Add All Numbers
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Contacts Table & Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
                <input
                  type="search"
                  placeholder="Search name, phone or tag..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  style={{ flex: 1, margin: 0, padding: 7, fontSize: 12 }}
                />
                <select
                  value={contactFilterTag}
                  onChange={(e) => setContactFilterTag(e.target.value)}
                  style={{ margin: 0, padding: 7, fontSize: 12 }}
                >
                  <option value="ALL">All Tags</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {contacts.length > 0 && (
                <button
                  type="button"
                  className="mini-button"
                  onClick={handleClearAllContacts}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="table-scroll" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px 12px' }}>Name</th>
                    <th style={{ padding: '8px 12px' }}>Phone Number</th>
                    <th style={{ padding: '8px 12px' }}>Tag / Group</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                        No matching contacts in Phone Book.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{c.phone}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {c.tag}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => handleDeleteContact(c.id)}
                            style={{ color: '#dc2626', borderColor: '#fee2e2', padding: '4px 8px', fontSize: 11 }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="primary" onClick={() => setShowPhoneBookModal(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {/* CAMPAIGN DETAILS MODAL */}
      {selectedCampaign && (
        <div className="modal-backdrop" onClick={() => setSelectedCampaign(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-detail-title"
            style={{ width: 840, maxWidth: '95vw', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedCampaign(null)}>
              ×
            </button>
            <h2 id="campaign-detail-title" style={{ margin: '0 0 6px', fontSize: 20 }}>
              {selectedCampaign.name}
            </h2>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 12 }}>
              Broadcast date: {new Date(selectedCampaign.createdAt).toLocaleString()} · ID: {selectedCampaign.id}
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <small style={{ color: '#64748b', display: 'block' }}>Total Recipients</small>
                <b>{selectedCampaign.messages.length}</b>
              </div>
              <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <small style={{ color: '#166534', display: 'block' }}>Accepted</small>
                <b style={{ color: '#15803d' }}>
                  {selectedCampaign.messages.filter((m) => m.status === 'ACCEPTED').length}
                </b>
              </div>
              <div style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca' }}>
                <small style={{ color: '#991b1b', display: 'block' }}>Failed / Unknown</small>
                <b style={{ color: '#dc2626' }}>
                  {selectedCampaign.messages.filter((m) => m.status !== 'ACCEPTED').length}
                </b>
              </div>
            </div>

            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px 12px' }}>Recipient Number</th>
                    <th style={{ padding: '8px 12px' }}>Channel</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Provider Reference / Veevo Error</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCampaign.messages.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{m.phone}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 700,
                            background: m.channel === 'SMS' ? '#eff6ff' : '#ecfdf5',
                            color: m.channel === 'SMS' ? '#1d4ed8' : '#047857',
                          }}
                        >
                          {m.channel}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background:
                              m.status === 'ACCEPTED'
                                ? '#dcfce7'
                                : m.status === 'SENDING' || m.status === 'QUEUED'
                                  ? '#e0f2fe'
                                  : '#fee2e2',
                            color:
                              m.status === 'ACCEPTED'
                                ? '#15803d'
                                : m.status === 'SENDING' || m.status === 'QUEUED'
                                  ? '#0369a1'
                                  : '#b91c1c',
                          }}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: m.error ? '#b91c1c' : '#334155' }}>
                        {m.error || (m.providerId ? `ID: ${m.providerId}` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setSelectedCampaign(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
