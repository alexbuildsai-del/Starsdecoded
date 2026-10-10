import { forwardRef, useId, type ComponentPropsWithoutRef } from "react";
import { ChevronDown } from "lucide-react";
import { FIELD_EDGE, FIELD_LABEL } from "@/ds/atoms/Input";
import { cn } from "@/lib/utils";

export interface SelectProps extends ComponentPropsWithoutRef<"select"> {
  label?: string;
}

// The browser's own list opens, so a phone gets its wheel and the keyboard and screen readers keep the native behaviour (ADR-439).
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, id, className, children, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const control = (
    <span className="relative block min-w-0">
      <select
        ref={ref}
        id={fieldId}
        className={cn("block h-11 w-full min-w-0 appearance-none truncate pl-3.5 pr-10 text-base", FIELD_EDGE, className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
  if (!label) return control;
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={fieldId} className={FIELD_LABEL}>
        {label}
      </label>
      {control}
    </div>
  );
});
