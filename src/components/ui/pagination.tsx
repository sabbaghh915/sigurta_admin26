import { useMemo } from "react";
import { Button } from "./button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: (number | "all")[];
};

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 200],
}: PaginationProps) {
  const { from, to, hasPrev, hasNext, windowPages } = useMemo(() => {
    // إذا كان pageSize = -1 يعني "الكل"
    const isAll = pageSize === -1;
    const safePageSize = isAll ? total || 1 : (pageSize || 10);
    const pagesCount = isAll ? 1 : Math.max(1, Math.ceil((total || 0) / safePageSize));
    const current = Math.min(Math.max(1, page || 1), pagesCount);

    const startIndex = total === 0 ? 0 : isAll ? 1 : (current - 1) * safePageSize + 1;
    const endIndex = total === 0 ? 0 : isAll ? total : Math.min(total, current * safePageSize);

    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(pagesCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const windowPages: (number | "...")[] = [];
    if (start > 1) windowPages.push(1);
    if (start > 2) windowPages.push("...");
    for (let i = start; i <= end; i++) windowPages.push(i);
    if (end < pagesCount - 1) windowPages.push("...");
    if (end < pagesCount) windowPages.push(pagesCount);

    return {
      pages: pagesCount,
      from: startIndex,
      to: endIndex,
      hasPrev: current > 1,
      hasNext: current < pagesCount,
      windowPages,
    };
  }, [page, pageSize, total]);

  if (total === 0) return null;

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm text-slate-500">
        عرض {from} - {to} من {total}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">عدد بالصفحة:</span>
            <select
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={pageSize === -1 ? -1 : pageSize}
              onChange={(e) => {
                const val = e.target.value;
                const next = val === "-1" || val === "all" ? -1 : Number(val) || 10;
                onPageSizeChange(next);
                // إعادة تعيين الصفحة إلى 1 عند تغيير حجم الصفحة
                if (next !== pageSize) {
                  onPageChange(1);
                }
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n === "all" ? -1 : n}>
                  {n === "all" ? "الكل" : n}
                </option>
              ))}
            </select>
          </div>
        )}

        {pageSize !== -1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => hasPrev && onPageChange(1)}
            >
              الأولى
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => hasPrev && onPageChange(page - 1)}
            >
              السابق
            </Button>

            {windowPages.map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-2 text-slate-400">
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? "default" : "outline"}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => hasNext && onPageChange(page + 1)}
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


