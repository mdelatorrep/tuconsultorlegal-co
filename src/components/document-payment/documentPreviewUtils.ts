import { sanitizeHtml } from '@/utils/htmlSanitizer';
import { getPreviewStyles } from './documentPreviewStyles';

/**
 * Opens a document preview in a new window
 * Uses shared preview styles for consistency with modal previews and PDF generation
 */
export const handlePreviewDocument = (documentData: any) => {
  if (!documentData) return;
  
  // Sanitize HTML before rendering
  const sanitizedContent = sanitizeHtml(documentData.document_content);
  
  // Get shared preview styles for consistency
  const previewStyles = getPreviewStyles();
  
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
            ${previewStyles}
            
            /* Additional styles for standalone preview window */
            html {
              font-size: 16px;
              line-height: 1.6;
            }
            body {
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
            .document-title {
              font-family: Helvetica, Arial, sans-serif;
              font-size: 1.75rem;
              font-weight: 600;
              color: #0372E8;
              margin-bottom: 1.5rem;
              line-height: 1.3;
            }
            @media (max-width: 768px) {
              body {
                padding: 20px 15px;
              }
              .document-title {
                font-size: 1.5rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="watermark">VISTA PREVIA</div>
          <h1 class="document-title">${documentData.document_type}</h1>
          <div class="preview-content">${sanitizedContent}</div>
        </body>
      </html>
    `);
    previewWindow.document.close();
  }
};
