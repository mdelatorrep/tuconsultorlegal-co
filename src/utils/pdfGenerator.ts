import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CaseData {
  id: string;
  title: string;
  case_number?: string;
  description?: string;
  case_type: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  billing_rate?: number;
  estimated_hours?: number;
  actual_hours: number;
  created_at: string;
  client?: {
    name: string;
    email: string;
    phone?: string;
  };
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  activity_date: string;
  created_at: string;
}

export const generateCasePDF = (caseData: CaseData, activities: Activity[] = []) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CASO', margin, yPosition);
  yPosition += 15;

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, 190, yPosition);
  yPosition += 10;

  // Case Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL CASO', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const caseInfo = [
    ['Título:', caseData.title],
    ['Número de Caso:', caseData.case_number || 'N/A'],
    ['Tipo:', caseData.case_type],
    ['Estado:', caseData.status],
    ['Prioridad:', caseData.priority],
    ['Fecha de Inicio:', caseData.start_date ? format(new Date(caseData.start_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'],
    ['Fecha de Fin:', caseData.end_date ? format(new Date(caseData.end_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'],
    ['Tarifa por Hora:', caseData.billing_rate ? `$${caseData.billing_rate.toLocaleString()}` : 'N/A'],
    ['Horas Estimadas:', caseData.estimated_hours?.toString() || 'N/A'],
    ['Horas Trabajadas:', caseData.actual_hours.toString()],
    ['Creado:', format(new Date(caseData.created_at), 'dd/MM/yyyy HH:mm', { locale: es })]
  ];

  caseInfo.forEach(([label, value]) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, yPosition);
    yPosition += lineHeight;
  });

  yPosition += 5;

  // Client Information
  if (caseData.client) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const clientInfo = [
      ['Nombre:', caseData.client.name],
      ['Email:', caseData.client.email],
      ['Teléfono:', caseData.client.phone || 'N/A']
    ];

    clientInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 40, yPosition);
      yPosition += lineHeight;
    });

    yPosition += 5;
  }

  // Description
  if (caseData.description) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Split description into lines
    const descriptionLines = doc.splitTextToSize(caseData.description, 170);
    descriptionLines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    yPosition += 5;
  }

  // Activities/Traceability
  if (activities.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TRAZABILIDAD DE ACTIVIDADES', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    activities.forEach((activity, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      // Activity header
      doc.setFont('helvetica', 'bold');
      const activityDate = format(new Date(activity.activity_date), 'dd/MM/yyyy HH:mm', { locale: es });
      doc.text(`${index + 1}. ${activityDate} - ${activity.activity_type.toUpperCase()}`, margin, yPosition);
      yPosition += lineHeight;

      // Activity title
      doc.setFont('helvetica', 'bold');
      doc.text(activity.title, margin + 5, yPosition);
      yPosition += lineHeight;

      // Activity description
      if (activity.description) {
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(activity.description, 165);
        descLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight;
        });
      }

      yPosition += 3;
    });
  } else {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TRAZABILIDAD DE ACTIVIDADES', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay actividades registradas para este caso.', margin, yPosition);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Reporte generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })} - Página ${i} de ${totalPages}`,
      margin,
      pageHeight - 10
    );
  }

  // Save the PDF
  const fileName = `caso_${caseData.case_number || caseData.id}_reporte.pdf`;
  doc.save(fileName);

  return fileName;
};