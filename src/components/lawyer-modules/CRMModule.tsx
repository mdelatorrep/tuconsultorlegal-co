import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, Calendar, Mail, Settings, Plus, Search, Filter, BarChart3, Brain, Bell, MessageSquare } from 'lucide-react';
import CRMClientsView from './crm/CRMClientsView';
import CRMCasesView from './crm/CRMCasesView';
import CRMCommunicationsView from './crm/CRMCommunicationsView';
import CRMDocumentsView from './crm/CRMDocumentsView';
import CRMAutomationView from './crm/CRMAutomationView';
import CRMAnalyticsView from './crm/CRMAnalyticsView';

interface CRMModuleProps {
  lawyerData: any;
}

const CRMModule: React.FC<CRMModuleProps> = ({ lawyerData }) => {
  const [activeTab, setActiveTab] = useState('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    activeCases: 0,
    pendingTasks: 0,
    recentCommunications: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchStats();
    }
  }, [lawyerData?.id]);

  const fetchStats = async () => {
    try {
      const [clientsRes, casesRes, tasksRes, commsRes] = await Promise.all([
        supabase.from('crm_clients').select('id', { count: 'exact' }).eq('lawyer_id', lawyerData.id),
        supabase.from('crm_cases').select('id', { count: 'exact' }).eq('lawyer_id', lawyerData.id).eq('status', 'active'),
        supabase.from('crm_tasks').select('id', { count: 'exact' }).eq('lawyer_id', lawyerData.id).eq('status', 'pending'),
        supabase.from('crm_communications').select('id', { count: 'exact' }).eq('lawyer_id', lawyerData.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      setStats({
        totalClients: clientsRes.count || 0,
        activeCases: casesRes.count || 0,
        pendingTasks: tasksRes.count || 0,
        recentCommunications: commsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
    }
  };

  const handleAISegmentation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('crm-ai-segmentation', {
        body: { lawyer_id: lawyerData.id }
      });

      if (error) throw error;

      toast({
        title: "Segmentación IA completada",
        description: `Se crearon ${data.segments_created} nuevos segmentos de clientes`,
      });
    } catch (error) {
      console.error('Error in AI segmentation:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la segmentación con IA",
        variant: "destructive",
      });
    }
  };

  const renderTabContent = () => {
    const commonProps = { lawyerData, searchTerm, onRefresh: fetchStats };

    switch (activeTab) {
      case 'clients':
        return <CRMClientsView {...commonProps} />;
      case 'cases':
        return <CRMCasesView {...commonProps} />;
      case 'communications':
        return <CRMCommunicationsView {...commonProps} />;
      case 'documents':
        return <CRMDocumentsView {...commonProps} />;
      case 'automation':
        return <CRMAutomationView {...commonProps} />;
      case 'analytics':
        return <CRMAnalyticsView {...commonProps} />;
      default:
        return <CRMClientsView {...commonProps} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CRM - Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            Centraliza y automatiza la gestión de tus clientes con IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAISegmentation} variant="outline" size="sm">
            <Brain className="h-4 w-4 mr-2" />
            Segmentación IA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Casos Activos</p>
                <p className="text-2xl font-bold">{stats.activeCases}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas Pendientes</p>
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comunicaciones (7d)</p>
                <p className="text-2xl font-bold">{stats.recentCommunications}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en CRM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Casos</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Comunicaciones</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Automatización</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analíticas</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {renderTabContent()}
        </div>
      </Tabs>
    </div>
  );
};

export default CRMModule;