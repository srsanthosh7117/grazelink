import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import AddLivestockModal from '@/components/Dashboard/AddLivestockModal';

export default function AddLivestock() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/livestock"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
        >
          <FiArrowLeft /> Back to Livestock Management
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Add New Livestock
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Register a livestock and link a smart collar to begin telemetry tracking.
        </p>
      </div>

      <AddLivestockModal open embedded onClose={() => navigate('/dashboard/livestock')} />
    </div>
  );
}
