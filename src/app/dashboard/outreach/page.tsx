"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { formatDate } from "@/lib/format-date";
import { getStatusBadgeClass } from "@/lib/relevance-styles";

interface EmailDraft {
  id: string;
  filingId: string;
  recipientName: string | null;
  recipientTitle: string | null;
  recipientEmail: string | null;
  subject: string | null;
  body: string | null;
  followUpSequence: Array<{ delayDays: number; subject: string; body: string }> | null;
  referencedClients: string[] | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  companyName: string | null;
  filingDate: string | null;
}

interface DraftsResponse {
  drafts: EmailDraft[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const statusTabs = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "archived", label: "Archived" },
];

export default function OutreachPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("status", activeTab);
      }
      params.set("limit", "25");
      params.set("offset", (page * 25).toString());

      const response = await fetch(`/api/edgar/email/drafts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load drafts");
      }
      const data: DraftsResponse = await response.json();
      setDrafts(data.drafts);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      console.error("Error fetching drafts:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    if (session) {
      fetchDrafts();
    }
  }, [session, fetchDrafts]);

  const handleCopyEmail = async (draft: EmailDraft) => {
    if (!draft.body) return;
    const fullEmail = `Subject: ${draft.subject || "(No Subject)"}\n\n${draft.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopiedId(draft.id);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (draftId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/edgar/email/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      toast.success(`Marked as ${newStatus}`);
      fetchDrafts();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDraft) return;
    setIsUpdating(true);
    try {
      const response = await fetch("/api/edgar/email/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDraft.id,
          subject: editingDraft.subject,
          body: editingDraft.body,
          recipientName: editingDraft.recipientName,
          recipientEmail: editingDraft.recipientEmail,
        }),
      });
      if (!response.ok) throw new Error("Failed to save changes");
      toast.success("Draft updated");
      setEditingDraft(null);
      fetchDrafts();
    } catch (err) {
      console.error("Error saving draft:", err);
      toast.error("Failed to save changes");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/edgar/email/drafts?id=${draftToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete draft");
      toast.success("Draft deleted");
      setDeleteDialogOpen(false);
      setDraftToDelete(null);
      setExpandedDraft(null);
      fetchDrafts();
    } catch (err) {
      console.error("Error deleting draft:", err);
      toast.error("Failed to delete draft");
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteDialog = (draftId: string) => {
    setDraftToDelete(draftId);
    setDeleteDialogOpen(true);
  };

  if (!sessionPending && !session) {
    return (
      <div className="mx-auto mt-16 max-w-lg space-y-6 px-4 text-center">
        <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-[0.15rem]">
          <Mail className="text-primary h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign in to access Outreach</h2>
          <p className="text-muted-foreground">
            Email drafts and outreach tools are only available to signed-in users.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Create free account
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
      <div className="border-border mb-2 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Mail className="text-primary h-5 w-5" />
            Outreach
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-widest uppercase">
            AI-generated email drafts for your leads
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchDrafts()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="border-border flex items-center gap-2 border-b pb-3">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab(tab.value);
              setPage(0);
              setExpandedDraft(null);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchDrafts}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 font-medium">No email drafts yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Generate email drafts from filing detail pages to see them here.
            </p>
            <Link href="/dashboard/filings">
              <Button>Browse Filings</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Card key={draft.id} className="overflow-hidden">
              <button
                className="hover:bg-muted/50 focus-visible:ring-ring w-full p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                aria-expanded={expandedDraft === draft.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate font-medium">
                        {draft.companyName || "Unknown Company"}
                      </span>
                      <Badge variant="outline" className={getStatusBadgeClass(draft.status)}>
                        {draft.status || "draft"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {draft.subject || "(No Subject)"}
                    </p>
                    <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                      {draft.recipientName && <span>To: {draft.recipientName}</span>}
                      {draft.filingDate && <span>Filing: {formatDate(draft.filingDate)}</span>}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {expandedDraft === draft.id ? (
                      <ChevronUp className="text-muted-foreground h-5 w-5" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-5 w-5" />
                    )}
                  </div>
                </div>
              </button>

              {expandedDraft === draft.id && (
                <div className="bg-muted/30 space-y-4 border-t px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">Recipient</Label>
                      <p className="font-medium">
                        {draft.recipientName}
                        {draft.recipientTitle && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            ({draft.recipientTitle})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Company</Label>
                      <p className="font-medium">{draft.companyName}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Subject</Label>
                    <p className="font-medium">{draft.subject}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Body</Label>
                    <div className="bg-background mt-1 rounded-[0.15rem] border p-3 text-sm whitespace-pre-wrap">
                      {draft.body}
                    </div>
                  </div>

                  {draft.followUpSequence && draft.followUpSequence.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        Follow-ups ({draft.followUpSequence.length})
                      </Label>
                      <div className="mt-2 space-y-2">
                        {draft.followUpSequence.map((followUp, idx) => (
                          <div
                            key={idx}
                            className="bg-background rounded-[0.15rem] border p-2 text-sm"
                          >
                            <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                              <span className="font-medium">Day {followUp.delayDays}</span>
                              <span>—</span>
                              <span className="truncate">{followUp.subject}</span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{followUp.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {draft.referencedClients && draft.referencedClients.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Referenced Clients</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {draft.referencedClients.map((client, idx) => (
                          <Badge key={idx} variant="secondary">
                            {client}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopyEmail(draft)}>
                      {copiedId === draft.id ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copy Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDraft(draft)}>
                      Edit
                    </Button>
                    {draft.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(draft.id, "sent")}
                        disabled={isUpdating}
                      >
                        Mark as Sent
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/filings/${draft.filingId}`)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Filing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(draft.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || isLoading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!hasMore || isLoading}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editingDraft} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
            <DialogDescription>Make changes to the email draft</DialogDescription>
          </DialogHeader>
          {editingDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-recipient-name">Recipient Name</Label>
                  <Input
                    id="edit-recipient-name"
                    value={editingDraft.recipientName || ""}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, recipientName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-recipient-email">Recipient Email</Label>
                  <Input
                    id="edit-recipient-email"
                    value={editingDraft.recipientEmail || ""}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, recipientEmail: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-subject">Subject</Label>
                <Input
                  id="edit-subject"
                  value={editingDraft.subject || ""}
                  onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-body">Body</Label>
                <Textarea
                  id="edit-body"
                  value={editingDraft.body || ""}
                  onChange={(e) => setEditingDraft({ ...editingDraft, body: e.target.value })}
                  rows={10}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDraft(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email draft? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDraft} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
