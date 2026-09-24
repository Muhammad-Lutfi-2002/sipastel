import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const btn =
    'p-1.5 rounded-lg border border-line text-body hover:text-ink hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors';

  return (
    <nav aria-label="Navigasi halaman" className="flex items-center justify-between gap-3 text-xs text-muted">
      <span>
        {from}–{to} dari {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-body">
          {page} / {pageCount}
        </span>
        <button type="button" className={btn} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Halaman berikutnya">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
