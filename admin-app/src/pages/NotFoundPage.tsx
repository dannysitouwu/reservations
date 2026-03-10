import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-surface-muted px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
        404
      </div>
      <h1 className="text-3xl font-semibold text-slate-900">We couldn’t find that view</h1>
      <p className="max-w-md text-sm text-slate-500">
        The admin page you were looking for is unavailable or has been moved. Navigate back to the dashboard to
        continue managing operations.
      </p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </section>
  );
}
