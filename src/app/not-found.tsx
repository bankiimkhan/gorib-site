import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[75vh] flex-col items-center justify-center pt-24 text-center">
      <p className="text-7xl font-black tracking-tight text-white/10 sm:text-9xl" aria-hidden="true">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Lost your way?</h1>
      <p className="mt-3 max-w-md text-base text-fg-muted">
        This page may have moved, or the link is broken. There&apos;s plenty more to watch.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-primary">
          Browse home
        </Link>
        <Link href="/search" className="btn btn-secondary">
          Search
        </Link>
      </div>
    </div>
  );
}
