import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, User, Calendar, DollarSign, Clock, MessageSquare } from "lucide-react";

interface Document {
  id: string;
  token: string;
  document_type: string;
  status: string;
  price: number;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
  user_observations?: string | null;
  sla_status?: string;
  sla_deadline?: string;
}

interface PendingDocumentsListProps {
  documents: Document[];
  selectedDocumentId?: string;
  onDocumentClick: (doc: Document) => void;
  getStatusVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusText: (status: string) => string;
  getSlaStatusVariant: (status?: string) => "default" | "secondary" | "destructive" | "outline";
  getSlaStatusText: (status?: string) => string;
}

export function PendingDocumentsList({
  documents,
  selectedDocumentId,
  onDocumentClick,
  getStatusVariant,
  getStatusText,
  getSlaStatusVariant,
  getSlaStatusText,
}: PendingDocumentsListProps) {
  // Filter out urgent documents (shown separately)
  const pendingDocs = documents.filter(
    (doc) => doc.sla_status !== "overdue" && doc.sla_status !== "at_risk"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Documentos Pendientes
        </h2>
        {documents.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            {documents.length} {documents.length === 1 ? "documento" : "documentos"}
          </Badge>
        )}
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 md:p-12 text-center">
            <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-500 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium mb-2 text-green-700 dark:text-green-400">
              ¡Todo al día!
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">
              No hay documentos pendientes de revisión
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingDocs.map((doc) => (
            <Card
              key={doc.id}
              className={`hover:border-primary/50 cursor-pointer transition-all duration-200 ${
                selectedDocumentId === doc.id
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => onDocumentClick(doc)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    {doc.document_type}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusVariant(doc.status)}>
                      {getStatusText(doc.status)}
                    </Badge>
                    {doc.sla_status && (
                      <Badge variant={getSlaStatusVariant(doc.sla_status)}>
                        {getSlaStatusText(doc.sla_status)}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {doc.user_name || "Usuario anónimo"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />$
                      {doc.price.toLocaleString()}
                    </span>
                    {doc.sla_deadline && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.sla_deadline).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>

              {/* User observations preview */}
              {doc.user_observations && (
                <CardContent className="pt-0 pb-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary mb-1">
                          Observaciones del cliente:
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.user_observations}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
