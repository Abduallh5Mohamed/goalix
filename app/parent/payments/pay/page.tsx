"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockSubscriptions, mockInvoices, mockPlayers } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard,
  Lock,
  CheckCircle2,
  Shield,
  Smartphone,
} from "lucide-react";

export default function ParentPayNowPage() {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const pendingInvoices = mockInvoices.filter(
    (i) => i.parentId === "pa1" && (i.status === "pending" || i.status === "overdue")
  );
  const sub = mockSubscriptions.find((s) => s.playerId === "p1");
  const totalDue = pendingInvoices.reduce((acc, i) => acc + i.amount, 0);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pay Now"
          breadcrumbs={[
            { label: "Home", href: "/parent/home" },
            { label: "Payments" },
            { label: "Pay Now" },
          ]}
        />
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-4 p-12">
            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground">
              {formatCurrency(totalDue)} has been processed
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation will be sent to your email
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay Now"
        description="Make a payment for your child's subscription"
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Payments" },
          { label: "Pay Now" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method Selection */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "card", label: "Credit Card", icon: CreditCard },
                  { id: "mobile", label: "Mobile Wallet", icon: Smartphone },
                  { id: "bank", label: "Bank Transfer", icon: Shield },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border/30 hover:border-border"
                    }`}
                  >
                    <method.icon
                      className={`h-6 w-6 ${
                        paymentMethod === method.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card Details */}
          {paymentMethod === "card" && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Card Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-sm">Card Number</Label>
                  <Input placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-sm">Expiry</Label>
                    <Input placeholder="MM/YY" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm">CVV</Label>
                    <Input placeholder="123" type="password" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Name on Card</Label>
                  <Input placeholder="Hassan Ibrahim" />
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "mobile" && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Mobile Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-sm">Provider</Label>
                  <Select defaultValue="vodafone">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="etisalat">Etisalat Cash</SelectItem>
                      <SelectItem value="fawry">Fawry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Phone Number</Label>
                  <Input placeholder="+20 10x xxx xxxx" />
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "bank" && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Bank Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <p className="font-medium">CIB (Commercial International Bank)</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono font-medium">1234567890123456</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">Goalix Sports Academy</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  After transferring, please upload the receipt or contact us for
                  confirmation.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-6 border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    Invoice #{inv.id.slice(-4)}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(inv.amount)}
                  </span>
                </div>
              ))}
              {pendingInvoices.length === 0 && sub && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {sub.plan} Plan
                  </span>
                  <span className="font-medium">
                    {formatCurrency(sub.amount)}
                  </span>
                </div>
              )}
              <div className="border-t border-border/30 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totalDue || sub?.amount || 0)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePay}
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay {formatCurrency(totalDue || sub?.amount || 0)}
                  </>
                )}
              </Button>
              <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3" />
                Secure 256-bit encrypted payment
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
