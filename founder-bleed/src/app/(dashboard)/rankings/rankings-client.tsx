'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trophy, Users, Building2, Crown, Medal, Award, Eye, EyeOff, Clock, TrendingUp, LogIn, Home, Settings, LogOut, User, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RankingEntry {
  rank: number;
  displayName: string;
  efficiencyScore: number | null;
  planningScore: number | null;
  uniqueTimeMinutes: number | null;
  isCurrentUser: boolean;
  isContact: boolean;
  isTeammate: boolean;
  isHidden: boolean;
}

interface RankingsData {
  rankings: RankingEntry[];
  totalParticipants: number;
  currentUserRank: number | null;
  type: string;
  sortBy: string;
  isAuthenticated: boolean;
  hasTeam?: boolean;
}

type SortOption = 'unique' | 'delegation' | 'planning';

interface RankingsClientProps {
  isAuthenticated: boolean;
}

function formatMinutesToHHMM(minutes: number | null): string {
  if (minutes === null) return '---';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function RankingsClient({ isAuthenticated }: RankingsClientProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'team'>('global');
  const [sortBy, setSortBy] = useState<SortOption>('unique');
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRankings(activeTab, sortBy);
  }, [activeTab, sortBy]);

  const fetchRankings = async (type: string, sort: SortOption) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rankings?type=${type}&sortBy=${sort}`);
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to global if not authenticated
          if (type !== 'global') {
            setActiveTab('global');
            return;
          }
        }
        throw new Error('Failed to fetch rankings');
      }
      const data = await response.json();
      setRankings(data);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      toast.error('Failed to load rankings');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-sm text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between border-b pb-4 -mt-2 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Rankings</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/signin">
              <Button size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </nav>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Rankings
        </h1>
        <p className="text-muted-foreground">
          {isAuthenticated
            ? 'See how your efficiency compares to other founders'
            : 'See how founders compare on efficiency metrics'}
        </p>
      </div>

      {/* Sign in prompt for unauthenticated users */}
      {!isAuthenticated && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20">
                  <LogIn className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Sign in to see your rank</p>
                  <p className="text-sm text-muted-foreground">
                    Compare with friends, see team rankings, and track your progress
                  </p>
                </div>
              </div>
              <Link href="/signin">
                <Button>Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current User Scores - Click to switch leaderboard */}
      {isAuthenticated && rankings && (
        <div className="grid grid-cols-3 gap-4">
          {/* Unique Time */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              sortBy === 'unique'
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary ring-2 ring-primary/20'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSortBy('unique')}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  sortBy === 'unique' ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <Clock className={cn('h-5 w-5', sortBy === 'unique' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unique Time</p>
                  <p className={cn('text-xl font-bold font-mono', sortBy === 'unique' && 'text-primary')}>
                    {rankings.rankings.find(r => r.isCurrentUser)?.uniqueTimeMinutes !== undefined
                      ? formatMinutesToHHMM(rankings.rankings.find(r => r.isCurrentUser)?.uniqueTimeMinutes ?? null)
                      : '---'}
                  </p>
                  {rankings.currentUserRank && sortBy === 'unique' && (
                    <p className="text-xs text-muted-foreground">
                      Rank #{rankings.currentUserRank}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delegation */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              sortBy === 'delegation'
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary ring-2 ring-primary/20'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSortBy('delegation')}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  sortBy === 'delegation' ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <TrendingUp className={cn('h-5 w-5', sortBy === 'delegation' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delegation</p>
                  <p className={cn('text-xl font-bold', sortBy === 'delegation' && 'text-primary')}>
                    {rankings.rankings.find(r => r.isCurrentUser)?.efficiencyScore !== undefined
                      ? `${Math.round(rankings.rankings.find(r => r.isCurrentUser)?.efficiencyScore ?? 0)}%`
                      : '---'}
                  </p>
                  {rankings.currentUserRank && sortBy === 'delegation' && (
                    <p className="text-xs text-muted-foreground">
                      Rank #{rankings.currentUserRank}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Planning */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              sortBy === 'planning'
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary ring-2 ring-primary/20'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSortBy('planning')}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  sortBy === 'planning' ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <Trophy className={cn('h-5 w-5', sortBy === 'planning' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Planning</p>
                  <p className={cn('text-xl font-bold', sortBy === 'planning' && 'text-primary')}>
                    {rankings.rankings.find(r => r.isCurrentUser)?.planningScore !== undefined
                      ? `${Math.round(rankings.rankings.find(r => r.isCurrentUser)?.planningScore ?? 0)}%`
                      : '---'}
                  </p>
                  {rankings.currentUserRank && sortBy === 'planning' && (
                    <p className="text-xs text-muted-foreground">
                      Rank #{rankings.currentUserRank}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className={cn(
          'grid w-full lg:w-[400px]',
          isAuthenticated ? 'grid-cols-3' : 'grid-cols-1'
        )}>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Global
          </TabsTrigger>
          {isAuthenticated && (
            <>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Team
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <RankingsList
            rankings={rankings}
            isLoading={isLoading}
            sortBy={sortBy}
            emptyMessage="No rankings available yet. Complete an audit to appear on the leaderboard!"
          />
        </TabsContent>

        {isAuthenticated && (
          <>
            <TabsContent value="friends" className="mt-6">
              <RankingsList
                rankings={rankings}
                isLoading={isLoading}
                sortBy={sortBy}
                emptyMessage="No friends to compare with yet. Invite contacts from Settings to see how you compare!"
              />
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              {rankings?.hasTeam === false ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Team Members Found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Team rankings are based on your email domain. When other founders with the same
                      company email domain join, they&apos;ll appear here automatically.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <RankingsList
                  rankings={rankings}
                  isLoading={isLoading}
                  sortBy={sortBy}
                  emptyMessage="No team members with completed audits yet."
                />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Privacy Note - only for authenticated users */}
      {isAuthenticated && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Privacy Settings</p>
                <p>
                  You can control your visibility in rankings from the{' '}
                  <Link href="/settings?tab=contacts" className="text-primary hover:underline">
                    Settings
                  </Link>{' '}
                  page. Choose to share your scores or appear anonymously.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info for unauthenticated users */}
      {!isAuthenticated && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Privacy First</p>
                <p>
                  All rankings are anonymized. Sign in to see your own rank and compare with friends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RankingsList({
  rankings,
  isLoading,
  sortBy,
  emptyMessage,
}: {
  rankings: RankingsData | null;
  isLoading: boolean;
  sortBy: SortOption;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rankings || rankings.rankings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leaderboard</CardTitle>
        <CardDescription>
          {rankings.totalParticipants} founders ranked by{' '}
          {sortBy === 'unique' ? 'unique time' : sortBy === 'delegation' ? 'delegation score' : 'planning score'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rankings.rankings.map((entry, index) => (
            <div
              key={`${entry.displayName}-${entry.rank}-${index}`}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg transition-colors',
                entry.isCurrentUser
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50'
              )}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-10">
                {entry.rank <= 3 ? (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      entry.rank === 1 && 'bg-yellow-500/20',
                      entry.rank === 2 && 'bg-gray-400/20',
                      entry.rank === 3 && 'bg-amber-600/20'
                    )}
                  >
                    {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                    {entry.rank === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                    {entry.rank === 3 && <Award className="h-4 w-4 text-amber-600" />}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground font-medium">#{entry.rank}</span>
                )}
              </div>

              {/* Name and badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium truncate',
                      entry.isCurrentUser && 'text-primary'
                    )}
                  >
                    {entry.displayName}
                  </span>
                  {entry.isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                  {entry.isContact && !entry.isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      Friend
                    </Badge>
                  )}
                  {entry.isTeammate && (
                    <Badge variant="outline" className="text-xs">
                      Team
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scores - Order: Unique Time, Delegation, Planning */}
              <div className="flex items-center gap-4 text-sm">
                {/* Unique Time */}
                <div className="text-right min-w-[70px]">
                  <p className="text-muted-foreground text-xs flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    Unique
                  </p>
                  {entry.isHidden ? (
                    <div className="flex items-center gap-1 text-muted-foreground justify-end">
                      <Eye className="h-3 w-3" />
                      <span>Hidden</span>
                    </div>
                  ) : (
                    <p className={cn(
                      'font-semibold font-mono',
                      sortBy === 'unique' && 'text-primary'
                    )}>
                      {formatMinutesToHHMM(entry.uniqueTimeMinutes)}
                    </p>
                  )}
                </div>

                {/* Delegation (Efficiency) */}
                <div className="text-right min-w-[70px]">
                  <p className="text-muted-foreground text-xs flex items-center gap-1 justify-end">
                    <TrendingUp className="h-3 w-3" />
                    Delegation
                  </p>
                  {entry.isHidden ? (
                    <div className="flex items-center gap-1 text-muted-foreground justify-end">
                      <Eye className="h-3 w-3" />
                      <span>Hidden</span>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        'font-semibold',
                        sortBy === 'delegation' && entry.efficiencyScore !== null &&
                          entry.efficiencyScore >= 70 &&
                          'text-green-600',
                        sortBy === 'delegation' && entry.efficiencyScore !== null &&
                          entry.efficiencyScore >= 40 &&
                          entry.efficiencyScore < 70 &&
                          'text-yellow-600',
                        sortBy === 'delegation' && entry.efficiencyScore !== null &&
                          entry.efficiencyScore < 40 &&
                          'text-red-600',
                        sortBy === 'delegation' && 'text-primary',
                        sortBy !== 'delegation' && 'text-muted-foreground'
                      )}
                    >
                      {entry.efficiencyScore !== null ? `${Math.round(entry.efficiencyScore)}%` : '---'}
                    </p>
                  )}
                </div>

                {/* Planning */}
                <div className="text-right min-w-[70px]">
                  <p className="text-muted-foreground text-xs flex items-center gap-1 justify-end">
                    <Trophy className="h-3 w-3" />
                    Planning
                  </p>
                  {entry.isHidden ? (
                    <div className="flex items-center gap-1 text-muted-foreground justify-end">
                      <Eye className="h-3 w-3" />
                      <span>Hidden</span>
                    </div>
                  ) : (
                    <p className={cn(
                      'font-semibold',
                      sortBy === 'planning' && entry.planningScore !== null &&
                        entry.planningScore >= 70 &&
                        'text-green-600',
                      sortBy === 'planning' && entry.planningScore !== null &&
                        entry.planningScore >= 40 &&
                        entry.planningScore < 70 &&
                        'text-yellow-600',
                      sortBy === 'planning' && entry.planningScore !== null &&
                        entry.planningScore < 40 &&
                        'text-red-600',
                      sortBy === 'planning' && 'text-primary',
                      sortBy !== 'planning' && 'text-muted-foreground'
                    )}>
                      {entry.planningScore !== null ? `${Math.round(entry.planningScore)}%` : '---'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
