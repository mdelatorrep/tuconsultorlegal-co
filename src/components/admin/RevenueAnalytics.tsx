import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  DollarSign, TrendingUp, RefreshCw, Loader2, 
  CreditCard, FileText, ArrowUpRight, ArrowDownRight, Calendar
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getColombiaPeriodRange } from "@/lib/date-utils";

interface RevenueData {
  date: string;
  revenue: number;
  count: number;
}

interface TopDocument {
  document_type: string;
  count: number;
  revenue: number;
}

const formatCOP = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const RevenueAnalytics = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topDocuments, setTopDocuments] = useState<TopDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState<string>("30");

  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    todayRevenue: 0,
    totalTransactions: 0,
    avgTicket: 0,
    growthRate: 0
  });

  useEffect(() => {
    loadData();
  }, [periodDays]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(periodDays);
      const range = getColombiaPeriodRange(days);
      const range7 = getColombiaPeriodRange(7);
      const range1 = getColombiaPeriodRange(1);

      // Load paid documents for current and previous period
      const [currentRes, prevRes, monthRes, weekRes, todayRes] = await Promise.all([
        supabase.from('document_tokens').select('*')
          .in('status', ['pagado', 'descargado'])
          .gte('updated_at', range.start).lt('updated_at', range.end)
          .order('updated_at', { ascending: false }),
        supabase.from('document_tokens').select('price')
          .in('status', ['pagado', 'descargado'])
          .gte('updated_at', range.prevStart).lt('updated_at', range.prevEnd),
        supabase.from('document_tokens').select('price')
          .in('status', ['pagado', 'descargado'])
          .gte('updated_at', getColombiaPeriodRange(30).start).lt('updated_at', getColombiaPeriodRange(30).end),
        supabase.from('document_tokens').select('price')
          .in('status', ['pagado', 'descargado'])
          .gte('updated_at', range7.start).lt('updated_at', range7.end),
        supabase.from('document_tokens').select('price')
          .in('status', ['pagado', 'descargado'])
          .gte('updated_at', range1.start).lt('updated_at', range1.end),
      ]);

      const paidDocs = currentRes.data || [];
      const totalRev = paidDocs.reduce((sum, d) => sum + (d.price || 0), 0);
      const monthRev = (monthRes.data || []).reduce((sum, d) => sum + (d.price || 0), 0);
      const weekRev = (weekRes.data || []).reduce((sum, d) => sum + (d.price || 0), 0);
      const todayRev = (todayRes.data || []).reduce((sum, d) => sum + (d.price || 0), 0);
      const prevRevenue = (prevRes.data || []).reduce((sum, d) => sum + (d.price || 0), 0);
      const growth = prevRevenue > 0 ? ((totalRev - prevRevenue) / prevRevenue) * 100 : 0;

      setStats({
        totalRevenue: totalRev,
        monthlyRevenue: monthRev,
        weeklyRevenue: weekRev,
        todayRevenue: todayRev,
        totalTransactions: paidDocs.length,
        avgTicket: paidDocs.length > 0 ? totalRev / paidDocs.length : 0,
        growthRate: growth
      });

      // Group by date for chart
      const dateGroups: Record<string, { revenue: number; count: number }> = {};
      paidDocs.forEach(doc => {
        const date = format(new Date(doc.updated_at), 'yyyy-MM-dd');
        if (!dateGroups[date]) dateGroups[date] = { revenue: 0, count: 0 };
        dateGroups[date].revenue += doc.price || 0;
        dateGroups[date].count += 1;
      });
      setRevenueData(
        Object.entries(dateGroups)
          .map(([date, data]) => ({ date: format(new Date(date), 'dd/MM'), revenue: data.revenue, count: data.count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      // Top documents
      const typeGroups: Record<string, { count: number; revenue: number }> = {};
      paidDocs.forEach(doc => {
        const type = doc.document_type;
        if (!typeGroups[type]) typeGroups[type] = { count: 0, revenue: 0 };
        typeGroups[type].count += 1;
        typeGroups[type].revenue += doc.price || 0;
      });
      setTopDocuments(
        Object.entries(typeGroups)
          .map(([document_type, data]) => ({ document_type, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
      );

    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast({ title: "Error", description: "No se pudieron cargar los datos de ingresos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />Análisis de Ingresos
        </h2>
        <div className="flex items-center gap-2">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" /><SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600" /><span className="text-sm text-muted-foreground">Total Período</span></div>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatCOP(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /><span className="text-sm text-muted-foreground">Este Mes</span></div>
          <p className="text-2xl font-bold mt-1">{formatCOP(stats.monthlyRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /><span className="text-sm text-muted-foreground">Esta Semana</span></div>
          <p className="text-2xl font-bold mt-1">{formatCOP(stats.weeklyRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /><span className="text-sm text-muted-foreground">Hoy</span></div>
          <p className="text-2xl font-bold mt-1">{formatCOP(stats.todayRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Transacciones</span></div>
          <p className="text-2xl font-bold mt-1">{stats.totalTransactions}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-cyan-500" /><span className="text-sm text-muted-foreground">Ticket Promedio</span></div>
          <p className="text-2xl font-bold mt-1">{formatCOP(stats.avgTicket)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            {stats.growthRate >= 0 ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
            <span className="text-sm text-muted-foreground">Crecimiento</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
          </p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Ingresos por Día</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCOP(value), 'Ingresos']} labelFormatter={(label) => `Fecha: ${label}`} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transacciones por Día</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, 'Transacciones']} labelFormatter={(label) => `Fecha: ${label}`} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Top Documentos por Ingresos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tipo de Documento</TableHead>
                <TableHead>Transacciones</TableHead>
                <TableHead>Ingresos</TableHead>
                <TableHead>% Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDocuments.map((doc, index) => (
                <TableRow key={doc.document_type}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{doc.document_type}</TableCell>
                  <TableCell><Badge variant="secondary">{doc.count}</Badge></TableCell>
                  <TableCell className="font-medium text-green-600">{formatCOP(doc.revenue)}</TableCell>
                  <TableCell>{stats.totalRevenue > 0 ? ((doc.revenue / stats.totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
              {topDocuments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay datos de documentos pagados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
