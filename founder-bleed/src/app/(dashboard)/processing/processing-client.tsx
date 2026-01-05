"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useRouter } from 'next/navigation';

export default function ProcessingClient({ user }: any) {
  const router = useRouter();
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Form State
  const [teamComposition, setTeamComposition] = useState(user.teamComposition || { founder: 1 });
  const [compensation, setCompensation] = useState(user.salaryAnnual || '');
  const [compMode, setCompMode] = useState(user.salaryInputMode || 'annual');

  // Simulate processing
  useEffect(() => {
    const timer = setInterval(() => {
        setProcessingProgress(old => {
            if (old >= 100) {
                clearInterval(timer);
                setIsProcessing(false);
                return 100;
            }
            return old + 5;
        });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const updateTeam = (role: string, delta: number) => {
    setTeamComposition((prev: any) => ({
        ...prev,
        [role]: Math.max(0, (prev[role] || 0) + delta)
    }));
  };

  const getTeamCount = (role: string) => teamComposition[role] || 0;

  const handleContinue = async () => {
      // Logic to save user data would go here
      router.push('/results/mock-id');
  };

  const convertComp = () => {
      const val = Number(compensation);
      if (!val) return '';
      if (compMode === 'annual') return `$${(val / 2080).toFixed(2)}/hr`;
      return `$${(val * 2080).toLocaleString()}/yr`;
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Setting up your workspace...</h1>
      
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
            <div className="flex justify-between mb-2 text-sm">
                <span>Processing calendar events...</span>
                <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} />
        </CardContent>
      </Card>

      {/* Q&A */}
      <Card>
        <CardHeader>
            <CardTitle>While we wait, tell us about your team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Team Composition */}
            <div className="space-y-4">
                <div className="flex justify-between items-center border p-3 rounded">
                    <Label>Founder (including you)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateTeam('founder', -1)}>-</Button>
                        <span className="w-4 text-center">{getTeamCount('founder')}</span>
                        <Button variant="outline" size="sm" onClick={() => updateTeam('founder', 1)}>+</Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Engineering (Left) */}
                    <div className="border p-4 rounded space-y-4">
                        <h4 className="font-bold text-sm uppercase text-muted-foreground">Engineering</h4>
                        {['Senior Engineering', 'Junior Engineering', 'QA Engineer'].map(role => {
                            const key = role.toLowerCase().replace(' ', '_');
                            return (
                                <div key={key} className="flex justify-between items-center">
                                    <Label className="text-xs">{role}</Label>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateTeam(key, -1)}>-</Button>
                                        <span className="text-xs w-3 text-center">{getTeamCount(key)}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateTeam(key, 1)}>+</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Business (Right) */}
                    <div className="border p-4 rounded space-y-4">
                        <h4 className="font-bold text-sm uppercase text-muted-foreground">Business</h4>
                        {['Senior Business', 'Junior Business', 'Executive Assistant'].map(role => {
                            const key = role.toLowerCase().replace(' ', '_');
                            return (
                                <div key={key} className="flex justify-between items-center">
                                    <Label className="text-xs">{role}</Label>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateTeam(key, -1)}>-</Button>
                                        <span className="text-xs w-3 text-center">{getTeamCount(key)}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateTeam(key, 1)}>+</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Compensation */}
            <div>
                <Label>Your Compensation</Label>
                <div className="flex gap-2 mt-2">
                    <Button variant={compMode === 'annual' ? 'default' : 'outline'} onClick={() => setCompMode('annual')}>Annual Salary</Button>
                    <Button variant={compMode === 'hourly' ? 'default' : 'outline'} onClick={() => setCompMode('hourly')}>Hourly Rate</Button>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                    <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input 
                            className="pl-6" 
                            value={compensation} 
                            onChange={(e) => setCompensation(e.target.value)} 
                            placeholder={compMode === 'annual' ? '300,000' : '150'}
                        />
                    </div>
                    {compensation && (
                        <p className="text-sm text-muted-foreground">
                            = {convertComp()}
                        </p>
                    )}
                </div>
                
                {/* Presets */}
                <div className="flex gap-2 mt-2">
                    {compMode === 'annual' ? 
                        ['300000', '500000', '800000'].map(val => (
                            <Button key={val} variant="ghost" size="sm" onClick={() => setCompensation(val)}>${Number(val)/1000}K</Button>
                        )) :
                        ['150', '250', '400'].map(val => (
                            <Button key={val} variant="ghost" size="sm" onClick={() => setCompensation(val)}>${val}</Button>
                        ))
                    }
                </div>
            </div>

            <Button className="w-full" disabled={isProcessing} onClick={handleContinue}>
                {isProcessing ? 'Processing...' : 'Continue to Results'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
