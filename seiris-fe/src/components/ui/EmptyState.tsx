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
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700/40 bg-transparent px-6 py-12 text-center transition hover:border-gray-700/60">
      {Icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-accent/5">
          <Icon className="size-7 text-accent/60" />
        </div>
      )}
      {title && <h3 className="mb-1.5 text-base font-semibold text-white">{title}</h3>}
      <p className="max-w-xs text-sm leading-relaxed text-gray-600">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
