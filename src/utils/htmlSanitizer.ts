import DOMPurify from 'dompurify';

/**
 * Limpieza previa de formato de Microsoft Office
 * Elimina clases Mso* y estilos mso-* que DOMPurify no filtra
 */
const cleanMicrosoftFormat = (html: string): string => {
  if (!html) return '';
  
  return html
    // Eliminar clases de Microsoft Office (Mso*)
    .replace(/class="[^"]*"/gi, (match) => {
      const cleaned = match.replace(/Mso[a-zA-Z0-9_-]*/gi, '').replace(/\s+/g, ' ').trim();
      return cleaned === 'class=""' || cleaned === 'class=" "' ? '' : cleaned;
    })
    // Eliminar estilos de Microsoft Office (mso-*)
    .replace(/style="[^"]*"/gi, (match) => {
      const styleContent = match.slice(7, -1);
      const cleanedProps = styleContent.split(';').filter(prop => {
        const trimmed = prop.trim().toLowerCase();
        return !trimmed.startsWith('mso-') && 
               !trimmed.includes('tab-stops') && 
               !trimmed.includes('layout-grid') &&
               trimmed.length > 0;
      });
      return cleanedProps.length > 0 ? `style="${cleanedProps.join(';')}"` : '';
    })
    // Eliminar tags de Office XML
    .replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '')
    .replace(/<o:[^>]*\/>/gi, '')
    .replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '')
    .replace(/<w:[^>]*\/>/gi, '');
};

/**
 * Sanitiza contenido HTML para prevenir XSS
 * Permite solo etiquetas y atributos seguros comúnmente usados en editores de texto
 * Incluye limpieza previa de formato de Microsoft Office
 */
export const sanitizeHtml = (html: string): string => {
  // Paso 1: Limpiar formato de Microsoft Office
  const preCleaned = cleanMicrosoftFormat(html);
  
  // Paso 2: Configurar DOMPurify con whitelist de etiquetas y atributos permitidos
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 
      'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'a', 'span', 'div'
    ],
    ALLOWED_ATTR: [
      'style', // Para colores y alineación
      'class', // Para clases CSS (solo ql-* de Quill)
      'href', 'target', 'rel' // Para enlaces (si se usan)
    ],
    ALLOWED_STYLES: {
      '*': {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'font-weight': [/^bold$/, /^normal$/, /^\d+$/],
        'font-style': [/^italic$/, /^normal$/],
        'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
        'font-size': [/^\d+px$/, /^\d+pt$/, /^\d+em$/, /^\d+rem$/, /^(xx-small|x-small|small|medium|large|x-large|xx-large)$/],
        'line-height': [/^\d+(\.\d+)?$/, /^\d+px$/, /^\d+em$/, /^\d+%$/],
        'margin': [/^\d+px$/, /^\d+em$/, /^auto$/],
        'margin-top': [/^\d+px$/, /^\d+em$/],
        'margin-bottom': [/^\d+px$/, /^\d+em$/],
        'padding': [/^\d+px$/, /^\d+em$/],
        'white-space': [/^pre$/, /^pre-wrap$/, /^normal$/]
      }
    }
  };

  return DOMPurify.sanitize(preCleaned, config);
};

/**
 * Extrae solo el texto plano de HTML (para búsquedas, etc.)
 */
export const extractPlainText = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHtml(html);
  return temp.textContent || temp.innerText || '';
};
