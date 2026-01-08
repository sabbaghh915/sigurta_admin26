import { cn } from "../../lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs text-white",
        className
      )}
      {...props}
    />
  );
}
