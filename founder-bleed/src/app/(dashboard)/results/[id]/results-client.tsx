"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Check, Copy } from "lucide-react";

export default function ResultsClient({ auditRun, user, events, recommendations }: any) {
  const [username, setUsername] = useState(user.username || user.name || "Founder");
  const [localRecs, setLocalRecs] = useState(recommendations);
  
  // Persist username
  useEffect(() => {
    const storedName = localStorage.getItem('username');
    if (storedName) setUsername(storedName);
  }, []);

  const handleNameChange = (e: any) => {
    const name = e.target.value;
    setUsername(name);
    localStorage.setItem('username', name);
  };

  // Metrics (simplified for display)
  const metrics = auditRun.computedMetrics || {};
  const arbitrage = metrics.arbitrage;
  const efficiency = metrics.efficiencyScore || 0;
  const planning = auditRun.planningScore || 0;
  const reclaimable = metrics.reclaimableHours || 0;

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined) return "Set compensation";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: user.currency || 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-3xl font-bold">
          <span>Audit for</span>
          <Input 
            value={username} 
            onChange={handleNameChange}
            className="w-auto text-3xl font-bold border-none hover:border-solid px-0 h-auto"
          />
        </div>
        <h2 className="text-xl text-muted-foreground">
          {username}, You're Losing <span className="text-red-500 font-bold">{formatCurrency(arbitrage)}</span> Every Year...
        </h2>
        {arbitrage === null && <p className="text-sm text-yellow-500">Set compensation to view costs</p>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Annual Arbitrage</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(arbitrage)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Reclaimable Hours</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{reclaimable} hrs/week</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Efficiency Score</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{efficiency}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Planning Score</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{planning}%</div></CardContent>
        </Card>
      </div>

      {/* Role Recommendations */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Recommended Hires</h3>
        <div className="grid gap-4">
          {localRecs.map((rec: any, idx: number) => (
            <Card key={rec.id} className="relative group">
              <CardHeader className="flex flex-row items-center gap-4">
                {localRecs.length > 1 && (
                  <div className="cursor-move" title="Drag to reorder">
                    <GripVertical className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle>{rec.roleTitle}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{rec.roleTier}</Badge>
                    <Badge variant="outline">{rec.businessArea}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(Number(rec.costAnnual))} / yr</div>
                  <div className="text-sm text-muted-foreground">{rec.hoursPerWeek} hrs/week</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-semibold mb-2">Tasks You'll Take Over</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {(rec.tasksList || []).map((t: any, i: number) => (
                      <li key={i}>{t.task} ({t.hoursPerWeek} hrs/week)</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(rec, null, 2))}>
                      <Copy className="h-4 w-4 mr-2" /> Copy JD
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Table (Simplified) */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Event Log</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.slice(0, 50).map((event: any) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{event.durationMinutes} min</TableCell>
                <TableCell>
                  <Badge>{event.finalTier || event.suggestedTier}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => {}}>
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
