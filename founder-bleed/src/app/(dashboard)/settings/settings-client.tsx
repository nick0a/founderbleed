"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsClient({ user, initialContacts }: any) {
  const [username, setUsername] = useState(user.username || '');
  const [contacts, setContacts] = useState(initialContacts || []);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleSave = async () => {
      // Call update API
      alert("Saved!");
  };

  const handleInvite = async () => {
      // Call invite API
      alert(`Invited ${inviteEmail}`);
      setInviteEmail('');
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Tabs defaultValue="account">
        <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="team">Team & Rates</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
            <Card>
                <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Email</Label>
                        <Input value={user.email} disabled />
                    </div>
                    <div>
                        <Label>Username</Label>
                        <Input value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <Button onClick={handleSave}>Save Changes</Button>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="team">
            <Card>
                <CardHeader><CardTitle>Team Composition</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Manage your team structure and compensation rates here.</p>
                    {/* Reuse team comp component logic if abstracted */}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="contacts">
            <Card>
                <CardHeader><CardTitle>Contacts Leaderboard</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Invite by email..." 
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                        <Button onClick={handleInvite}>Invite</Button>
                    </div>
                    
                    <div className="border rounded-md p-4">
                        <h4 className="font-bold mb-4">Your Network</h4>
                        {contacts.length === 0 ? (
                            <p className="text-muted-foreground">No contacts yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {contacts.map((c: any) => (
                                    <li key={c.id} className="flex justify-between">
                                        <span>{c.contactEmail || "User"}</span>
                                        <span className="capitalize text-sm">{c.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
