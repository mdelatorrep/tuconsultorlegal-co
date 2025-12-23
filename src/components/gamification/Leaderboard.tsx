import { useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, User, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  rank: number;
  previousRank: number;
  level: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  weeklyLeaderboard: LeaderboardEntry[];
  monthlyLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

// Generate mock leaderboard data
function generateMockLeaderboard(currentUserId?: string): LeaderboardEntry[] {
  const names = [
    'Carlos Martínez', 'María González', 'Juan Rodríguez', 'Ana López', 
    'Pedro Sánchez', 'Laura Torres', 'Diego Ramírez', 'Sofia Herrera',
    'Andrés Moreno', 'Camila Vargas'
  ];
  
  return names.map((name, index) => ({
    id: `user-${index}`,
    name,
    score: Math.floor(Math.random() * 500) + (10 - index) * 100,
    rank: index + 1,
    previousRank: index + 1 + Math.floor(Math.random() * 3) - 1,
    level: Math.floor(Math.random() * 5) + 3,
    isCurrentUser: index === 4, // Current user at position 5
  })).sort((a, b) => b.score - a.score).map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

export function Leaderboard({ 
  weeklyLeaderboard: propWeekly,
  monthlyLeaderboard: propMonthly,
  allTimeLeaderboard: propAllTime,
  currentUserId,
  className 
}: LeaderboardProps) {
  const weeklyLeaderboard = propWeekly.length > 0 ? propWeekly : generateMockLeaderboard(currentUserId);
  const monthlyLeaderboard = propMonthly.length > 0 ? propMonthly : generateMockLeaderboard(currentUserId);
  const allTimeLeaderboard = propAllTime.length > 0 ? propAllTime : generateMockLeaderboard(currentUserId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankChange = (current: number, previous: number) => {
    const diff = previous - current;
    if (diff > 0) {
      return (
        <div className="flex items-center text-green-500 text-xs">
          <ChevronUp className="h-3 w-3" />
          <span>{diff}</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center text-red-500 text-xs">
          <ChevronDown className="h-3 w-3" />
          <span>{Math.abs(diff)}</span>
        </div>
      );
    }
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    // Find current user
    const currentUser = entries.find(e => e.isCurrentUser);
    const topEntries = entries.slice(0, 10);
    
    return (
      <div className="space-y-2">
        {/* Top 3 podium */}
        <div className="flex justify-center items-end gap-2 mb-4 pt-4">
          {/* 2nd place */}
          {entries[1] && (
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-slate-300">
                <AvatarFallback className="bg-slate-100 text-slate-600">
                  {entries[1].name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1 w-16 h-16 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-xs font-medium mt-1 text-center line-clamp-1 max-w-16">
                {entries[1].name.split(' ')[0]}
              </p>
              <p className="text-xs text-muted-foreground">{entries[1].score} pts</p>
            </div>
          )}
          
          {/* 1st place */}
          {entries[0] && (
            <div className="flex flex-col items-center -mt-4">
              <Crown className="h-6 w-6 text-yellow-500 mb-1" />
              <Avatar className="h-14 w-14 border-2 border-yellow-400 ring-2 ring-yellow-200">
                <AvatarFallback className="bg-yellow-100 text-yellow-700">
                  {entries[0].name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1 w-16 h-20 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg flex items-center justify-center">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <p className="text-xs font-medium mt-1 text-center line-clamp-1 max-w-16">
                {entries[0].name.split(' ')[0]}
              </p>
              <p className="text-xs text-muted-foreground">{entries[0].score} pts</p>
            </div>
          )}
          
          {/* 3rd place */}
          {entries[2] && (
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-orange-400">
                <AvatarFallback className="bg-orange-100 text-orange-600">
                  {entries[2].name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1 w-16 h-14 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-xs font-medium mt-1 text-center line-clamp-1 max-w-16">
                {entries[2].name.split(' ')[0]}
              </p>
              <p className="text-xs text-muted-foreground">{entries[2].score} pts</p>
            </div>
          )}
        </div>
        
        {/* Rest of the list */}
        <div className="space-y-1">
          {topEntries.slice(3).map((entry) => (
            <div 
              key={entry.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all",
                entry.isCurrentUser 
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
              
              <Avatar className="h-8 w-8">
                <AvatarFallback className={cn(
                  "text-xs",
                  entry.isCurrentUser && "bg-primary text-primary-foreground"
                )}>
                  {entry.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  entry.isCurrentUser && "text-primary"
                )}>
                  {entry.name}
                  {entry.isCurrentUser && (
                    <Badge variant="outline" className="ml-2 text-[10px]">Tú</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Nivel {entry.level}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {getRankChange(entry.rank, entry.previousRank)}
                <Badge variant="outline" className="text-xs">
                  {entry.score} pts
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {/* Current user if not in top 10 */}
        {currentUser && currentUser.rank > 10 && (
          <>
            <div className="text-center text-muted-foreground text-xs py-2">• • •</div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/30">
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(currentUser.rank)}
              </div>
              
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-primary">
                  {currentUser.name}
                  <Badge variant="outline" className="ml-2 text-[10px]">Tú</Badge>
                </p>
                <p className="text-xs text-muted-foreground">Nivel {currentUser.level}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {getRankChange(currentUser.rank, currentUser.previousRank)}
                <Badge variant="outline" className="text-xs">
                  {currentUser.score} pts
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking
            </CardTitle>
            <CardDescription>
              Compite con otros abogados de la plataforma
            </CardDescription>
          </div>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="alltime">Histórico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="mt-0">
            {renderLeaderboard(weeklyLeaderboard)}
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-0">
            {renderLeaderboard(monthlyLeaderboard)}
          </TabsContent>
          
          <TabsContent value="alltime" className="mt-0">
            {renderLeaderboard(allTimeLeaderboard)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
