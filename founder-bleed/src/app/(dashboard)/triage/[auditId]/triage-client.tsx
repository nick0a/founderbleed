"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function TriageClient({ auditId, initialEvents, teamComposition }: any) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  
  // Filter leave events
  const leaveEvents = events.filter((e: any) => e.isLeave);
  const workEvents = events.filter((e: any) => !e.isLeave);

  const handleReconcile = (id: string) => {
      setEvents(events.map((e: any) => e.id === id ? { ...e, reconciled: true } : e));
      // In real implementation, call API to update event
  };

  const handleComplete = () => {
      router.push(`/results/${auditId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Review Classification</h1>
        <Button onClick={handleComplete}>Complete Review</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Work Events</CardTitle></CardHeader>
        <CardContent>
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
                {workEvents.slice(0, 50).map((event: any) => (
                  <TableRow key={event.id} className={event.reconciled ? "bg-muted/50" : ""}>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>{event.durationMinutes} min</TableCell>
                    <TableCell>
                      <Badge variant={event.reconciled ? "outline" : "default"}>
                        {event.finalTier || event.suggestedTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant={event.reconciled ? "ghost" : "default"} 
                        size="icon" 
                        onClick={() => handleReconcile(event.id)}
                        disabled={event.reconciled}
                      >
                        <Check className={`h-4 w-4 ${event.reconciled ? "text-green-500" : ""}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card className="opacity-75">
        <CardHeader><CardTitle>Leave / OOO (Excluded)</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableBody>
                    {leaveEvents.map((event: any) => (
                        <TableRow key={event.id}>
                            <TableCell>{event.title}</TableCell>
                            <TableCell>{event.durationMinutes} min</TableCell>
                            <TableCell><Badge variant="secondary">Leave</Badge></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
