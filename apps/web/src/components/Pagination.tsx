import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const defaultPageSize = 10;

export function usePagination<T>(items: T[], pageSize = defaultPageSize) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(startIndex, startIndex + pageSize), [items, pageSize, startIndex]);

  return {
    page: currentPage,
    totalPages,
    pageItems,
    startItem: items.length === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + pageSize, items.length),
    totalItems: items.length,
    canGoPrevious: currentPage > 1,
    canGoNext: currentPage < totalPages,
    goPrevious: () => setPage((value) => Math.max(1, value - 1)),
    goNext: () => setPage((value) => Math.min(totalPages, value + 1))
  };
}

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls({
  page,
  totalPages,
  startItem,
  endItem,
  totalItems,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext
}: PaginationControlsProps) {
  return (
    <div className="pagination-bar">
      <span>
        第 {startItem}-{endItem} 条，共 {totalItems} 条
      </span>
      <span>
        第 {page} 页 / 共 {totalPages} 页
      </span>
      <div className="pagination-actions">
        <button type="button" className="secondary-button" onClick={onPrevious} disabled={!canGoPrevious}>
          <ChevronLeft size={16} aria-hidden="true" />
          上一页
        </button>
        <button type="button" className="secondary-button" onClick={onNext} disabled={!canGoNext}>
          下一页
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
