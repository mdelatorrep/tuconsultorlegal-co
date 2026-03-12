import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
  documentType?: string | null;
}

export function DocumentViewer({ open, onOpenChange, documentUrl, documentName, documentType }: DocumentViewerProps) {
  const type = (documentType || '').toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(type);
  const isPdf = type === 'PDF';
  const isEmbeddable = isImage || isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="truncate flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              {documentName}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = documentUrl;
                  a.download = documentName;
                  a.target = '_blank';
                  a.click();
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(documentUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Abrir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg overflow-auto">
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-full rounded-lg border"
              title={documentName}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Vista previa no disponible para archivos {type || 'de este tipo'}.
              </p>
              <Button onClick={() => window.open(documentUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en nueva pestaña
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
