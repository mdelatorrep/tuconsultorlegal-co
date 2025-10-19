import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Shield,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  Award,
  Calendar,
  User,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import CertificationBadge from "./CertificationBadge";

interface Certificate {
  id: string;
  certificate_name: string;
  certificate_code: string;
  issued_date: string;
  verification_url: string;
  linkedin_share_url: string;
  is_active: boolean;
  lawyer_info: {
    full_name: string;
    email: string;
  };
}

export default function CertificationVerificationPage() {
  const { certificateCode } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [searchCode, setSearchCode] = useState(certificateCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certificateCode) {
      verifyCertificate(certificateCode);
    }
  }, [certificateCode]);

  const verifyCertificate = async (code: string) => {
    if (!code.trim()) {
      setError("Por favor ingresa un código de certificación");
      return;
    }

    setLoading(true);
    setError(null);
    setCertificate(null);

    try {
      const { data: certData, error: queryError } = await supabase
        .from("lawyer_certificates")
        .select("*")
        .eq("certificate_code", code.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (queryError) {
        if (queryError.code === "PGRST116") {
          setError("Certificación no encontrada. Verifica que el código sea correcto.");
        } else {
          throw queryError;
        }
        return;
      }

      // Get lawyer info separately
      const { data: lawyerData, error: lawyerError } = await supabase
        .from("lawyer_profiles")
        .select("full_name, email")
        .eq("id", certData.lawyer_id)
        .single();

      if (lawyerError) {
        console.warn("Could not fetch lawyer info:", lawyerError);
      }

      const certificate = {
        ...certData,
        lawyer_info: lawyerData || { full_name: "Información no disponible", email: "" },
      };

      setCertificate(certificate);
      toast.success("Certificación verificada exitosamente");
    } catch (error) {
      console.error("Error verifying certificate:", error);
      setError("Error al verificar la certificación. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchCode.trim()) {
      navigate(`/certificacion/${searchCode.trim()}`);
      verifyCertificate(searchCode.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="absolute left-4 top-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
            <Shield className="w-16 h-16 text-primary mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">Verificación de Certificaciones</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verifica la autenticidad de las certificaciones emitidas por tuconsultorlegal.co
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-md mx-auto mb-8">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Certificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="certificate-code">Código de Certificación</Label>
              <Input
                id="certificate-code"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Ej: IALC-2024-A1B2C3D4"
                className="text-center font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                El código de certificación se encuentra en el badge del certificado
              </p>
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchCode.trim()} className="w-full">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Verificar Certificación
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="max-w-2xl mx-auto">
          {error && (
            <Card className="border-destructive bg-destructive/5 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">Certificación No Válida</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {certificate && (
            <div className="space-y-6">
              {/* Verification Success */}
              <Card className="border-success bg-success/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                    <div>
                      <h3 className="font-semibold text-success mb-1">Certificación Verificada</h3>
                      <p className="text-sm text-muted-foreground">Esta certificación es auténtica y válida</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Certificado para:</span>
                      <span>{certificate.lawyer_info?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Fecha de emisión:</span>
                      <span>{new Date(certificate.issued_date).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Código:</span>
                      <code className="bg-muted px-1 rounded">{certificate.certificate_code}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Estado:</span>
                      <span className="text-success">Activa</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certificate Badge */}
              <div className="flex justify-center">
                <CertificationBadge
                  certificate={{
                    ...certificate,
                    lawyer_name: certificate.lawyer_info?.full_name,
                  }}
                  showShareOptions={false}
                />
              </div>

              {/* Additional Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sobre esta Certificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">IA Lawyer Fundamentals</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Esta certificación valida que el abogado ha completado exitosamente el programa de formación en
                      Inteligencia Artificial Legal de tuconsultorlegal.co, que incluye 10 módulos especializados en
                      herramientas de IA, automatización de documentos, análisis predictivo y ética en IA legal.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Criterios de Certificación</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Completación del 100% de los módulos de formación</li>
                      <li>• Aprobación de evaluaciones prácticas</li>
                      <li>• Demostración de competencias en IA legal</li>
                      <li>• Cumplimiento de estándares éticos establecidos</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Nota de Verificación:</p>
                        <p>
                          Esta verificación confirma la autenticidad del certificado al momento de la consulta. Para
                          consultas sobre la validez o el programa de certificación, contacta a{" "}
                          <a href="mailto:contacto@tuconsultorlegal.co" className="text-primary hover:underline">
                            contacto@tuconsultorlegal.co
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Help Section */}
          {!certificate && !error && !loading && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-center">¿Cómo verificar una certificación?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Search className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1">1. Obtén el código</h4>
                    <p className="text-sm text-muted-foreground">
                      El código aparece en el badge de certificación (formato: IALC-YYYY-XXXXXXXX)
                    </p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1">2. Ingresa el código</h4>
                    <p className="text-sm text-muted-foreground">
                      Escribe o pega el código completo en el campo de búsqueda
                    </p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1">3. Verifica</h4>
                    <p className="text-sm text-muted-foreground">
                      Obtén la confirmación de autenticidad y detalles del certificado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
