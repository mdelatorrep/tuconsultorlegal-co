import { sanitizeHtml } from '@/utils/htmlSanitizer';

export const handlePreviewDocument = (documentData: any) => {
  if (!documentData) return;
  
  // Sanitizar HTML antes de renderizar
  const sanitizedContent = sanitizeHtml(documentData.document_content);
  
  // Create a preview window with proper viewport and anti-aliasing settings
  const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  if (previewWindow) {
    previewWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista Previa - ${documentData.document_type}</title>
          <style>
            * {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            html {
              font-size: 16px;
              line-height: 1.6;
            }
            body { 
              font-family: "Times New Roman", Times, serif;
              font-size: 12pt;
              padding: 30px; 
              position: relative;
              margin: 0;
              background: #ffffff;
              color: #282828;
              max-width: 800px;
              margin: 0 auto;
              box-sizing: border-box;
            }
            .watermark { 
              position: fixed; 
              top: 50%; 
              left: 50%; 
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: clamp(48px, 8vw, 72px);
              color: rgba(200, 200, 200, 0.25); 
              z-index: -1;
              pointer-events: none;
              font-weight: bold;
              letter-spacing: 0.1em;
            }
            h1 {
              font-family: Helvetica, Arial, sans-serif;
              font-size: 1.75rem;
              font-weight: 600;
              color: #0372E8;
              margin-bottom: 1.5rem;
              line-height: 1.3;
            }
            .content { 
              font-family: "Times New Roman", Times, serif;
              font-size: 12pt;
              line-height: 1.7;
              color: #282828;
              white-space: pre-wrap;
              word-wrap: break-word;
              text-align: justify;
            }
            /* Preserve inline styles from ReactQuill */
            .content * {
              white-space: pre-wrap;
            }
            .content p {
              margin-bottom: 1em;
              white-space: pre-wrap;
            }
            .content strong, .content b {
              font-weight: 700;
            }
            .content em, .content i {
              font-style: italic;
            }
            .content u {
              text-decoration: underline;
            }
            .content s {
              text-decoration: line-through;
            }
            /* Headings with corporate color */
            .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
              font-family: Helvetica, Arial, sans-serif;
              color: #0372E8;
              font-weight: 700;
              margin-top: 1.5em;
              margin-bottom: 0.75em;
              line-height: 1.3;
            }
            .content h1 { font-size: 2em; }
            .content h2 { font-size: 1.75em; }
            .content h3 { font-size: 1.5em; }
            .content h4 { font-size: 1.25em; }
            .content h5 { font-size: 1.1em; }
            .content h6 { font-size: 1em; }
            .content ul, .content ol {
              margin: 1em 0;
              padding-left: 2em;
            }
            .content ul {
              list-style-type: disc;
            }
            .content ol {
              list-style-type: decimal;
            }
            .content li {
              margin-bottom: 0.5em;
              line-height: 1.6;
            }
            .content blockquote {
              border-left: 4px solid #ddd;
              padding-left: 1em;
              margin: 1em 0;
              color: #666;
              font-style: italic;
            }
            .content pre {
              background: #f5f5f5;
              padding: 1em;
              border-radius: 4px;
              overflow-x: auto;
            }
            .content code {
              background: #f5f5f5;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: monospace;
            }
            .content a {
              color: #0372E8;
              text-decoration: underline;
            }
            .content blockquote {
              border-left: 4px solid #cccccc;
              padding-left: 1em;
              margin: 1em 0;
              color: #666;
              font-style: italic;
            }
            @media (max-width: 768px) {
              body {
                padding: 20px 15px;
              }
              h1 {
                font-size: 1.5rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="watermark">VISTA PREVIA</div>
          <h1>${documentData.document_type}</h1>
          <div class="content">${sanitizedContent}</div>
        </body>
      </html>
    `);
    previewWindow.document.close();
  }
};