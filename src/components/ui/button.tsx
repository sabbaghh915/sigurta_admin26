import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
          variant === "default" &&
            "bg-primary text-white hover:bg-primary/90",
          variant === "outline" &&
            "border border-gray-300 bg-white hover:bg-gray-100",
          variant === "destructive" &&
            "bg-red-600 text-white hover:bg-red-700",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
