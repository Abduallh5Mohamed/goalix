"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/Logo.png"
          alt="GOLX"
          width={64}
          height={64}
          className="rounded-xl"
          style={{ width: "auto", height: "auto" }}
        />
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
