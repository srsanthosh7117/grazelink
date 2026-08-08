import { IconType } from 'react-icons';

interface EmptyStateProps {
  icon: IconType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white px-6 py-16 text-center shadow-soft dark:border-white/10 dark:bg-dark-card dark:shadow-dark-card">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary dark:bg-primary/20 dark:text-primary-light">
        <Icon />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted dark:text-dark-muted">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition-all hover:scale-105 hover:bg-primary-dark"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
