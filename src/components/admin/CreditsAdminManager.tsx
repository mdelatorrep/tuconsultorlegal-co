import { useState, useEffect } from 'react';
import { 
  Coins, Users, Gift, Settings, Search, Plus, Edit, Trash2, 
  Save, X, TrendingUp, TrendingDown, History, Award, Package, Calculator
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DynamicCostCalculator } from './DynamicCostCalculator';

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  bonus_credits: number;
  price_cop: number;
  discount_percentage: number | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
}

interface CreditToolCost {
  id: string;
  tool_type: string;
  tool_name: string;
  credit_cost: number;
  description: string | null;
  icon: string | null;
  is_active: boolean;
}

interface LawyerWithCredits {
  id: string;
  full_name: string;
  email: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
}

interface CreditTransaction {
  id: string;
  lawyer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
  lawyer?: {
    full_name: string;
    email: string;
  };
}

export function CreditsAdminManager() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [toolCosts, setToolCosts] = useState<CreditToolCost[]>([]);
  const [lawyers, setLawyers] = useState<LawyerWithCredits[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerWithCredits | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);

  const [editPackageDialogOpen, setEditPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);

  const [editToolDialogOpen, setEditToolDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CreditToolCost | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPackages(),
      loadToolCosts(),
      loadLawyersWithCredits(),
      loadTransactions()
    ]);
    setLoading(false);
  };

  const loadPackages = async () => {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .order('display_order');

    if (!error && data) setPackages(data);
  };

  const loadToolCosts = async () => {
    const { data, error } = await supabase
      .from('credit_tool_costs')
      .select('*')
      .order('tool_name');

    if (!error && data) setToolCosts(data);
  };

  const loadLawyersWithCredits = async () => {
    const { data: lawyerData, error: lawyerError } = await supabase
      .from('lawyer_profiles')
      .select('id, full_name, email');

    if (lawyerError) return;

    const { data: creditsData, error: creditsError } = await supabase
      .from('lawyer_credits')
      .select('*');

    if (creditsError) return;

    const merged = lawyerData?.map(lawyer => {
      const credits = creditsData?.find(c => c.lawyer_id === lawyer.id);
      return {
        ...lawyer,
        current_balance: credits?.current_balance || 0,
        total_earned: credits?.total_earned || 0,
        total_spent: credits?.total_spent || 0
      };
    }) || [];

    setLawyers(merged);
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      // Enrich with lawyer info
      const lawyerIds = [...new Set(data.map(t => t.lawyer_id))];
      const { data: lawyerData } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email')
        .in('id', lawyerIds);

      const enriched = data.map(t => ({
        ...t,
        lawyer: lawyerData?.find(l => l.id === t.lawyer_id)
      }));

      setTransactions(enriched);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedLawyer || !grantAmount || parseInt(grantAmount) <= 0) {
      toast({ title: 'Error', description: 'Ingresa una cantidad válida', variant: 'destructive' });
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke('credits-admin-grant', {
        body: {
          lawyerId: selectedLawyer.id,
          amount: parseInt(grantAmount),
          reason: grantReason || 'Créditos otorgados por administrador'
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Créditos otorgados',
        description: `Se han otorgado ${grantAmount} créditos a ${selectedLawyer.full_name}`
      });

      setGrantDialogOpen(false);
      setSelectedLawyer(null);
      setGrantAmount('');
      setGrantReason('');
      await loadLawyersWithCredits();
      await loadTransactions();
    } catch (error) {
      console.error('Error granting credits:', error);
      toast({ title: 'Error', description: 'No se pudieron otorgar los créditos', variant: 'destructive' });
    } finally {
      setGranting(false);
    }
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage) return;

    const { error } = await supabase
      .from('credit_packages')
      .update({
        name: editingPackage.name,
        description: editingPackage.description,
        credits: editingPackage.credits,
        bonus_credits: editingPackage.bonus_credits,
        price_cop: editingPackage.price_cop,
        discount_percentage: editingPackage.discount_percentage,
        is_active: editingPackage.is_active,
        is_featured: editingPackage.is_featured,
        display_order: editingPackage.display_order
      })
      .eq('id', editingPackage.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el paquete', variant: 'destructive' });
      return;
    }

    toast({ title: 'Paquete actualizado' });
    setEditPackageDialogOpen(false);
    await loadPackages();
  };

  const handleUpdateToolCost = async () => {
    if (!editingTool) return;

    const { error } = await supabase
      .from('credit_tool_costs')
      .update({
        tool_name: editingTool.tool_name,
        credit_cost: editingTool.credit_cost,
        description: editingTool.description,
        is_active: editingTool.is_active
      })
      .eq('id', editingTool.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el costo', variant: 'destructive' });
      return;
    }

    toast({ title: 'Costo actualizado' });
    setEditToolDialogOpen(false);
    await loadToolCosts();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLawyers = lawyers.filter(l =>
    l.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalCreditsInCirculation = lawyers.reduce((sum, l) => sum + l.current_balance, 0);
  const totalCreditsEarned = lawyers.reduce((sum, l) => sum + l.total_earned, 0);
  const totalCreditsSpent = lawyers.reduce((sum, l) => sum + l.total_spent, 0);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Créditos en Circulación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-amber-600" />
              <span className="text-2xl font-bold">{totalCreditsInCirculation.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Otorgados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold">{totalCreditsEarned.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Consumidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-500" />
              <span className="text-2xl font-bold">{totalCreditsSpent.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abogados con Créditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold">{lawyers.filter(l => l.current_balance > 0).length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lawyers">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="lawyers">
            <Users className="h-4 w-4 mr-2" />
            Abogados
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="h-4 w-4 mr-2" />
            Paquetes
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Settings className="h-4 w-4 mr-2" />
            Costos
          </TabsTrigger>
          <TabsTrigger value="dynamic">
            <Calculator className="h-4 w-4 mr-2" />
            Cálculo Dinámico
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Lawyers Tab */}
        <TabsContent value="lawyers" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Créditos por Abogado</CardTitle>
                  <CardDescription>Asigna créditos manualmente a los abogados</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar abogado..." 
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abogado</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Ganados</TableHead>
                      <TableHead className="text-right">Usados</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLawyers.map((lawyer) => (
                      <TableRow key={lawyer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lawyer.full_name}</p>
                            <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-amber-100 text-amber-800">
                            {lawyer.current_balance}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          +{lawyer.total_earned}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          -{lawyer.total_spent}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedLawyer(lawyer);
                              setGrantDialogOpen(true);
                            }}
                          >
                            <Gift className="h-4 w-4 mr-1" />
                            Otorgar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Paquetes de Créditos</CardTitle>
              <CardDescription>Configura los paquetes disponibles para compra</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Destacado</TableHead>
                    <TableHead className="text-center">Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">{pkg.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{pkg.credits}</TableCell>
                      <TableCell className="text-right text-green-600">+{pkg.bonus_credits}</TableCell>
                      <TableCell className="text-right">{formatPrice(pkg.price_cop)}</TableCell>
                      <TableCell className="text-center">
                        {pkg.is_featured && <Badge>★</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                          {pkg.is_active ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingPackage(pkg);
                            setEditPackageDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tool Costs Tab */}
        <TabsContent value="tools" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Costos por Herramienta</CardTitle>
              <CardDescription>Configura cuántos créditos cuesta cada herramienta</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Herramienta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-center">Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toolCosts.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tool.tool_name}</p>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{tool.tool_type}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-amber-100 text-amber-800">
                          {tool.credit_cost} créditos
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={tool.is_active ? 'default' : 'secondary'}>
                          {tool.is_active ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingTool(tool);
                            setEditToolDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dynamic Cost Calculator Tab */}
        <TabsContent value="dynamic" className="mt-6">
          <DynamicCostCalculator />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Últimas 100 transacciones de créditos</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Abogado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{tx.lawyer?.full_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{tx.lawyer?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.transaction_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {tx.balance_after}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Credits Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otorgar Créditos</DialogTitle>
            <DialogDescription>
              Asigna créditos a {selectedLawyer?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cantidad de Créditos</Label>
              <Input 
                type="number" 
                placeholder="Ej: 50"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Razón (opcional)</Label>
              <Textarea 
                placeholder="Ej: Bono por referidos, compensación, etc."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrantCredits} disabled={granting}>
              {granting ? 'Otorgando...' : 'Otorgar Créditos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editPackageDialogOpen} onOpenChange={setEditPackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paquete</DialogTitle>
          </DialogHeader>
          {editingPackage && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={editingPackage.name}
                    onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input 
                    type="number"
                    value={editingPackage.display_order}
                    onChange={(e) => setEditingPackage({...editingPackage, display_order: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={editingPackage.description || ''}
                  onChange={(e) => setEditingPackage({...editingPackage, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Créditos</Label>
                  <Input 
                    type="number"
                    value={editingPackage.credits}
                    onChange={(e) => setEditingPackage({...editingPackage, credits: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <Input 
                    type="number"
                    value={editingPackage.bonus_credits}
                    onChange={(e) => setEditingPackage({...editingPackage, bonus_credits: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio (COP)</Label>
                  <Input 
                    type="number"
                    value={editingPackage.price_cop}
                    onChange={(e) => setEditingPackage({...editingPackage, price_cop: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingPackage.is_active}
                    onCheckedChange={(checked) => setEditingPackage({...editingPackage, is_active: checked})}
                  />
                  <Label>Activo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingPackage.is_featured}
                    onCheckedChange={(checked) => setEditingPackage({...editingPackage, is_featured: checked})}
                  />
                  <Label>Destacado</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPackageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePackage}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tool Cost Dialog */}
      <Dialog open={editToolDialogOpen} onOpenChange={setEditToolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Costo de Herramienta</DialogTitle>
          </DialogHeader>
          {editingTool && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                  value={editingTool.tool_name}
                  onChange={(e) => setEditingTool({...editingTool, tool_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo (no editable)</Label>
                <Input value={editingTool.tool_type} disabled />
              </div>
              <div className="space-y-2">
                <Label>Costo en Créditos</Label>
                <Input 
                  type="number"
                  value={editingTool.credit_cost}
                  onChange={(e) => setEditingTool({...editingTool, credit_cost: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={editingTool.description || ''}
                  onChange={(e) => setEditingTool({...editingTool, description: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={editingTool.is_active}
                  onCheckedChange={(checked) => setEditingTool({...editingTool, is_active: checked})}
                />
                <Label>Activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditToolDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateToolCost}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
