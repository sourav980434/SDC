'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Undo2, ShieldCheck, FileText } from 'lucide-react';
import styles from './notifications.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

const TYPE_LOOK = {
  REPORT_SENT_BACK: { Icon: Undo2, className: 'iconBack' },
  REPORT_RESUBMITTED: { Icon: FileText, className: 'iconInfo' },
  REPORT_APPROVED: { Icon: ShieldCheck, className: 'iconOk' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user: activeUser } = useAuth();

  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState([]);
  const [info, setInfo] = useState({ unread: 0, total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1, which = tab) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '25' });
    if (which === 'unread') params.set('unread', '1');

    fetch(`${API_BASE}/api/notifications?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setRows(data.data || []);
        setInfo({ unread: data.unread || 0, total: data.total || 0, page: data.page || 1, last_page: data.last_page || 1 });
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load(1, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const markRead = async (id) => {
    await fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : {}),
    }).catch(() => {});
    window.dispatchEvent(new Event('sdcp-notifications-changed'));
    load(info.page, tab);
  };

  const openNotification = async (n) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2><Bell size={20} /> Notifications</h2>
          <p>Everything that needs your attention — {activeUser?.username || 'you'} has <strong>{info.unread}</strong> unread.</p>
        </div>
        <button type="button" className={styles.readAllBtn} onClick={() => markRead(null)} disabled={info.unread === 0}>
          <CheckCheck size={15} /> Mark all as read
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}{t.key === 'unread' && info.unread > 0 ? ` (${info.unread})` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={34} />
            <p>{tab === 'unread' ? 'Nothing unread.' : 'No notifications yet.'}</p>
          </div>
        ) : (
          rows.map(n => {
            const look = TYPE_LOOK[n.type] || { Icon: Bell, className: 'iconInfo' };
            const Icon = look.Icon;
            return (
              <div
                key={n.id}
                className={`${styles.row} ${n.is_read ? '' : styles.rowUnread}`}
                onClick={() => openNotification(n)}
              >
                <div className={`${styles.icon} ${styles[look.className]}`}>
                  <Icon size={17} />
                </div>
                <div className={styles.rowBody}>
                  <div className={styles.rowTitle}>
                    {n.title}
                    {!n.is_read && <span className={styles.newDot} />}
                  </div>
                  <div className={styles.rowMessage}>{n.message}</div>
                  <div className={styles.rowMeta}>
                    {n.from ? `From ${n.from} · ` : ''}{n.created_at}
                    {n.is_read && n.read_at ? ` · read ${n.read_at}` : ''}
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    className={styles.readBtn}
                    onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                    title="Mark as read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}

        <div className={styles.pager}>
          <span>{info.total > 0 ? `${info.total} notification${info.total === 1 ? '' : 's'}` : ''}</span>
          <div className={styles.pagerBtns}>
            <button type="button" onClick={() => load(info.page - 1, tab)} disabled={loading || info.page <= 1}>
              <ChevronLeft size={15} /> Prev
            </button>
            <span>Page {info.page} / {info.last_page}</span>
            <button type="button" onClick={() => load(info.page + 1, tab)} disabled={loading || info.page >= info.last_page}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
