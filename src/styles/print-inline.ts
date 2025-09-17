// Inline-critical print CSS for /cv/print to avoid external CSS fetches during SSR/PDF.
// This combines styles/sr-only.css and styles/print.css (without @import).
export const PRINT_CSS = `
/* Local subset fonts for deterministic print */
@font-face {
  font-family: 'InterSubset';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts-subset/inter-subset.woff2') format('woff2');
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Print specific adjustments – imported only by /cv/print route to avoid global impact */
@media print {
  @page {
    size: A4; /* can be overridden via inline style in /cv/print */
    margin: var(--print-margin, 16mm);
  }
  body {
    background: #ffffff !important;
  font-family: 'InterSubset', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-size: var(--print-font-size, 11pt);
    line-height: var(--print-line-height, 1.35);
  }
  .no-print { display: none !important; }
  .print-only { display: initial !important; }
  .break-avoid { break-inside: avoid; }
}

/* Utility for explicit page breaks if needed later */
.page-break { page-break-after: always; }

/* Screen + Print shared helpers */
.break-avoid { break-inside: avoid; }
.print-density-compact { font-size: 10.5pt; line-height: 1.28; }
` as const
