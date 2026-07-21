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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-accent/[0.04]">
          <Icon className="size-5 text-accent/40" />
        </div>
      )}
      {title && <h3 className="mb-1 text-sm font-medium text-white">{title}</h3>}
      <p className="max-w-xs text-sm leading-relaxed text-gray-600">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.97]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
