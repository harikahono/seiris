import type { ComponentType } from "react";

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-card p-8 text-center">
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-800">
          <Icon className="size-6 text-gray-500" />
        </div>
      )}
      {title && <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>}
      <p className="max-w-xs text-sm text-gray-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
