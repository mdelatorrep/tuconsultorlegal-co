export const handlePreviewDocument = (documentData: any) => {
  if (!documentData) return;
  
  // Create a simple preview window with watermarked content
  const previewWindow = window.open('', '_blank', 'width=800,height=600');
  if (previewWindow) {
    previewWindow.document.write(`
      <html>
        <head>
          <title>Vista Previa - ${documentData.document_type}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; position: relative; }
            .watermark { 
              position: fixed; 
              top: 50%; 
              left: 50%; 
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 72px; 
              color: rgba(200, 200, 200, 0.3); 
              z-index: -1;
              pointer-events: none;
            }
            .content { white-space: pre-line; }
          </style>
        </head>
        <body>
          <div class="watermark">VISTA PREVIA</div>
          <h1>${documentData.document_type}</h1>
          <div class="content">${documentData.document_content}</div>
        </body>
      </html>
    `);
  }
};