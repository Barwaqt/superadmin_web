'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import s from './notfound.module.css';

export interface NotFoundProps {
  homeHref?: string;
  trackHref?: string;
  helpHref?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  showSearch?: boolean;
}

export function Notfound({
  homeHref = '/',
  trackHref = '/profile',
  helpHref = 'mailto:support@barwaqt.com',
  searchPlaceholder = 'Search items, groceries or categories...',
  onSearch,
  showSearch = true,
}: NotFoundProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (onSearch) {
      onSearch(term);
    } else {
      router.push(`/?q=${encodeURIComponent(term)}`);
    }
  };

  return (
    <div className={s.page}>
      {/* 3D Map & Delivery Route Illustration */}
      <div className={s.illustrationWrap} aria-hidden="true">
        <picture>
          <source srcSet="/not-found-illustration.webp" type="image/webp" />
          <img
            src="/not-found-illustration.png"
            alt="Delivery map 404 illustration"
            width={487}
            height={310}
            className={s.illustrationImg}
          />
        </picture>
      </div>

      {/* Dashed line with center stitch X marker */}
      <div className={s.dividerWrap} aria-hidden="true">
        <svg
          width="430"
          height="18"
          viewBox="0 0 430 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={s.dividerSvg}
        >
          <line x1="0" y1="9" x2="204" y2="9" stroke="#70B5F5" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="207" y1="3" x2="221" y2="15" stroke="#70B5F5" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="221" y1="3" x2="207" y2="15" stroke="#70B5F5" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="224" y1="9" x2="430" y2="9" stroke="#70B5F5" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      </div>

      {/* Main Title Row: 404 Error • Page Not Found */}
      <div className={s.titleRow}>
        <h1 className={s.title}>
          <span>404 Error</span>
          <span className={s.dot} aria-hidden="true" />
          <span>Page Not Found</span>
        </h1>
      </div>

      {/* Subtitles */}
      <p className={s.lead}>
        The page you&apos;re looking for doesn&apos;t exist or has moved.
        <br />
        Let&apos;s get your delivery back on track.
      </p>

      {/* Urdu Localized Note */}
      <div className={s.urduBadge} dir="rtl" lang="ur">
        معذرت! یہ صفحہ دستیاب نہیں ہے۔
      </div>

      {/* Search Bar */}
      {showSearch && (
        <form className={s.searchBar} onSubmit={handleSearch} role="search">
          <span className={s.searchIcon} aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className={s.searchInput}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={searchPlaceholder}
          />
          <button type="submit" className={s.searchBtn}>
            Find &rarr;
          </button>
        </form>
      )}

      {/* Actions: Back to Home, Track Order, Help Center */}
      <div className={s.actions}>
        <Link href={homeHref} className={s.primary}>
          <span className={s.iconWrap}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          Back to Home
        </Link>

        <Link href={trackHref} className={s.secondary}>
          <span className={s.iconWrap}>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
          </span>
          Track Order
        </Link>

        <Link href={helpHref} className={s.secondary}>
          <span className={s.iconWrap}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </span>
          Help Center
        </Link>
      </div>
    </div>
  );
}

export default Notfound;
