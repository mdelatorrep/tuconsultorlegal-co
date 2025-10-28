import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Bot, MessageCircle, FileText, TrendingUp, 
  Activity, CheckCircle, Clock, AlertCircle
} from "lucide-react";

interface DashboardProps {
  lawyers: any[];
  agents: any[];
  unreadMessagesCount: number;
  pendingAgentsCount: number;
  pendingBlogsCount: number;
  blogPosts: any[];
}

export const AdminDashboard = ({
  lawyers,
  agents,
  unreadMessagesCount,
  pendingAgentsCount,
  pendingBlogsCount,
  blogPosts
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
      status: pendingAgentsCount > 0 ? "warning" : "success"
    },
    {
      type: "blog",
      title: "Blogs en revisión",
      count: pendingBlogsCount,
      icon: FileText,
      color: "text-purple-600",
      status: pendingBlogsCount > 0 ? "warning" : "success"
    },
    {
      type: "message",
      title: "Mensajes sin leer",
      count: unreadMessagesCount,
      icon: MessageCircle,
      color: "text-red-600",
      status: unreadMessagesCount > 0 ? "error" : "success"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <h3 className="text-3xl font-bold mt-2">
                      {stat.value}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.category}</p>
                    </div>
                  </div>
                  <Badge variant={agent.status === 'active' ? 'default' : agent.status === 'pending_review' ? 'outline' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay agentes registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Tareas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.count > 0 ? `${item.count} pendientes` : "Todo al día"}
                        </p>
                      </div>
                    </div>
                    {item.count > 0 ? (
                      <Badge variant="destructive">{item.count}</Badge>
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Agentes Aprobados</span>
                  <span className="font-medium">
                    {agents.filter(a => a.status === 'approved' || a.status === 'active').length}/{agents.length}
                  </span>
                </div>
                <Progress 
                  value={(agents.filter(a => a.status === 'approved' || a.status === 'active').length / Math.max(agents.length, 1)) * 100} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Blogs Publicados</span>
                  <span className="font-medium">
                    {blogPosts.filter(b => b.status === 'published').length}/{blogPosts.length}
                  </span>
                </div>
                <Progress 
                  value={(blogPosts.filter(b => b.status === 'published').length / Math.max(blogPosts.length, 1)) * 100} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Mensajes Atendidos</span>
                  <span className="font-medium">-</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
