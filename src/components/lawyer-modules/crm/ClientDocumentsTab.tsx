import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Eye, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewer from '@/components/client-portal/DocumentViewer';

interface DocItem {
  id: string;
  name: string;
  type: string;
  source: 'crm' | 'portal';
  is_from_client: boolean;
  created_at: string;
  viewed_at: string | null;
  file_url: string | null;
}

interface ClientDocumentsTabProps {
  clientId: string;
  lawyerId: string;
  clientName: string;
}

const ClientDocumentsTab: React.FC<ClientDocumentsTabProps> = ({ clientId, lawyerId, clientName }) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    fetchDocs();
  }, [clientId, lawyerId]);

  const fetchDocs = async () => {
    setLoading(true);
    const [crmResult, portalResult] = await Promise.all([
      supabase
        .from('crm_documents')
        .select('id, name, document_type, created_at, file_url')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_shared_documents')
        .select('id, document_name, document_type, created_at, document_url, is_from_client, viewed_at')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false }),
    ]);

    const crmDocs: DocItem[] = (crmResult.data || []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.document_type,
      source: 'crm',
      is_from_client: false,
      created_at: d.created_at,
      viewed_at: null,
      file_url: d.file_url,
    }));

    const portalDocs: DocItem[] = (portalResult.data || []).map(d => ({
      id: d.id,
      name: d.document_name,
      type: d.document_type || 'otro',
      source: 'portal',
      is_from_client: d.is_from_client || false,
      created_at: d.created_at,
      viewed_at: d.viewed_at,
      file_url: d.document_url,
    }));

    const all = [...crmDocs, ...portalDocs].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setDocs(all);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No hay documentos para este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{docs.length} documento(s)</p>
      {docs.map(doc => (
        <div key={`${doc.source}-${doc.id}`} className="p-3 rounded-lg border bg-card flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
            {doc.is_from_client ? <Upload className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
              </span>
              <Badge variant={doc.source === 'portal' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                {doc.source === 'portal' ? (doc.is_from_client ? 'Portal ↑' : 'Compartido') : 'CRM'}
              </Badge>
              {doc.viewed_at && (
                <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> Visto
                </span>
              )}
            </div>
          </div>
          {doc.file_url && (
            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setViewerDoc({ name: doc.name, url: doc.file_url! })}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {viewerDoc && (
        <DocumentViewer
          documentName={viewerDoc.name}
          documentUrl={viewerDoc.url}
          isOpen={!!viewerDoc}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  );
};

export default ClientDocumentsTab;
