import { Link } from 'react-router-dom';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        ← Back to Home
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-ink">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This is placeholder legal copy. Replace with your actual privacy
        policy covering what farm and livestock data GrazeLink collects, how
        GPS data is stored, and how users can request deletion of their data.
      </p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms and Conditions">
      <p>
        This is placeholder legal copy. Replace with your actual terms of
        service covering account usage, device ownership, subscription
        billing, and acceptable use of the GrazeLink platform.
      </p>
    </LegalPage>
  );
}
