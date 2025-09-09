import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionAdmin } from '@/hooks/useSubscriptionAdmin';
import { Plus, Edit, Trash, Eye, CreditCard, DollarSign, Users, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  created_at: string;
  frequency_type?: string;
  frequency_value?: number;
  max_periods?: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  created_at: string;
  current_period_start: string;
  current_period_end: string;
  lawyer_name?: string;
  lawyer_email?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
}

interface Execution {
  id: string;
  subscription_id: string;
  status: string;
  amount: number;
  currency: string;
  executed_at: string;
  payment_method?: string;
  failure_reason?: string;
}

interface SubscriptionAdminManagerProps {
  authHeaders: Record<string, string>;
}

export default function SubscriptionAdminManager({ authHeaders }: SubscriptionAdminManagerProps) {
  const [currentView, setCurrentView] = useState<'plans' | 'subscriptions' | 'executions'>('plans');
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  
  const {
    plans,
    subscriptions,
    executions,
    isLoading,
    fetchPlans,
    createPlan,
    updatePlan,
    cancelPlan,
    fetchSubscriptions,
    modifySubscription,
    fetchExecutions
  } = useSubscriptionAdmin(authHeaders);
  
  // Form states
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [showEditPlanDialog, setShowEditPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    amount: 0,
    currency: 'USD',
    frequency_type: 'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    frequency_value: 1,
    max_periods: undefined,
    notification_url: '',
    success_url: '',
    cancel_url: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (currentView === 'plans') {
      fetchPlans();
    } else if (currentView === 'subscriptions') {
      fetchSubscriptions();
    }
  }, [currentView]);

  const loadExecutions = async (subscriptionId: string) => {
    const executions = await fetchExecutions(subscriptionId);
    setSelectedSubscription(subscriptionId);
  };

  const handleCreatePlan = async () => {
    try {
      await createPlan(newPlan);
      setShowCreatePlanDialog(false);
      setNewPlan({
        name: '',
        description: '',
        amount: 0,
        currency: 'USD',
        frequency_type: 'MONTHLY',
        frequency_value: 1,
        max_periods: undefined,
        notification_url: '',
        success_url: '',
        cancel_url: ''
      });
      fetchPlans();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    
    try {
      await updatePlan({
        planId: selectedPlan.id,
        name: selectedPlan.name,
        description: selectedPlan.description,
        amount: selectedPlan.amount
      });
      setShowEditPlanDialog(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleCancelPlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este plan? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await cancelPlan(planId);
      fetchPlans();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleModifySubscription = async (subscriptionId: string, action: string, planId?: string) => {
    try {
      await modifySubscription(subscriptionId, action as any, planId);
      fetchSubscriptions();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'ACTIVE': 'default',
      'INACTIVE': 'secondary',
      'CANCELED': 'destructive',
      'PAUSED': 'outline',
      'PENDING': 'outline'
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-4">
        <Button
          variant={currentView === 'plans' ? 'default' : 'outline'}
          onClick={() => setCurrentView('plans')}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Planes
        </Button>
        <Button
          variant={currentView === 'subscriptions' ? 'default' : 'outline'}
          onClick={() => setCurrentView('subscriptions')}
        >
          <Users className="h-4 w-4 mr-2" />
          Suscripciones
        </Button>
        {selectedSubscription && (
          <Button
            variant={currentView === 'executions' ? 'default' : 'outline'}
            onClick={() => setCurrentView('executions')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Ejecuciones
          </Button>
        )}
      </div>

      {/* Plans View */}
      {currentView === 'plans' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gestión de Planes</CardTitle>
            <Dialog open={showCreatePlanDialog} onOpenChange={setShowCreatePlanDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Plan</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo plan de suscripción en dLocal
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Precio</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newPlan.amount}
                        onChange={(e) => setNewPlan({ ...newPlan, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Select value={newPlan.currency} onValueChange={(value) => setNewPlan({ ...newPlan, currency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="COP">COP</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="frequency_type">Frecuencia</Label>
                    <Select value={newPlan.frequency_type} onValueChange={(value) => setNewPlan({ ...newPlan, frequency_type: value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Diario</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="MONTHLY">Mensual</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="frequency_value">Valor de frecuencia</Label>
                      <Input
                        id="frequency_value"
                        type="number"
                        value={newPlan.frequency_value}
                        onChange={(e) => setNewPlan({ ...newPlan, frequency_value: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_periods">Períodos máximos</Label>
                      <Input
                        id="max_periods"
                        type="number"
                        value={newPlan.max_periods || ''}
                        onChange={(e) => setNewPlan({ ...newPlan, max_periods: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreatePlan} disabled={isLoading} className="w-full">
                    {isLoading ? 'Creando...' : 'Crear Plan'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.description}</TableCell>
                    <TableCell>{plan.amount} {plan.currency}</TableCell>
                    <TableCell>{plan.frequency}</TableCell>
                    <TableCell>{getStatusBadge(plan.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowEditPlanDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelPlan(plan.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions View */}
      {currentView === 'subscriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abogado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.lawyer_name}</div>
                        <div className="text-sm text-muted-foreground">{subscription.lawyer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{subscription.plan_name}</TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>
                      {format(new Date(subscription.current_period_start), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadExecutions(subscription.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModifySubscription(subscription.id, 'cancel')}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Executions View */}
      {currentView === 'executions' && selectedSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Ejecuciones de Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell className="font-mono text-sm">{execution.id}</TableCell>
                    <TableCell>{getStatusBadge(execution.status)}</TableCell>
                    <TableCell>{execution.amount} {execution.currency}</TableCell>
                    <TableCell>
                      {format(new Date(execution.executed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>{execution.payment_method || '-'}</TableCell>
                    <TableCell>
                      {execution.failure_reason && (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {execution.failure_reason}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={showEditPlanDialog} onOpenChange={setShowEditPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plan</DialogTitle>
            <DialogDescription>
              Modifica los detalles del plan seleccionado
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={selectedPlan.name}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Input
                  id="edit-description"
                  value={selectedPlan.description}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Estado</Label>
                <Select
                  value={selectedPlan.status}
                  onValueChange={(value) => setSelectedPlan({ ...selectedPlan, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVO</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdatePlan} disabled={isLoading} className="w-full">
                {isLoading ? 'Actualizando...' : 'Actualizar Plan'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}