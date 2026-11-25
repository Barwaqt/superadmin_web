'use client';

import { Notfound } from './components/notfound';

export default function AdminNotFound() {
  return (
    <Notfound
      homeHref="/dashboard"
      trackHref="/dashboard"
      helpHref="mailto:support@barwaqt.com"
      searchPlaceholder="Search dashboard, orders or products..."
      onSearch={(term) => {
        window.location.href = `/dashboard?search=${encodeURIComponent(term)}`;
      }}
    />
  );
}
