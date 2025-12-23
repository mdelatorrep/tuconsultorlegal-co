import { useState } from 'react';
import { Check, Star, Zap, Building, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreditPackage } from '@/hooks/useCredits';
import { useCreditPayment } from '@/hooks/useCreditPayment';
import { useToast } from '@/hooks/use-toast';

interface CreditPackageSelectorProps {
  packages: CreditPackage[];
  lawyerId: string;
  onPurchaseComplete?: () => void;
}

const packageIcons: Record<string, React.ReactNode> = {
  'Starter': <Zap className="h-6 w-6" />,
  'Profesional': <Star className="h-6 w-6" />,
  'Experto': <Check className="h-6 w-6" />,
  'Firma Legal': <Building className="h-6 w-6" />
};

export function CreditPackageSelector({ packages, lawyerId, onPurchaseComplete }: CreditPackageSelectorProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const { initiateCreditPurchase, loading } = useCreditPayment();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setSelectedPackage(pkg.id);
    setProcessingPackage(pkg.id);
    
    try {
      const result = await initiateCreditPurchase({
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits + pkg.bonus_credits,
        priceCop: pkg.price_cop,
        lawyerId
      });

      if (result.success) {
        toast({
          title: '¡Compra iniciada!',
          description: 'Serás redirigido a la pasarela de pago.',
        });
        onPurchaseComplete?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo procesar la compra',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al procesar la compra',
        variant: 'destructive'
      });
    } finally {
      setProcessingPackage(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {packages.map((pkg) => (
        <Card 
          key={pkg.id}
          className={cn(
            "relative cursor-pointer transition-all hover:shadow-lg",
            pkg.is_featured && "border-primary ring-2 ring-primary/20",
            selectedPackage === pkg.id && "border-primary bg-primary/5"
          )}
          onClick={() => setSelectedPackage(pkg.id)}
        >
          {pkg.is_featured && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
              Más Popular
            </Badge>
          )}
          
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 text-primary w-fit">
              {packageIcons[pkg.name] || <Zap className="h-6 w-6" />}
            </div>
            <CardTitle className="text-lg">{pkg.name}</CardTitle>
            <CardDescription className="text-xs">
              {pkg.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <div>
              <div className="text-3xl font-bold text-primary">
                {pkg.credits + pkg.bonus_credits}
              </div>
              <div className="text-sm text-muted-foreground">créditos</div>
              {pkg.bonus_credits > 0 && (
                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  +{pkg.bonus_credits} bonus
                </Badge>
              )}
            </div>
            
            <div>
              <div className="text-2xl font-semibold">
                {formatPrice(pkg.price_cop)}
              </div>
              {pkg.discount_percentage && pkg.discount_percentage > 0 && (
                <Badge variant="outline" className="mt-1">
                  {pkg.discount_percentage}% descuento
                </Badge>
              )}
            </div>
            
            <Button 
              className="w-full" 
              variant={pkg.is_featured ? "default" : "outline"}
              disabled={loading || processingPackage !== null}
              onClick={(e) => {
                e.stopPropagation();
                handlePurchase(pkg);
              }}
            >
              {processingPackage === pkg.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Comprar'
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}