import { useState } from 'react';
import { 
  Coins, TrendingUp, TrendingDown, History, 
  ShoppingCart, Gift, Users, Award, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditBalanceIndicator } from './CreditBalanceIndicator';
import { CreditPackageSelector } from './CreditPackageSelector';
import { ReferralSection } from './ReferralSection';
import { GamificationPanel } from './GamificationPanel';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';
import { useGamification } from '@/hooks/useGamification';
import { useToast } from '@/hooks/use-toast';

interface CreditsDashboardProps {
  lawyerId: string;
}

export function CreditsDashboard({ lawyerId }: CreditsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();
  
  const { 
    balance, 
    packages, 
    toolCosts, 
    transactions, 
    loading: creditsLoading,
    refreshBalance
  } = useCredits(lawyerId);
  
  const { 
    tasks, 
    progress, 
    referralInfo, 
    referrals,
    loading: gamificationLoading,
    checkAndClaimTask,
    processReferral
  } = useGamification(lawyerId);

  const handlePurchasePackage = async (packageId: string) => {
    setPurchasing(true);
    
    try {
      // For now, show a message - integrate with payment gateway later
      toast({
        title: 'Próximamente',
        description: 'La compra de créditos estará disponible pronto. Por ahora, completa misiones para ganar créditos gratis.',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'usage': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'bonus': return <Gift className="h-4 w-4 text-purple-600" />;
      case 'referral': return <Users className="h-4 w-4 text-blue-600" />;
      case 'gamification': return <Award className="h-4 w-4 text-amber-600" />;
      case 'admin_grant': return <Settings className="h-4 w-4 text-slate-600" />;
      case 'welcome': return <Gift className="h-4 w-4 text-green-600" />;
      default: return <Coins className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loading = creditsLoading || gamificationLoading;

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Balance Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Coins className="h-8 w-8 text-amber-600" />
              <span className="text-3xl font-bold text-amber-800 dark:text-amber-300">
                {balance?.current_balance ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ganados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold">
                {balance?.total_earned ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-500" />
              <span className="text-2xl font-bold">
                {balance?.total_spent ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Misiones Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-purple-600" />
              <span className="text-2xl font-bold">
                {progress.filter(p => p.status === 'claimed').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Coins className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="buy">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Comprar
          </TabsTrigger>
          <TabsTrigger value="missions">
            <Award className="h-4 w-4 mr-2" />
            Misiones
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Users className="h-4 w-4 mr-2" />
            Referidos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tool Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Costo por Herramienta</CardTitle>
                <CardDescription>
                  Créditos necesarios para cada herramienta de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {toolCosts.map((tool) => (
                    <div 
                      key={tool.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{tool.tool_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {tool.credit_cost} créditos
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
                <CardDescription>
                  Últimos movimientos de créditos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {transactions.slice(0, 10).map((tx) => (
                      <div 
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.transaction_type)}
                          <div>
                            <p className="text-sm font-medium">
                              {tx.description || tx.transaction_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No hay transacciones aún
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="buy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Comprar Créditos</CardTitle>
              <CardDescription>
                Selecciona un paquete de créditos para potenciar tus herramientas de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreditPackageSelector 
                packages={packages}
                onSelect={handlePurchasePackage}
                loading={purchasing}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missions" className="mt-6">
          <GamificationPanel 
            tasks={tasks}
            progress={progress}
            onClaimTask={checkAndClaimTask}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <ReferralSection 
            referralInfo={referralInfo}
            referrals={referrals}
            onApplyCode={processReferral}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial Completo</CardTitle>
              <CardDescription>
                Todas tus transacciones de créditos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.transaction_type)}
                        <div>
                          <p className="font-medium">
                            {tx.description || tx.transaction_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Balance: {tx.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay transacciones aún
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
