"use client";

import { FileText } from "lucide-react";

export default function FilingsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          SEC Form D Filings
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter Form D filings from the SEC EDGAR database
        </p>
      </div>

      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>Filings table will be implemented in an upcoming feature.</p>
      </div>
    </div>
  );
}
