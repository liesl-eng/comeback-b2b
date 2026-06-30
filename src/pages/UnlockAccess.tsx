import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import comebackLogo from "@/assets/comeback-goods-logo.png";

const UnlockAccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { user, loading, isApproved, approvalLoading, unlockWithCode, signOut } = useAuth();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isApproved) {
      navigate(redirectTo, { replace: true });
    }
  }, [isApproved, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    const ok = await unlockWithCode(trimmed);
    setSubmitting(false);
    if (!ok) {
      setError("That code doesn't look right. Check your email or contact us at liesl@comebackgoods.com");
      return;
    }
    toast({ title: "Pricing unlocked", description: "Welcome to Comeback Goods B2B." });
    navigate(redirectTo, { replace: true });
  };

  if (loading || approvalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <Link to="/" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:text-accent hover:bg-primary/50">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <div className="flex flex-col items-center mb-8">
        <img src={comebackLogo} alt="Comeback Goods" className="h-16 w-16 rounded-full object-cover mb-4" />
        <h1 className="text-3xl font-bold text-primary-foreground">Enter Your Access Code</h1>
        <p className="text-primary-foreground/70 mt-2 text-center max-w-md">
          Enter the code we sent you to unlock B2B pricing. You'll create an account when you're ready to place an order.
        </p>
      </div>

      <Card className="w-full max-w-md border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            Access Code
          </CardTitle>
          <CardDescription>Provided by Comeback Goods.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="XXXXXXXX"
              maxLength={32}
              autoFocus
              className="text-center text-lg tracking-[0.3em] font-mono uppercase"
              disabled={submitting}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Unlocking...</>
              ) : (
                "Unlock Pricing"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have a code? Email{" "}
              <a href="mailto:liesl@comebackgoods.com" className="text-accent underline">liesl@comebackgoods.com</a>
            </p>
            {user && (
              <button
                type="button"
                onClick={async () => { await signOut(); navigate("/"); }}
                className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline"
              >
                Sign out
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnlockAccess;
