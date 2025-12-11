/**
 * PDF utilities for lawyer draft module
 * Re-exports from consolidated pdfGenerator for consistency
 */

import { generatePDFDownload } from '@/components/document-payment/pdfGenerator';

// Re-export the main PDF generation function for backwards compatibility
export { generatePDFDownload };

/**
 * Legacy function for extracting plain text from HTML
 * @deprecated Use generatePDFDownload for full PDF generation with HTML support
 */
export const cleanTextForPDF = (html: string): string => {
  // Simple HTML to text conversion for titles
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Generate PDF for lawyer documents (drafts, analysis results, etc.)
 * Uses the unified PDF generator for consistency
 */
export const generatePDF = async (content: string, title: string) => {
  // Create document data structure compatible with generatePDFDownload
  const documentData = {
    document_content: content,
    document_type: title,
    token: `DRAFT-${Date.now().toString(36).toUpperCase()}`,
    reviewed_by_lawyer_name: undefined
  };
  
  generatePDFDownload(documentData);
};
