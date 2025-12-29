"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_callback_error") {
      setError("There was a problem signing you in. Please try again.");
      return;
    }
    if (errorParam === "unauthorized") {
      setError("This account is not authorized to access Anchored.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Click the link in your email to sign in.</p>
          <Button
            variant="link"
            className="mt-4"
            onClick={() => {
              setIsSuccess(false);
              setEmail("");
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome to Anchored</CardTitle>
        <CardDescription>
          Enter your email to receive a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send magic link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome to Anchored</CardTitle>
        <CardDescription>
          Enter your email to receive a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" disabled />
          </div>
          <Button className="w-full" disabled>
            Send magic link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
