import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, Plus, Copy, Ban } from "lucide-react";

interface AccessCode {
  id: string;
  code: string;
  assigned_to_email: string | null;
  status: "unused" | "used" | "revoked";
  used_by_user_id: string | null;
  used_at: string | null;
  created_at: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export default function AdminAccessCodes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTo, setAssignTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [redemptionEmails, setRedemptionEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!user) { setChecking(false); setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(data === true);
      setChecking(false);
    })();
  }, [user]);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load codes", description: error.message, variant: "destructive" });
    } else {
      setCodes((data as AccessCode[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadCodes();
  }, [isAdmin, loadCodes]);

  const handleCreate = async () => {
    setCreating(true);
    // Try a few times to avoid rare collisions
    for (let i = 0; i < 5; i++) {
      const code = generateCode();
      const { error } = await supabase.from("access_codes").insert({
        code,
        assigned_to_email: assignTo.trim() || null,
      });
      if (!error) {
        toast({ title: "Code created", description: code });
        setAssignTo("");
        await loadCodes();
        setCreating(false);
        return;
      }
      if (!error.message.toLowerCase().includes("unique")) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        setCreating(false);
        return;
      }
    }
    setCreating(false);
    toast({ title: "Failed", description: "Could not generate unique code", variant: "destructive" });
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("access_codes").update({ status: "revoked" }).eq("id", id);
    if (error) {
      toast({ title: "Failed to revoke", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code revoked" });
      await loadCodes();
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: code });
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-16 px-4 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <Button onClick={() => navigate("/")} className="mt-4">Back home</Button>
        </main>
      </div>
    );
  }

  const statusBadge = (s: AccessCode["status"]) => {
    if (s === "used") return <Badge className="bg-green-600 hover:bg-green-600">Used</Badge>;
    if (s === "revoked") return <Badge variant="destructive">Revoked</Badge>;
    return <Badge variant="secondary">Unused</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Access Codes</h1>
        <p className="text-muted-foreground mb-6">Generate, distribute, and manage buyer access codes.</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate New Code</CardTitle>
            <CardDescription>Optionally note the email you plan to send it to.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="assigned to (email, optional)"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={handleCreate} disabled={creating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Generate Code</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Codes ({codes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Used At</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No codes yet.</TableCell></TableRow>
                  ) : codes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">{c.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.assigned_to_email || "—"}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.used_by_user_id ? c.used_by_user_id.slice(0, 8) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.used_at ? new Date(c.used_at).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(c.code)} title="Copy code">
                            <Copy className="h-4 w-4" />
                          </Button>
                          {c.status !== "revoked" && (
                            <Button variant="ghost" size="sm" onClick={() => handleRevoke(c.id)} title="Revoke" className="text-destructive hover:text-destructive">
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
