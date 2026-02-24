export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-col items-center gap-2">
        <p>FormD Scout &mdash; SEC EDGAR Form D Filing Monitor</p>
        <a 
          href="https://zerodraft.studio" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] opacity-20 hover:opacity-100 transition-opacity"
        >
          zerodraft.studio
        </a>
      </div>
    </footer>
  );
}
