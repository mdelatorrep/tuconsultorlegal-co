export const handlePreviewDocument = (documentData: any) => {
  if (!documentData) return;
  
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 30px; 
              position: relative;
              margin: 0;
              background: #ffffff;
              color: #333333;
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
              font-size: 1.75rem;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 1.5rem;
              line-height: 1.3;
            }
            .content { 
              white-space: pre-line;
              font-size: 1rem;
              line-height: 1.7;
              color: #444444;
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
          <div class="content">${documentData.document_content}</div>
        </body>
      </html>
    `);
    previewWindow.document.close();
  }
};