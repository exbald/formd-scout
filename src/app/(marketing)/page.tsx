import Link from "next/link";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Ingest",
    body: "Form D filings are pulled from SEC EDGAR as they land — typically two to three weeks before a press release.",
  },
  {
    n: "02",
    title: "Score",
    body: "Each issuer is scored for commercial real estate relevance against your markets, clients, and mandate.",
  },
  {
    n: "03",
    title: "Outreach",
    body: "Research the company, then send a precise note while they are still deciding where to put the new capital to work.",
  },
];

const previewRows = [
  { company: "Northline Robotics", amount: "$12.4M", score: "86", market: "Austin" },
  { company: "Harbor & Pine Labs", amount: "$8.1M", score: "74", market: "Denver" },
  { company: "Vellum Health", amount: "$21.0M", score: "68", market: "Boston" },
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="container mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <p className="text-highlight mb-6 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
          SEC Form D intelligence
        </p>
        <h1 className="font-display max-w-3xl text-5xl leading-[1.08] tracking-tight text-foreground italic sm:text-6xl lg:text-7xl">
          Funding intelligence, before the press release.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
          FormD Scout watches private placements so commercial real estate brokers can reach
          recently funded companies while the raise is still quiet.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/register">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Open the desk</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border bg-card/60">
        <div className="container mx-auto grid gap-10 px-6 py-16 md:grid-cols-3 md:gap-12">
          {steps.map((step) => (
            <div key={step.n}>
              <p className="text-highlight font-mono text-[11px] tracking-[0.22em]">{step.n}</p>
              <h2 className="font-display mt-3 text-2xl italic">{step.title}</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-highlight mb-4 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
              The desk
            </p>
            <h2 className="font-display text-4xl tracking-tight italic sm:text-5xl">
              A quiet view of the market.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
              Scores, offering sizes, and markets on one surface. No noise, no chrome — just the
              issuers worth a conversation.
            </p>
          </div>

          <div className="card-lift rounded-xl border border-border bg-card p-6 shadow-[0_20px_50px_hsl(25_18%_12%/0.08)]">
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { label: "Today", value: "12" },
                { label: "High signal", value: "7" },
                { label: "Avg round", value: "$4.2M" },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className={`rounded-lg border border-border bg-background px-3 py-4 ${index < 2 ? "signal-card" : ""}`}
                >
                  <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-mono text-xl">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {previewRows.map((row) => (
                <div key={row.company} className="flex items-baseline justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.company}</p>
                    <p className="text-muted-foreground font-mono text-[11px]">{row.market}</p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-4">
                    <span className="font-mono text-sm">{row.amount}</span>
                    <span className="text-highlight font-mono text-sm">{row.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container mx-auto px-6 py-20 text-center sm:py-24">
          <h2 className="font-display text-4xl tracking-tight italic sm:text-5xl">
            Arrive before the announcement.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg">
            Set your markets once. Scout will score every new Form D against them.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/register">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
