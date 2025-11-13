import DOMPurify from 'dompurify';

/**
 * Sanitiza contenido HTML para prevenir XSS
 * Permite solo etiquetas y atributos seguros comúnmente usados en editores de texto
 */
export const sanitizeHtml = (html: string): string => {
  // Configurar DOMPurify con whitelist de etiquetas y atributos permitidos
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
      'class', // Para clases CSS
      'href', 'target', 'rel' // Para enlaces (si se usan)
    ],
    ALLOWED_STYLES: {
      '*': {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'font-weight': [/^bold$/, /^normal$/, /^\d+$/],
        'font-style': [/^italic$/, /^normal$/],
        'text-decoration': [/^underline$/, /^line-through$/, /^none$/]
      }
    }
  };

  return DOMPurify.sanitize(html, config);
};

/**
 * Extrae solo el texto plano de HTML (para búsquedas, etc.)
 */
export const extractPlainText = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHtml(html);
  return temp.textContent || temp.innerText || '';
};
