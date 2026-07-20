import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  xs: { container: "size-6", text: "text-[9px]" },
  sm: { container: "size-7", text: "text-[10px]" },
  md: { container: "size-8", text: "text-xs" },
  lg: { container: "size-10", text: "text-sm" },
} as const;

interface Props {
  user: { name: string; profile_photo_url?: string | null };
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

export default function UserAvatar({ user, size = "md", className }: Props) {
  const [imgError, setImgError] = useState(false);
  const s = SIZE_MAP[size];
  const photoUrl = user.profile_photo_url ?? undefined;

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={user.name}
        onError={() => setImgError(true)}
        className={cn("shrink-0 rounded-full object-cover", s.container, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-accent/15 font-bold text-accent",
        s.container, s.text, className
      )}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}
