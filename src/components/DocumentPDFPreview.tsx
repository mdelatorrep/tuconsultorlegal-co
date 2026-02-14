import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, RefreshCw } from "lucide-react";
import { getPreviewStyles, PREVIEW_COLORS } from "@/components/document-payment/documentPreviewStyles";
import DOMPurify from "dompurify";

interface DocumentPDFPreviewProps {
  templateContent: string;
  documentName?: string;
  placeholders?: Array<{ placeholder: string; pregunta?: string }>;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
}

// Datos dummy realistas para cada tipo de placeholder común
const DUMMY_DATA: Record<string, string> = {
  // Nombres y personas
  "NOMBRE_COMPLETO": "JUAN CARLOS PÉREZ LÓPEZ",
  "NOMBRE": "JUAN CARLOS",
  "APELLIDOS": "PÉREZ LÓPEZ",
  "NOMBRE_EMPLEADO": "MARÍA FERNANDA GARCÍA TORRES",
  "NOMBRE_EMPLEADOR": "CARLOS ALBERTO RODRÍGUEZ SILVA",
  "NOMBRE_EMPRESA": "SOLUCIONES TECNOLÓGICAS S.A.S.",
  "RAZON_SOCIAL": "INVERSIONES ANDINAS LTDA.",
  "REPRESENTANTE_LEGAL": "ANDRÉS FELIPE MARTÍNEZ ROJAS",
  "NOMBRE_ARRENDADOR": "PEDRO ANTONIO SÁNCHEZ MUÑOZ",
  "NOMBRE_ARRENDATARIO": "LAURA PATRICIA GÓMEZ DÍAZ",
  "NOMBRE_ACREEDOR": "BANCO COMERCIAL DE COLOMBIA",
  "NOMBRE_DEUDOR": "RICARDO ALBERTO CASTRO VEGA",
  "CEDENTE": "EMPRESA CEDENTE S.A.",
  "CESIONARIO": "NUEVA EMPRESA S.A.S.",
  
  // Documentos de identidad
  "CEDULA": "1.234.567.890",
  "NUMERO_CEDULA": "1.234.567.890",
  "CC": "1.234.567.890",
  "NIT": "900.123.456-7",
  "NUMERO_NIT": "900.123.456-7",
  "DOCUMENTO_IDENTIDAD": "1.234.567.890",
  
  // Ubicación
  "CIUDAD": "BOGOTÁ, CUNDINAMARCA",
  "DEPARTAMENTO": "CUNDINAMARCA",
  "DIRECCION": "Calle 100 No. 15-45, Oficina 502",
  "DIRECCION_INMUEBLE": "Carrera 7 No. 32-18, Apartamento 301",
  "BARRIO": "CHAPINERO",
  "PAIS": "COLOMBIA",
  
  // Fechas
  "FECHA": "15 de diciembre de 2025",
  "FECHA_ACTUAL": "13 de diciembre de 2025",
  "FECHA_INICIO": "1 de enero de 2026",
  "FECHA_FIN": "31 de diciembre de 2026",
  "FECHA_CONTRATO": "15 de diciembre de 2025",
  "FECHA_VENCIMIENTO": "15 de diciembre de 2026",
  "FECHA_RENUNCIA": "31 de diciembre de 2025",
  "FECHA_NACIMIENTO": "15 de marzo de 1985",
  
  // Montos y valores
  "MONTO": "$5.000.000",
  "VALOR": "$5.000.000",
  "SALARIO": "$4.500.000",
  "CANON": "$2.500.000",
  "PRECIO": "$150.000.000",
  "VALOR_TOTAL": "$180.000.000",
  "VALOR_ARRIENDO": "$2.500.000",
  
  // Trabajo
  "CARGO": "GERENTE DE PROYECTOS",
  "PUESTO": "DIRECTOR COMERCIAL",
  "AREA": "DEPARTAMENTO DE VENTAS",
  "FUNCIONES": "Liderar el equipo de ventas, desarrollar estrategias comerciales y gestionar clientes clave",
  "HORARIO": "Lunes a viernes de 8:00 a.m. a 5:00 p.m.",
  "JORNADA": "Tiempo completo",
  
  // Contacto
  "TELEFONO": "+57 300 123 4567",
  "EMAIL": "contacto@ejemplo.com",
  "CORREO": "juan.perez@email.com",
  
  // Otros
  "OBJETO": "Prestación de servicios profesionales de consultoría empresarial",
  "DESCRIPCION": "Servicios de asesoría legal y representación jurídica",
  "CLAUSULA": "El presente contrato se regirá por las leyes de la República de Colombia",
  "MOTIVO": "Crecimiento profesional y nuevas oportunidades laborales",
  "OBSERVACIONES": "Sin observaciones adicionales",
  "TESTIGO_1": "ANA MARÍA TORRES RUIZ",
  "TESTIGO_2": "CARLOS ANDRÉS MENDOZA PAZ",
  "PLAZO": "12 meses",
  "DURACION": "Un (1) año",
};

/**
 * Reemplaza los placeholders en el contenido con datos dummy
 */
function replacePlaceholdersWithDummy(content: string, customPlaceholders?: Array<{ placeholder: string }>): string {
  let result = content;
  
  // Primero, buscar todos los placeholders en el contenido
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1].trim().toUpperCase();
    const fullMatch = match[0];
    
    // Buscar el valor dummy más apropiado
    let dummyValue = DUMMY_DATA[placeholder];
    
    if (!dummyValue) {
      // Intentar buscar coincidencias parciales
      for (const [key, value] of Object.entries(DUMMY_DATA)) {
        if (placeholder.includes(key) || key.includes(placeholder)) {
          dummyValue = value;
          break;
        }
      }
    }
    
    // Si no hay valor dummy, usar un placeholder visual
    if (!dummyValue) {
      dummyValue = `[${placeholder}]`;
    }
    
    result = result.replace(fullMatch, dummyValue);
  }
  
  return result;
}

export default function DocumentPDFPreview({
  templateContent,
  documentName = "Documento Legal",
  placeholders,
  buttonVariant = "outline",
  buttonSize = "default",
  buttonClassName = "",
}: DocumentPDFPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  
  useEffect(() => {
    if (isOpen && templateContent) {
      const contentWithDummy = replacePlaceholdersWithDummy(templateContent, placeholders);
      setPreviewContent(contentWithDummy);
    }
  }, [isOpen, templateContent, placeholders]);

  const refreshPreview = () => {
    const contentWithDummy = replacePlaceholdersWithDummy(templateContent, placeholders);
    setPreviewContent(contentWithDummy);
  };

  const sanitizedContent = DOMPurify.sanitize(previewContent);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          size={buttonSize}
          className={buttonClassName}
          disabled={!templateContent?.trim()}
        >
          <Eye className="h-4 w-4 mr-2" />
          Vista Previa PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa del Documento
            </span>
            <Button variant="ghost" size="sm" onClick={refreshPreview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refrescar
            </Button>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Así se verá el documento PDF con datos de ejemplo. Los placeholders {"{{...}}"} se reemplazan con datos ficticios para simular el resultado final.
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg bg-white mt-4">
          {/* Simulación de página A4 */}
          <div 
            className="mx-auto my-4 bg-white shadow-lg"
            style={{
              width: "210mm",
              minHeight: "297mm",
              maxWidth: "100%",
              padding: "25mm 20mm",
              boxSizing: "border-box",
            }}
          >
            {/* Contenido del documento */}
            <div 
              className="preview-content"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "12pt",
                lineHeight: "1.7",
                color: PREVIEW_COLORS.text,
                textAlign: "justify",
              }}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
            
            {/* Footer simulado */}
            <div 
              className="mt-auto pt-8"
              style={{
                position: "absolute",
                bottom: "15mm",
                left: "20mm",
                right: "20mm",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9pt",
                color: "#666",
                borderTop: "1px solid #eee",
                paddingTop: "8px",
              }}
            >
              <span>TOKEN: ABC123DEF456</span>
              <span>www.praxis-hub.co</span>
              <span>Revisado por: Abogado Certificado</span>
            </div>
          </div>
        </div>

        {/* Estilos para la vista previa */}
        <style>{`
          ${getPreviewStyles()}
          
          .preview-content h1,
          .preview-content h2,
          .preview-content h3 {
            font-family: Helvetica, Arial, sans-serif;
            color: ${PREVIEW_COLORS.primaryDark};
            font-weight: 700;
          }
          
          .preview-content h1 { font-size: 16pt; margin-bottom: 0.5em; }
          .preview-content h2 { font-size: 14pt; margin-bottom: 0.5em; }
          .preview-content h3 { font-size: 13pt; margin-bottom: 0.5em; }
          
          .preview-content p {
            margin-bottom: 1em;
          }
          
          .preview-content strong {
            font-weight: 700;
          }
          
          .preview-content .ql-align-center { text-align: center; }
          .preview-content .ql-align-right { text-align: right; }
          .preview-content .ql-align-justify { text-align: justify; }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
