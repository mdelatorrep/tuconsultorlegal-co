import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { FileText, Calendar, DollarSign, User, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface DocumentToken {
  id: string;
  token: string;
  document_type: string;
  document_content: string;
  user_name: string;
  user_email: string;
  price: number;
  status: 'solicitado' | 'en_revision_abogado' | 'revision_usuario' | 'pagado' | 'descargado';
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  lawyer_comments?: string;
  lawyer_comments_date?: string;
  user_observations?: string;
  user_observation_date?: string;
  reviewed_by_lawyer_name?: string;
}

interface DocumentDetailsDialogProps {
  document: DocumentToken | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentDetailsDialog: React.FC<DocumentDetailsDialogProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!document) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'solicitado': 'Solicitado',
      'en_revision_abogado': 'En Revisión por Abogado',
      'revision_usuario': 'Listo para Revisar',
      'pagado': 'Pagado',
      'descargado': 'Completado'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detalles del Documento
          </DialogTitle>
          <DialogDescription>
            Información completa de tu solicitud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">INFORMACIÓN BÁSICA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{document.document_type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Creado:</span>
                  <span className="font-medium">{formatDate(document.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="font-medium">{formatPrice(document.price)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge>{getStatusLabel(document.status)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Token:</span>
                  <span className="font-mono text-xs font-medium">{document.token}</span>
                </div>
                {document.sla_deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha límite:</span>
                    <span className="font-medium">{formatDate(document.sla_deadline)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Información enviada */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">TU INFORMACIÓN</h3>
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              {document.document_content ? (
                (() => {
                  try {
                    // Try to parse as JSON first
                    const parsed = JSON.parse(document.document_content);
                    return (
                      <div className="space-y-3">
                        {Object.entries(parsed).map(([key, value]) => (
                          <div key={key} className="border-b border-border/50 pb-2 last:border-0">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm font-semibold">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    // If not JSON, show as formatted text
                    return (
                      <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
                        {document.document_content}
                      </pre>
                    );
                  }
                })()
              ) : (
                <p className="text-sm text-muted-foreground">Sin información detallada</p>
              )}
            </div>
          </div>

          {/* Comentarios del abogado */}
          {document.lawyer_comments && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">COMENTARIOS DEL ABOGADO</h3>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {document.reviewed_by_lawyer_name && (
                      <span className="text-sm font-medium">{document.reviewed_by_lawyer_name}</span>
                    )}
                    {document.lawyer_comments_date && (
                      <span className="text-xs text-muted-foreground">
                        • {formatDate(document.lawyer_comments_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{document.lawyer_comments}</p>
                </div>
              </div>
            </>
          )}

          {/* Observaciones del usuario */}
          {document.user_observations && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">MIS OBSERVACIONES</h3>
                <div className="bg-secondary/5 p-4 rounded-lg border border-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    {document.user_observation_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(document.user_observation_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{document.user_observations}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
