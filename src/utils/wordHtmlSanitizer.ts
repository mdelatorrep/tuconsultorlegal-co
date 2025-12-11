/**
 * Utilidades para limpiar HTML copiado desde Microsoft Word/Office
 * Elimina formato propietario de Microsoft y preserva solo formato compatible con ReactQuill
 */

/**
 * Elimina comentarios condicionales de IE/Office
 */
const removeConditionalComments = (html: string): string => {
  // Eliminar comentarios condicionales de IE: <!--[if ...]>...<![endif]-->
  return html.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Eliminar todos los comentarios HTML
};

/**
 * Elimina tags XML de Microsoft Office (<o:p>, <v:shape>, <w:>, etc.)
 */
const removeOfficeTags = (html: string): string => {
  // Eliminar tags con namespace de Office
  return html
    .replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '')
    .replace(/<o:[^>]*\/>/gi, '')
    .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '')
    .replace(/<v:[^>]*\/>/gi, '')
    .replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '')
    .replace(/<w:[^>]*\/>/gi, '')
    .replace(/<m:[^>]*>[\s\S]*?<\/m:[^>]*>/gi, '')
    .replace(/<m:[^>]*\/>/gi, '')
    .replace(/<x:[^>]*>[\s\S]*?<\/x:[^>]*>/gi, '')
    .replace(/<x:[^>]*\/>/gi, '')
    .replace(/<st1:[^>]*>[\s\S]*?<\/st1:[^>]*>/gi, '')
    .replace(/<st1:[^>]*\/>/gi, '');
};

/**
 * Elimina clases que comienzan con Mso (Microsoft Office)
 */
const removeMsoClasses = (html: string): string => {
  // Eliminar clases Mso* de los atributos class
  return html.replace(/class="[^"]*"/gi, (match) => {
    const cleanedClass = match.replace(/Mso[a-zA-Z0-9_-]*/gi, '').replace(/\s+/g, ' ').trim();
    if (cleanedClass === 'class=""' || cleanedClass === 'class=" "') {
      return '';
    }
    return cleanedClass;
  });
};

/**
 * Elimina estilos que comienzan con mso- (Microsoft Office)
 */
const removeMsoStyles = (html: string): string => {
  return html.replace(/style="[^"]*"/gi, (match) => {
    // Extraer el contenido del style
    const styleContent = match.slice(7, -1); // Quitar 'style="' y '"'
    
    // Dividir en propiedades individuales
    const properties = styleContent.split(';').filter(prop => {
      const trimmed = prop.trim().toLowerCase();
      // Filtrar propiedades de Microsoft Office
      if (trimmed.startsWith('mso-')) return false;
      if (trimmed.includes('tab-stops')) return false;
      if (trimmed.includes('layout-grid')) return false;
      if (trimmed.includes('punctuation-wrap')) return false;
      if (trimmed.includes('text-autospace')) return false;
      if (trimmed.includes('word-break') && trimmed.includes('break-word')) return false;
      // Preservar propiedades válidas de formato
      return trimmed.length > 0;
    });
    
    if (properties.length === 0) {
      return '';
    }
    
    return `style="${properties.join(';')}"`;
  });
};

/**
 * Elimina atributos innecesarios de Office
 */
const removeOfficeAttributes = (html: string): string => {
  return html
    .replace(/\s+lang="[^"]*"/gi, '')
    .replace(/\s+xml:lang="[^"]*"/gi, '')
    .replace(/\s+xmlns:[^=]*="[^"]*"/gi, '')
    .replace(/\s+data-[^=]*="[^"]*"/gi, '')
    .replace(/\s+align="[^"]*"/gi, '') // Preferir clases de alineación de Quill
    .replace(/\s+valign="[^"]*"/gi, '')
    .replace(/\s+border="[^"]*"/gi, '')
    .replace(/\s+cellpadding="[^"]*"/gi, '')
    .replace(/\s+cellspacing="[^"]*"/gi, '')
    .replace(/\s+width="[^"]*"/gi, '')
    .replace(/\s+height="[^"]*"/gi, '');
};

/**
 * Limpia spans vacíos y estructuras anidadas innecesarias
 */
const cleanEmptyElements = (html: string): string => {
  let result = html;
  let previousResult = '';
  
  // Iterar hasta que no haya más cambios
  while (result !== previousResult) {
    previousResult = result;
    // Eliminar spans vacíos o con solo espacios
    result = result.replace(/<span[^>]*>\s*<\/span>/gi, '');
    // Eliminar spans sin atributos útiles
    result = result.replace(/<span>\s*([\s\S]*?)\s*<\/span>/gi, '$1');
    // Eliminar divs vacíos
    result = result.replace(/<div[^>]*>\s*<\/div>/gi, '');
    // Eliminar p vacíos
    result = result.replace(/<p[^>]*>\s*<\/p>/gi, '');
    // Limpiar espacios múltiples
    result = result.replace(/\s+/g, ' ');
  }
  
  return result;
};

/**
 * Convierte elementos de Word a equivalentes de HTML estándar
 */
const convertWordElements = (html: string): string => {
  return html
    // Convertir <b> a <strong> si no existe
    .replace(/<b([^>]*)>/gi, '<strong$1>')
    .replace(/<\/b>/gi, '</strong>')
    // Convertir <i> a <em> si no existe
    .replace(/<i([^>]*)>/gi, '<em$1>')
    .replace(/<\/i>/gi, '</em>')
    // Limpiar font tags preservando contenido
    .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1');
};

/**
 * Normaliza line breaks y párrafos
 */
const normalizeLineBreaks = (html: string): string => {
  return html
    // Convertir múltiples <br> a uno solo
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
    // Normalizar diferentes formatos de br
    .replace(/<br\s*\/?>/gi, '<br>');
};

/**
 * Función principal: Limpia HTML copiado desde Microsoft Word
 * Preserva formato básico compatible con ReactQuill:
 * - Bold, Italic, Underline, Strike
 * - Headers (h1, h2, h3)
 * - Lists (ordered, unordered)
 * - Alignment
 * - Links
 */
export const cleanWordHtml = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return html || '';
  }
  
  let cleaned = html;
  
  // Paso 1: Eliminar comentarios condicionales de IE/Office
  cleaned = removeConditionalComments(cleaned);
  
  // Paso 2: Eliminar tags XML de Office
  cleaned = removeOfficeTags(cleaned);
  
  // Paso 3: Eliminar clases de Microsoft Office
  cleaned = removeMsoClasses(cleaned);
  
  // Paso 4: Eliminar estilos de Microsoft Office
  cleaned = removeMsoStyles(cleaned);
  
  // Paso 5: Eliminar atributos innecesarios
  cleaned = removeOfficeAttributes(cleaned);
  
  // Paso 6: Convertir elementos de Word a HTML estándar
  cleaned = convertWordElements(cleaned);
  
  // Paso 7: Normalizar line breaks
  cleaned = normalizeLineBreaks(cleaned);
  
  // Paso 8: Limpiar elementos vacíos
  cleaned = cleanEmptyElements(cleaned);
  
  // Limpieza final de espacios
  cleaned = cleaned.trim();
  
  return cleaned;
};

/**
 * Detecta si el HTML contiene formato de Microsoft Office
 */
export const isWordHtml = (html: string): boolean => {
  if (!html) return false;
  
  const wordIndicators = [
    'class="Mso',
    'style="mso-',
    '<o:p>',
    '<w:',
    'xmlns:w=',
    'xmlns:o=',
    'urn:schemas-microsoft-com:office',
    'MsoNormal',
    'MsoListParagraph',
  ];
  
  return wordIndicators.some(indicator => html.includes(indicator));
};

/**
 * Extrae texto plano del HTML (útil para fallback)
 */
export const extractPlainTextFromWordHtml = (html: string): string => {
  if (!html) return '';
  
  // Crear un elemento temporal para extraer texto
  const temp = document.createElement('div');
  temp.innerHTML = cleanWordHtml(html);
  
  return temp.textContent || temp.innerText || '';
};
