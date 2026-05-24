"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    useGetPendingRegistrationsQuery,
    useApproveRegistrationMutation,
    useRejectRegistrationMutation,
} from "@/lib/store/api/registrationsApi";
import { CheckCircle2, XCircle, Clock, UserCheck, Baby, Loader2, RefreshCw } from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function RegistrationsPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectError, setRejectError] = useState("");

    const { data, isLoading, refetch } = useGetPendingRegistrationsQuery(
        statusFilter === "all" ? undefined : statusFilter
    );

    const [approveRegistration, { isLoading: isApproving }] = useApproveRegistrationMutation();
    const [rejectRegistration, { isLoading: isRejecting }] = useRejectRegistrationMutation();

    const registrations = data?.data ?? [];

    const handleApprove = async (id: string) => {
        await approveRegistration(id);
        refetch();
    };

    const openRejectDialog = (id: string) => {
        setSelectedId(id);
        setRejectionReason("");
        setRejectError("");
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setRejectError("Please enter a rejection reason.");
            return;
        }
        if (!selectedId) return;
        await rejectRegistration({ id: selectedId, reason: rejectionReason.trim() });
        setRejectDialogOpen(false);
        refetch();
    };

    const statusBadge = useCallback((status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
            case "approved":
                return <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
            case "rejected":
                return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
            default:
                return null;
        }
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Registration Requests"
                description="Review existing player and parent access requests"
                actions={
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                }
            />

            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
            </Tabs>

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading...
                </div>
            ) : registrations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 opacity-30" />
                        <p className="font-medium">No {statusFilter !== "all" ? statusFilter : ""} requests</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {registrations.map((reg: RegistrationRecord) => (
                        <Card key={reg.id} className="border-border/50">
                            <CardContent className="flex items-start justify-between gap-4 py-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                        {reg.role === "player" ? (
                                            <UserCheck className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Baby className="h-5 w-5 text-primary" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold">{reg.fullName}</p>
                                            {statusBadge(reg.status)}
                                            <Badge variant="secondary" className="capitalize text-xs">{reg.role}</Badge>
                                        </div>
                                        <p className="mt-0.5 text-sm text-muted-foreground">{reg.email ?? reg.phone}</p>
                                        {reg.role === "parent" && reg.linkedPlayerId && (
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Player ID:{" "}
                                                <span className="font-mono text-foreground">{reg.linkedPlayerId}</span>
                                                {reg.linkedPlayerName && (
                                                    <span className="text-primary ml-1">({reg.linkedPlayerName})</span>
                                                )}
                                            </p>
                                        )}
                                        {reg.rejectionReason && (
                                            <p className="mt-1 text-xs text-red-400">
                                                Rejection reason: {reg.rejectionReason}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground/60">
                                            Submitted {new Date(reg.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>

                                {reg.status === "pending" && (
                                    <div className="flex shrink-0 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                                            onClick={() => openRejectDialog(reg.id)}
                                            disabled={isApproving || isRejecting}
                                        >
                                            <XCircle className="mr-1 h-4 w-4" />
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleApprove(reg.id)}
                                            disabled={isApproving || isRejecting}
                                        >
                                            {isApproving ? (
                                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                            )}
                                            Approve
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Registration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="rejectionReason">Reason for rejection</Label>
                        <Input
                            id="rejectionReason"
                            placeholder="e.g. Incomplete information, invalid player ID..."
                            value={rejectionReason}
                            onChange={(e) => { setRejectionReason(e.target.value); setRejectError(""); }}
                        />
                        {rejectError && <p className="text-sm text-red-400">{rejectError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isRejecting}
                        >
                            {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface RegistrationRecord {
    id: string;
    email?: string;
    phone?: string;
    fullName: string;
    role: "player" | "parent";
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string | null;
    linkedPlayerId?: string | null;
    linkedPlayerName?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
}
