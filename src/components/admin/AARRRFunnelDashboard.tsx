import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import {
  Users, Zap, DollarSign, Heart, Share2,
  TrendingUp, TrendingDown, Minus, ArrowDown
} from "lucide-react";

type Period = "1d" | "7d" | "30d" | "90d";

const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

function getDateRange(period: Period) {
  const now = new Date();
  const days = period === "1d" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(start.getTime() - days * 86400000);
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: start.toISOString(),
    days,
  };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-600 flex items-center gap-0.5 text-xs font-semibold"><TrendingUp className="w-3 h-3" />+{value}%</span>;
  if (value < 0) return <span className="text-red-600 flex items-center gap-0.5 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{value}%</span>;
  return <span className="text-muted-foreground flex items-center gap-0.5 text-xs"><Minus className="w-3 h-3" />0%</span>;
}

export function AARRRFunnelDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const range = useMemo(() => getDateRange(period), [period]);

  // Acquisition
  const { data: acqData } = useQuery({
    queryKey: ["aarrr-acquisition", period],
    queryFn: async () => {
      const [reg, prevReg, leads, prevLeads] = await Promise.all([
        supabase.from("lawyer_profiles").select("id", { count: "exact", head: true }).gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("lawyer_profiles").select("id", { count: "exact", head: true }).gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
      ]);
      return {
        registrations: reg.count ?? 0,
        prevRegistrations: prevReg.count ?? 0,
        leads: leads.count ?? 0,
        prevLeads: prevLeads.count ?? 0,
      };
    },
  });

  // Activation
  const { data: actData } = useQuery({
    queryKey: ["aarrr-activation", period],
    queryFn: async () => {
      const [used, prevUsed, profile, prevProfile] = await Promise.all([
        supabase.from("credit_transactions").select("lawyer_id", { count: "exact", head: false }).eq("transaction_type", "consumption").gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("credit_transactions").select("lawyer_id", { count: "exact", head: false }).eq("transaction_type", "consumption").gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
        supabase.from("lawyer_profiles").select("id", { count: "exact", head: true }).not("phone_number", "is", null).not("specialization", "is", null).gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("lawyer_profiles").select("id", { count: "exact", head: true }).not("phone_number", "is", null).not("specialization", "is", null).gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
      ]);
      const uniqueUsers = new Set((used.data ?? []).map((r: any) => r.lawyer_id)).size;
      const prevUniqueUsers = new Set((prevUsed.data ?? []).map((r: any) => r.lawyer_id)).size;
      return {
        toolUsers: uniqueUsers,
        prevToolUsers: prevUniqueUsers,
        profileComplete: profile.count ?? 0,
        prevProfileComplete: prevProfile.count ?? 0,
      };
    },
  });

  // Revenue
  const { data: revData } = useQuery({
    queryKey: ["aarrr-revenue", period],
    queryFn: async () => {
      const [docs, prevDocs, purchases, prevPurchases] = await Promise.all([
        supabase.from("document_tokens").select("id", { count: "exact", head: true }).in("status", ["pagado", "descargado"]).gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("document_tokens").select("id", { count: "exact", head: true }).in("status", ["pagado", "descargado"]).gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
        supabase.from("credit_transactions").select("amount").eq("transaction_type", "purchase").gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("credit_transactions").select("amount").eq("transaction_type", "purchase").gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
      ]);
      const purchaseTotal = (purchases.data ?? []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const prevPurchaseTotal = (prevPurchases.data ?? []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      return {
        paidDocs: docs.count ?? 0,
        prevPaidDocs: prevDocs.count ?? 0,
        creditsPurchased: purchaseTotal,
        prevCreditsPurchased: prevPurchaseTotal,
      };
    },
  });

  // Retention
  const { data: retData } = useQuery({
    queryKey: ["aarrr-retention", period],
    queryFn: async () => {
      const { data: allLawyers } = await supabase.from("lawyer_profiles").select("id, created_at");
      const { data: recentTx } = await supabase.from("credit_transactions").select("lawyer_id, created_at").gte("created_at", range.start).lte("created_at", range.end);
      const { data: prevTx } = await supabase.from("credit_transactions").select("lawyer_id, created_at").gte("created_at", range.prevStart).lte("created_at", range.prevEnd);

      const total = allLawyers?.length ?? 0;
      const activeNow = new Set((recentTx ?? []).map((r: any) => r.lawyer_id)).size;
      const activePrev = new Set((prevTx ?? []).map((r: any) => r.lawyer_id)).size;
      const churned = total - activeNow;
      const prevChurned = total - activePrev;

      return {
        total,
        active: activeNow,
        prevActive: activePrev,
        churned,
        prevChurned,
        retentionRate: total > 0 ? Math.round((activeNow / total) * 100) : 0,
        prevRetentionRate: total > 0 ? Math.round((activePrev / total) * 100) : 0,
      };
    },
  });

  // Referral
  const { data: refData } = useQuery({
    queryKey: ["aarrr-referral", period],
    queryFn: async () => {
      const [refs, prevRefs] = await Promise.all([
        supabase.from("lawyer_referrals").select("id", { count: "exact", head: true }).gt("referrals_count", 0).gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("lawyer_referrals").select("id", { count: "exact", head: true }).gt("referrals_count", 0).gte("created_at", range.prevStart).lte("created_at", range.prevEnd),
      ]);
      return {
        referrals: refs.count ?? 0,
        prevReferrals: prevRefs.count ?? 0,
      };
    },
  });

  // Funnel stages
  const stages = [
    {
      key: "acquisition",
      label: "Acquisition",
      icon: Users,
      color: "from-blue-500 to-blue-400",
      value: (acqData?.registrations ?? 0) + (acqData?.leads ?? 0),
      metrics: [
        { label: "Registros", value: acqData?.registrations ?? 0, change: pctChange(acqData?.registrations ?? 0, acqData?.prevRegistrations ?? 0) },
        { label: "Leads", value: acqData?.leads ?? 0, change: pctChange(acqData?.leads ?? 0, acqData?.prevLeads ?? 0) },
      ],
    },
    {
      key: "activation",
      label: "Activation",
      icon: Zap,
      color: "from-emerald-500 to-emerald-400",
      value: (actData?.toolUsers ?? 0) + (actData?.profileComplete ?? 0),
      metrics: [
        { label: "Usaron IA", value: actData?.toolUsers ?? 0, change: pctChange(actData?.toolUsers ?? 0, actData?.prevToolUsers ?? 0) },
        { label: "Perfil completo", value: actData?.profileComplete ?? 0, change: pctChange(actData?.profileComplete ?? 0, actData?.prevProfileComplete ?? 0) },
      ],
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: DollarSign,
      color: "from-amber-500 to-amber-400",
      value: (revData?.paidDocs ?? 0) + (revData?.creditsPurchased ?? 0),
      metrics: [
        { label: "Docs pagados", value: revData?.paidDocs ?? 0, change: pctChange(revData?.paidDocs ?? 0, revData?.prevPaidDocs ?? 0) },
        { label: "Créditos comprados", value: revData?.creditsPurchased ?? 0, change: pctChange(revData?.creditsPurchased ?? 0, revData?.prevCreditsPurchased ?? 0) },
      ],
    },
    {
      key: "retention",
      label: "Retention",
      icon: Heart,
      color: "from-rose-500 to-rose-400",
      value: retData?.active ?? 0,
      metrics: [
        { label: "Activos", value: retData?.active ?? 0, change: pctChange(retData?.active ?? 0, retData?.prevActive ?? 0) },
        { label: "Churned", value: retData?.churned ?? 0, change: pctChange(retData?.churned ?? 0, retData?.prevChurned ?? 0) },
        { label: "Retención %", value: retData?.retentionRate ?? 0, change: (retData?.retentionRate ?? 0) - (retData?.prevRetentionRate ?? 0), suffix: "%" },
      ],
    },
    {
      key: "referral",
      label: "Referral",
      icon: Share2,
      color: "from-violet-500 to-violet-400",
      value: refData?.referrals ?? 0,
      metrics: [
        { label: "Referidos activos", value: refData?.referrals ?? 0, change: pctChange(refData?.referrals ?? 0, refData?.prevReferrals ?? 0) },
      ],
    },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Funnel AARRR</h2>
          <p className="text-sm text-muted-foreground">Métricas de Pirate Metrics por periodo</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Funnel de Conversión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((stage, idx) => {
            const width = Math.max((stage.value / maxValue) * 100, 8);
            const conversionFromPrev = idx > 0 && stages[idx - 1].value > 0
              ? Math.round((stage.value / stages[idx - 1].value) * 100)
              : null;
            return (
              <div key={stage.key}>
                <div className="flex items-center gap-3 mb-1">
                  <stage.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-24 shrink-0">{stage.label}</span>
                  <div className="flex-1 relative">
                    <div
                      className={`h-8 rounded-md bg-gradient-to-r ${stage.color} flex items-center justify-end pr-2 transition-all`}
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow">{stage.value}</span>
                    </div>
                  </div>
                  {conversionFromPrev !== null && (
                    <Badge variant="outline" className="shrink-0 text-xs gap-1">
                      <ArrowDown className="w-3 h-3" />
                      {conversionFromPrev}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const mainMetric = stage.metrics[0];
          return (
            <Card key={stage.key}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <stage.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{stage.label}</span>
                </div>
                <div className="text-2xl font-bold">{stage.value}</div>
                <ChangeIndicator value={mainMetric.change} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics Accordion */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Estadísticas Detalladas</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {stages.map((stage) => (
              <AccordionItem key={stage.key} value={stage.key}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <stage.icon className="w-4 h-4" />
                    {stage.label}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stage.metrics.map((m) => (
                      <div key={m.label} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <span className="text-xs text-muted-foreground">{m.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {m.value}{(m as any).suffix ?? ""}
                          </span>
                          <ChangeIndicator value={m.change} />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Churn & Retention Summary */}
      {retData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Abogados</p>
              <p className="text-2xl font-bold">{retData.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Tasa de Retención</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{retData.retentionRate}%</p>
                <ChangeIndicator value={(retData.retentionRate) - (retData.prevRetentionRate)} />
              </div>
              <Progress value={retData.retentionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Tasa de Churn</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{retData.total > 0 ? 100 - retData.retentionRate : 0}%</p>
              </div>
              <Progress value={retData.total > 0 ? 100 - retData.retentionRate : 0} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
