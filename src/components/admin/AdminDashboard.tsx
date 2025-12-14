import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Bot, MessageCircle, FileText, TrendingUp, 
  Activity, CheckCircle, Clock, AlertCircle, ChevronRight
} from "lucide-react";

interface DashboardProps {
  lawyers: any[];
  agents: any[];
  unreadMessagesCount: number;
  pendingAgentsCount: number;
  pendingBlogsCount: number;
  blogPosts: any[];
  onNavigate?: (view: string) => void;
}

export const AdminDashboard = ({
  lawyers,
  agents,
  unreadMessagesCount,
  pendingAgentsCount,
  pendingBlogsCount,
  blogPosts,
  onNavigate
}: DashboardProps) => {
  const stats = [
    {
      title: "Total Abogados",
      value: lawyers.length,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      trend: "+12% este mes"
    },
    {
      title: "Agentes Activos",
      value: agents.filter(a => a.status === 'active').length,
      icon: Bot,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      trend: `${agents.length} totales`
    },
    {
      title: "Consultas Pendientes",
      value: unreadMessagesCount,
      icon: MessageCircle,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      trend: "Requieren atención"
    },
    {
      title: "Blogs Publicados",
      value: blogPosts.filter(b => b.status === 'published').length,
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      trend: `${blogPosts.length} totales`
    }
  ];

  const recentActivity = [
    {
      type: "agent",
      title: "Agentes pendientes de revisión",
      count: pendingAgentsCount,
      icon: Bot,
      color: "text-orange-600",
      status: pendingAgentsCount > 0 ? "warning" : "success",
      targetView: "agents"
    },
    {
      type: "blog",
      title: "Blogs en revisión",
      count: pendingBlogsCount,
      icon: FileText,
      color: "text-purple-600",
      status: pendingBlogsCount > 0 ? "warning" : "success",
      targetView: "blogs"
    },
    {
      type: "message",
      title: "Mensajes sin leer",
      count: unreadMessagesCount,
      icon: MessageCircle,
      color: "text-red-600",
      status: unreadMessagesCount > 0 ? "error" : "success",
      targetView: "messages"
    }
  ];

  const handleTaskClick = (targetView: string) => {
    if (onNavigate) {
      onNavigate(targetView);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </p>
                    <h3 className="text-xl md:text-3xl font-bold mt-1 md:mt-2">
                      {stat.value}
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 truncate">
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor} shrink-0`}>
                    <Icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="space-y-2 md:space-y-4">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/50 gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                      <Bot className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{agent.category}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={agent.status === 'active' ? 'default' : agent.status === 'pending_review' ? 'outline' : 'secondary'}
                    className="text-[10px] md:text-xs shrink-0"
                  >
                    {agent.status}
                  </Badge>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <Bot className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-xs md:text-sm">No hay agentes registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Pending Items */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              Tareas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="space-y-2 md:space-y-4">
              {recentActivity.map((item, index) => {
                const Icon = item.icon;
                const isClickable = item.count > 0 && onNavigate;
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/50 gap-2 min-h-[44px] ${
                      isClickable ? 'cursor-pointer hover:bg-muted active:bg-muted/80 transition-colors' : ''
                    }`}
                    onClick={() => isClickable && handleTaskClick(item.targetView)}
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 ${item.color} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {item.count > 0 ? `${item.count} pendientes` : "Todo al día"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                      {item.count > 0 ? (
                        <>
                          <Badge variant="destructive" className="text-[10px] md:text-xs">{item.count}</Badge>
                          {onNavigate && <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />}
                        </>
                      ) : (
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground">Agentes Aprobados</span>
                  <span className="font-medium">
                    {agents.filter(a => a.status === 'approved' || a.status === 'active').length}/{agents.length}
                  </span>
                </div>
                <Progress 
                  value={(agents.filter(a => a.status === 'approved' || a.status === 'active').length / Math.max(agents.length, 1)) * 100} 
                  className="h-1.5 md:h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground">Blogs Publicados</span>
                  <span className="font-medium">
                    {blogPosts.filter(b => b.status === 'published').length}/{blogPosts.length}
                  </span>
                </div>
                <Progress 
                  value={(blogPosts.filter(b => b.status === 'published').length / Math.max(blogPosts.length, 1)) * 100} 
                  className="h-1.5 md:h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground">Mensajes Atendidos</span>
                  <span className="font-medium">-</span>
                </div>
                <Progress value={75} className="h-1.5 md:h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
