import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// control-edge is 3.3:1 on ground; the bare line colour (1.35:1) never carries a field.
export const FIELD_EDGE =
  "border border-control-edge bg-ground text-paper placeholder:text-muted rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-error disabled:cursor-not-allowed disabled:opacity-60";
export const FIELD_LABEL = "font-label text-label uppercase text-muted";

export interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  /** Shown above the field in the one label style. Leave it out when the page already labels the field. */
  label?: string;
  hint?: string;
  /** The line under the field; the field is marked invalid while it is set. */
  error?: string;
  /** Slot beside the field (InputWithButton). It drops under the field below 640 px. */
  beside?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, beside, id, className, "aria-describedby": describedBy, "aria-invalid": invalid, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const described = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  // 16 px at every width, so a phone never zooms into the field (ADR-171).
  const field = (
    <input
      ref={ref}
      id={fieldId}
      aria-invalid={error ? true : invalid}
      aria-describedby={described}
      className={cn(
        "block h-12 w-full min-w-0 px-3.5 text-base",
        FIELD_EDGE,
        beside ? "sm:flex-1" : null,
        className,
      )}
      {...rest}
    />
  );

  if (!label && !hint && !error && !beside) return field;

  return (
    <div className="grid min-w-0 gap-2">
      {label && (
        <label htmlFor={fieldId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      {beside ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {field}
          <div className="w-full sm:w-auto sm:flex-none [&>*]:h-12 [&>*]:w-full sm:[&>*]:w-auto">{beside}</div>
        </div>
      ) : (
        field
      )}
      {hint && (
        <p id={hintId} className="text-[12px] leading-normal text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] leading-snug text-error">
          {error}
        </p>
      )}
    </div>
  );
});
