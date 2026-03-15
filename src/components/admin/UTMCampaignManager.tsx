import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Copy, Plus, Link, BarChart3, TrendingUp, Eye, UserPlus, Percent, ExternalLink, Trash2, RefreshCw } from 'lucide-react';

const PLATFORMS = [
  { value: 'google', label: 'Google Ads' },
  { value: 'facebook', label: 'Facebook / Meta' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referidos' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'other', label: 'Otro' },
];

const BASE_URL = 'https://praxis-hub.co/auth-abogados';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string | null;
  utm_content: string | null;
  generated_url: string;
  short_description: string | null;
  is_active: boolean;
  created_at: string;
  visits?: number;
  signups?: number;
  conversion?: number;
}

interface EventMetrics {
  utm_campaign: string;
  utm_source: string;
  event_type: string;
  count: number;
}

export function UTMCampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [eventMetrics, setEventMetrics] = useState<EventMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    platform: 'google',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    short_description: '',
  });

  const generatedUrl = (() => {
    const params = new URLSearchParams();
    if (form.utm_source) params.set('utm_source', form.utm_source);
    if (form.utm_medium) params.set('utm_medium', form.utm_medium);
    if (form.utm_campaign) params.set('utm_campaign', form.utm_campaign);
    if (form.utm_term) params.set('utm_term', form.utm_term);
    if (form.utm_content) params.set('utm_content', form.utm_content);
    const qs = params.toString();
    return qs ? `${BASE_URL}?${qs}` : BASE_URL;
  })();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, eventsRes] = await Promise.all([
        supabase.from('utm_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('utm_tracking_events').select('utm_campaign, utm_source, event_type'),
      ]);

      if (campaignsRes.data) {
        // Calculate metrics per campaign
        const metrics: Record<string, { visits: number; signups: number }> = {};
        (eventsRes.data || []).forEach((e: any) => {
          const key = e.utm_campaign || '__direct__';
          if (!metrics[key]) metrics[key] = { visits: 0, signups: 0 };
          if (e.event_type === 'visit') metrics[key].visits++;
          if (e.event_type === 'signup') metrics[key].signups++;
        });

        const enriched = campaignsRes.data.map((c: any) => {
          const m = metrics[c.utm_campaign] || { visits: 0, signups: 0 };
          return {
            ...c,
            visits: m.visits,
            signups: m.signups,
            conversion: m.visits > 0 ? ((m.signups / m.visits) * 100) : 0,
          };
        });
        setCampaigns(enriched);
      }

      // Aggregate metrics by source for analytics
      const aggregated: EventMetrics[] = [];
      const sourceMap: Record<string, Record<string, number>> = {};
      (eventsRes.data || []).forEach((e: any) => {
        const src = e.utm_source || 'directo';
        if (!sourceMap[src]) sourceMap[src] = { visit: 0, signup: 0 };
        if (e.event_type === 'visit') sourceMap[src].visit++;
        if (e.event_type === 'signup') sourceMap[src].signup++;
      });
      Object.entries(sourceMap).forEach(([source, counts]) => {
        aggregated.push({ utm_campaign: '', utm_source: source, event_type: 'visit', count: counts.visit });
        aggregated.push({ utm_campaign: '', utm_source: source, event_type: 'signup', count: counts.signup });
      });
      setEventMetrics(aggregated);
    } catch (error) {
      console.error('Error loading UTM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.utm_source || !form.utm_medium || !form.utm_campaign) {
      toast({ title: 'Campos requeridos', description: 'Nombre, source, medium y campaign son obligatorios.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('utm_campaigns').insert({
        name: form.name,
        platform: form.platform,
        utm_source: form.utm_source,
        utm_medium: form.utm_medium,
        utm_campaign: form.utm_campaign,
        utm_term: form.utm_term || null,
        utm_content: form.utm_content || null,
        generated_url: generatedUrl,
        short_description: form.short_description || null,
      });

      if (error) throw error;
      toast({ title: 'Campaña creada', description: 'La URL de tracking ha sido generada.' });
      setForm({ name: '', platform: 'google', utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '', short_description: '' });
      setShowForm(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiada', description: 'La URL ha sido copiada al portapapeles.' });
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('utm_campaigns').update({ is_active: !isActive }).eq('id', id);
    loadData();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from('utm_campaigns').delete().eq('id', id);
    loadData();
  };

  // Auto-fill suggestions based on platform
  const handlePlatformChange = (platform: string) => {
    const suggestions: Record<string, { source: string; medium: string }> = {
      google: { source: 'google', medium: 'cpc' },
      facebook: { source: 'facebook', medium: 'paid_social' },
      instagram: { source: 'instagram', medium: 'paid_social' },
      linkedin: { source: 'linkedin', medium: 'paid_social' },
      tiktok: { source: 'tiktok', medium: 'paid_social' },
      twitter: { source: 'twitter', medium: 'paid_social' },
      email: { source: 'newsletter', medium: 'email' },
      whatsapp: { source: 'whatsapp', medium: 'messaging' },
      referral: { source: 'referral', medium: 'referral' },
      organic: { source: 'organic', medium: 'social' },
      other: { source: '', medium: '' },
    };
    const s = suggestions[platform] || { source: '', medium: '' };
    setForm((prev) => ({ ...prev, platform, utm_source: s.source, utm_medium: s.medium }));
  };

  // Analytics: group by source
  const sourceAnalytics = (() => {
    const sources: Record<string, { visits: number; signups: number }> = {};
    eventMetrics.forEach((m) => {
      if (!sources[m.utm_source]) sources[m.utm_source] = { visits: 0, signups: 0 };
      if (m.event_type === 'visit') sources[m.utm_source].visits += m.count;
      if (m.event_type === 'signup') sources[m.utm_source].signups += m.count;
    });
    return Object.entries(sources)
      .map(([source, data]) => ({
        source,
        ...data,
        conversion: data.visits > 0 ? ((data.signups / data.visits) * 100) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);
  })();

  const totalVisits = sourceAnalytics.reduce((sum, s) => sum + s.visits, 0);
  const totalSignups = sourceAnalytics.reduce((sum, s) => sum + s.signups, 0);
  const totalConversion = totalVisits > 0 ? ((totalSignups / totalVisits) * 100) : 0;

  const maxVisits = Math.max(...sourceAnalytics.map((s) => s.visits), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link className="w-6 h-6" />
            UTM & Campañas de Marketing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Genera URLs con tracking para medir la atribución de registros de abogados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Link className="w-4 h-4" /> Campañas Activas</div>
            <p className="text-3xl font-bold mt-1">{campaigns.filter((c) => c.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Eye className="w-4 h-4" /> Total Visitas</div>
            <p className="text-3xl font-bold mt-1">{totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><UserPlus className="w-4 h-4" /> Registros</div>
            <p className="text-3xl font-bold mt-1">{totalSignups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Percent className="w-4 h-4" /> Conversión</div>
            <p className="text-3xl font-bold mt-1">{totalConversion.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="analytics">Análisis por Plataforma</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Create Form */}
          {showForm && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg">Crear Nueva Campaña UTM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de Campaña *</Label>
                    <Input placeholder="Ej: Lanzamiento LinkedIn Q1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma *</Label>
                    <Select value={form.platform} onValueChange={handlePlatformChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>utm_source *</Label>
                    <Input placeholder="google, facebook, linkedin..." value={form.utm_source} onChange={(e) => setForm((p) => ({ ...p, utm_source: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>utm_medium *</Label>
                    <Input placeholder="cpc, paid_social, email..." value={form.utm_medium} onChange={(e) => setForm((p) => ({ ...p, utm_medium: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>utm_campaign *</Label>
                    <Input placeholder="lanzamiento_q1_2026" value={form.utm_campaign} onChange={(e) => setForm((p) => ({ ...p, utm_campaign: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>utm_term (opcional)</Label>
                    <Input placeholder="Keyword o segmento" value={form.utm_term} onChange={(e) => setForm((p) => ({ ...p, utm_term: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>utm_content (opcional)</Label>
                    <Input placeholder="Variación de anuncio" value={form.utm_content} onChange={(e) => setForm((p) => ({ ...p, utm_content: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Textarea placeholder="Notas internas sobre la campaña..." value={form.short_description} onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))} rows={2} />
                </div>

                {/* URL Preview */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <Label className="text-xs text-muted-foreground">URL Generada</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all flex-1 text-primary">{generatedUrl}</code>
                    <Button variant="outline" size="sm" onClick={() => copyUrl(generatedUrl)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creando...' : 'Crear Campaña'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando campañas...</div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Link className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin campañas aún</h3>
                <p className="text-muted-foreground mb-4">Crea tu primera campaña UTM para comenzar a rastrear registros.</p>
                <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Crear Primera Campaña</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{c.name}</h4>
                          <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Activa' : 'Inactiva'}</Badge>
                          <Badge variant="outline">{PLATFORMS.find((p) => p.value === c.platform)?.label || c.platform}</Badge>
                        </div>
                        {c.short_description && <p className="text-xs text-muted-foreground mb-2">{c.short_description}</p>}
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-muted-foreground truncate max-w-[400px]">{c.generated_url}</code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyUrl(c.generated_url)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <a href={c.generated_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><ExternalLink className="w-3 h-3" /></Button>
                          </a>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Visitas</p>
                          <p className="font-bold text-lg">{c.visits || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Registros</p>
                          <p className="font-bold text-lg">{c.signups || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Conversión</p>
                          <p className="font-bold text-lg">{(c.conversion || 0).toFixed(1)}%</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => toggleActive(c.id, c.is_active)}>
                          {c.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Atribución por Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sourceAnalytics.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin datos de tracking aún. Comparte las URLs de tus campañas para comenzar a recibir datos.</p>
              ) : (
                <div className="space-y-4">
                  {sourceAnalytics.map((s) => (
                    <div key={s.source} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{s.source}</span>
                          <span className="text-xs text-muted-foreground">{s.visits} visitas · {s.signups} registros</span>
                        </div>
                        <Badge variant={s.conversion > 5 ? 'default' : 'secondary'}>
                          {s.conversion.toFixed(1)}% conversión
                        </Badge>
                      </div>
                      <div className="flex gap-1 h-6">
                        <div
                          className="bg-primary/30 rounded-sm transition-all"
                          style={{ width: `${(s.visits / maxVisits) * 100}%` }}
                          title={`${s.visits} visitas`}
                        />
                        <div
                          className="bg-primary rounded-sm transition-all"
                          style={{ width: `${(s.signups / maxVisits) * 100}%` }}
                          title={`${s.signups} registros`}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-4 flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary/30 rounded-sm inline-block" /> Visitas</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded-sm inline-block" /> Registros</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
