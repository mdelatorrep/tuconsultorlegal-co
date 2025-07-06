import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle } from "lucide-react";

interface TrackingCodeVerificationProps {
  trackingCode: string;
  setTrackingCode: (code: string) => void;
  trackingCodeError: string;
  isVerifying: boolean;
  onVerifyCode: (code?: string) => void;
}

export default function TrackingCodeVerification({
  trackingCode,
  setTrackingCode,
  trackingCodeError,
  isVerifying,
  onVerifyCode
}: TrackingCodeVerificationProps) {
  return (
    <Card className="shadow-card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Verificación de Código de Seguimiento
        </CardTitle>
        <CardDescription>
          Ingresa el código de seguimiento que recibiste por correo electrónico para acceder a tu documento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trackingCode">Código de Seguimiento</Label>
          <Input
            id="trackingCode"
            type="text"
            placeholder="Ej: ABC123DEF456"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            className={trackingCodeError ? "border-destructive" : ""}
          />
          {trackingCodeError && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {trackingCodeError}
            </p>
          )}
        </div>
        <Button
          onClick={() => onVerifyCode()}
          disabled={isVerifying || !trackingCode.trim()}
          className="w-full"
          size="lg"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              Verificando Código...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Verificar Código
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}