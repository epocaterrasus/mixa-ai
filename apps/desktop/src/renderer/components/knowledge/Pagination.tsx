// Knowledge pagination controls

import { Icon } from "@mixa-ai/ui";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onSetPage: (page: number) => void;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "12px 16px",
  borderTop: "1px solid var(--mixa-border-subtle)",
  flexShrink: 0,
};

const pageButtonStyle: React.CSSProperties = {
  minWidth: "30px",
  height: "30px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.1s",
};

const pageButtonActiveStyle: React.CSSProperties = {
  ...pageButtonStyle,
  backgroundColor: "var(--mixa-accent-primary)",
  color: "#fff",
  borderColor: "var(--mixa-accent-primary)",
};

const pageButtonDisabledStyle: React.CSSProperties = {
  ...pageButtonStyle,
  color: "var(--mixa-text-disabled)",
  cursor: "default",
};

const infoStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  padding: "0 12px",
};

export function Pagination({
  page,
  pageSize,
  total,
  onSetPage,
}: PaginationProps): React.ReactElement | null {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  // Build page numbers to display
  const pages: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(0, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible);
  if (endPage - startPage < maxVisible) {
    startPage = Math.max(0, endPage - maxVisible);
  }
  for (let i = startPage; i < endPage; i++) {
    pages.push(i);
  }

  return (
    <div style={containerStyle}>
      {/* Previous */}
      <button
        type="button"
        style={page === 0 ? pageButtonDisabledStyle : pageButtonStyle}
        onClick={() => {
          if (page > 0) onSetPage(page - 1);
        }}
        disabled={page === 0}
        title="Previous page"
        aria-label="Previous page"
        onMouseEnter={(e) => {
          if (page > 0) {
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (page > 0) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
      >
        <Icon name="arrowLeft" size={14} />
      </button>

      {/* Page numbers */}
      {startPage > 0 && (
        <>
          <button
            type="button"
            style={pageButtonStyle}
            onClick={() => onSetPage(0)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            1
          </button>
          {startPage > 1 && (
            <span style={{ ...infoStyle, padding: "0 2px", display: "flex", alignItems: "center" }}>
              <Icon name="more" size={14} />
            </span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          style={p === page ? pageButtonActiveStyle : pageButtonStyle}
          onClick={() => onSetPage(p)}
          aria-label={`Page ${p + 1}`}
          aria-current={p === page ? "page" : undefined}
          onMouseEnter={(e) => {
            if (p !== page) {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (p !== page) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {p + 1}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span style={{ ...infoStyle, padding: "0 2px", display: "flex", alignItems: "center" }}>
              <Icon name="more" size={14} />
            </span>
          )}
          <button
            type="button"
            style={pageButtonStyle}
            onClick={() => onSetPage(totalPages - 1)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        type="button"
        style={page >= totalPages - 1 ? pageButtonDisabledStyle : pageButtonStyle}
        onClick={() => {
          if (page < totalPages - 1) onSetPage(page + 1);
        }}
        disabled={page >= totalPages - 1}
        title="Next page"
        aria-label="Next page"
        onMouseEnter={(e) => {
          if (page < totalPages - 1) {
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (page < totalPages - 1) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
      >
        <Icon name="arrowRight" size={14} />
      </button>

      {/* Info */}
      <span style={infoStyle}>
        {from}–{to} of {total}
      </span>
    </div>
  );
}
