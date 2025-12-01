/**
 * Shared styles utility for document previews
 * Matches PDF generator formatting to ensure consistency
 */

// Corporate colors matching pdfGenerator.ts
export const PREVIEW_COLORS = {
  primaryDark: '#0372E8',    // Corporate blue for headings
  text: '#282828',           // Dark gray for body text
  lightGray: '#cccccc',      // Light gray for borders
  background: '#ffffff'      // White background
};

/**
 * CSS styles for document previews that match PDF formatting
 * Preserves inline styles from ReactQuill editor
 */
export const getPreviewStyles = () => `
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.7;
    color: ${PREVIEW_COLORS.text};
    background: ${PREVIEW_COLORS.background};
    margin: 0;
    padding: 30px;
  }

  .preview-content {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.7;
    color: ${PREVIEW_COLORS.text};
    text-align: justify;
  }

  /* Preserve inline styles from ReactQuill editor */
  .preview-content * {
    /* Allow inline styles to take precedence */
    line-height: inherit;
  }

  .preview-content p {
    margin-bottom: 1em;
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.7;
  }

  .preview-content br {
    display: block;
    content: "";
    margin: 0.5em 0;
  }

  /* Bold and italic - preserve color from inline styles */
  .preview-content strong,
  .preview-content b {
    font-weight: 700;
  }

  .preview-content em,
  .preview-content i {
    font-style: italic;
  }

  .preview-content u {
    text-decoration: underline;
  }

  .preview-content s {
    text-decoration: line-through;
  }

  /* Headings with corporate color */
  .preview-content h1,
  .preview-content h2,
  .preview-content h3,
  .preview-content h4,
  .preview-content h5,
  .preview-content h6 {
    font-family: Helvetica, Arial, sans-serif;
    color: ${PREVIEW_COLORS.primaryDark};
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    line-height: 1.3;
  }

  .preview-content h1 { font-size: 2em; }
  .preview-content h2 { font-size: 1.75em; }
  .preview-content h3 { font-size: 1.5em; }
  .preview-content h4 { font-size: 1.25em; }
  .preview-content h5 { font-size: 1.1em; }
  .preview-content h6 { font-size: 1em; }

  /* Lists */
  .preview-content ul,
  .preview-content ol {
    margin: 1em 0;
    padding-left: 2em;
  }

  .preview-content ul {
    list-style-type: disc;
  }

  .preview-content ol {
    list-style-type: decimal;
  }

  .preview-content li {
    margin-bottom: 0.5em;
    line-height: 1.7;
  }

  /* Blockquotes */
  .preview-content blockquote {
    border-left: 4px solid ${PREVIEW_COLORS.lightGray};
    padding-left: 1em;
    margin: 1em 0;
    color: #666;
    font-style: italic;
  }

  /* Code blocks */
  .preview-content pre {
    background: #f5f5f5;
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
  }

  .preview-content code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }

  /* Links */
  .preview-content a {
    color: ${PREVIEW_COLORS.primaryDark};
    text-decoration: underline;
  }

  /* Tables */
  .preview-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  .preview-content th,
  .preview-content td {
    border: 1px solid ${PREVIEW_COLORS.lightGray};
    padding: 0.5em;
    text-align: left;
  }

  .preview-content th {
    background: #f5f5f5;
    font-weight: 700;
  }
`;
