import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import AddGoatModal from '@/components/Dashboard/AddGoatModal';

export default function AddGoat() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/goats"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
        >
          <FiArrowLeft /> Back to Goat Management
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Add New Goat
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Register a goat and link a smart collar to begin telemetry tracking.
        </p>
      </div>

      <AddGoatModal open embedded onClose={() => navigate('/dashboard/goats')} />
    </div>
  );
}
