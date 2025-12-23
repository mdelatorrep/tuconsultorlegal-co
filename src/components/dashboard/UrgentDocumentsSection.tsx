import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Calendar, Clock } from "lucide-react";

interface Document {
  id: string;
  token: string;
  document_type: string;
  status: string;
  user_name: string | null;
  created_at: string;
  sla_status?: string;
  sla_deadline?: string;
}

interface UrgentDocumentsSectionProps {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
  getStatusVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusText: (status: string) => string;
  getSlaStatusVariant: (status?: string) => "default" | "secondary" | "destructive" | "outline";
  getSlaStatusText: (status?: string) => string;
}

export function UrgentDocumentsSection({
  documents,
  onDocumentClick,
  getStatusVariant,
  getStatusText,
  getSlaStatusVariant,
  getSlaStatusText,
}: UrgentDocumentsSectionProps) {
  const urgentDocs = documents.filter(
    (doc) => doc.sla_status === "overdue" || doc.sla_status === "at_risk"
  );

  if (urgentDocs.length === 0) return null;

  return (
    <Card className="border-2 border-destructive bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 animate-pulse" />
          Documentos Urgentes
          <Badge variant="destructive" className="ml-2">
            {urgentDocs.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-destructive/80">
          Estos documentos requieren tu atención inmediata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {urgentDocs.map((doc) => (
            <Card
              key={doc.id}
              className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                doc.sla_status === "overdue"
                  ? "border-destructive bg-destructive/5"
                  : "border-warning bg-warning/5"
              }`}
              onClick={() => onDocumentClick(doc)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg flex items-center justify-between">
                  <span className="truncate flex items-center gap-2">
                    {doc.sla_status === "overdue" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {doc.document_type}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusVariant(doc.status)}>
                      {getStatusText(doc.status)}
                    </Badge>
                    <Badge variant={getSlaStatusVariant(doc.sla_status)}>
                      {getSlaStatusText(doc.sla_status)}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {doc.user_name || "Usuario anónimo"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {doc.sla_deadline && (
                      <span className="flex items-center gap-1 text-destructive font-medium">
                        <Clock className="h-3 w-3" />
                        Límite: {new Date(doc.sla_deadline).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
