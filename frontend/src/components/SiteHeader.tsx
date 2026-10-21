import { listStorage } from '../utils/listStorage'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <a
      href="/"
      className={`flex items-center gap-2.5 font-display font-semibold text-[22px] tracking-tight no-underline hover:text-ink ${className}`}
    >
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" className="fill-ink" />
        <rect x="14" y="17" width="36" height="5" className="fill-ground" />
        <rect x="14" y="29" width="36" height="5" className="fill-ground" />
        <rect x="14" y="41" width="22" height="5" className="fill-accent" />
      </svg>
      BlindList
    </a>
  )
}

export function SiteHeader() {
  const count = listStorage.getCount()
  const link = 'text-[15px] font-medium no-underline hover:text-muted'
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-7">
      <Logo />
      <nav className="flex flex-wrap gap-x-7 gap-y-2" aria-label="Main">
        <a href="/my-lists" className={link}>
          My lists{count > 0 && ` (${count})`}
        </a>
        <a href="/find-lists" className={link}>Find my lists</a>
        <a href="/guides/" className={link}>Guides</a>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 pb-12">
      <p className="max-w-3xl text-sm text-muted mb-4">
        BlindList is free. When a buyer opens an Amazon link that doesn't already include an
        affiliate tag, we add ours, so we earn a small commission at no cost to you. Existing
        tags are left alone, prices and lists never change, and list creators always see their
        original links. As an Amazon Associate I earn from qualifying purchases.
      </p>
      <div className="flex gap-6 text-sm">
        <a href="/guides/">Gift guides</a>
        <a href="/privacy/">Privacy</a>
      </div>
    </footer>
  )
}
