import { forwardRef, type ReactNode } from "react";
import { Input, type InputProps } from "@/ds/atoms/Input";

export interface InputWithButtonProps extends Omit<InputProps, "beside"> {
  /** The button, which keeps its own `type` and `onClick`: this part wires no key and no form. */
  button: ReactNode;
}

// Enter belongs to the caller (R14-12): the waitlist sits in a form so Enter joins; Share has no form
// and its Enter adds a chip, so the button is only ever pressed on purpose.
export const InputWithButton = forwardRef<HTMLInputElement, InputWithButtonProps>(function InputWithButton(
  { button, ...input },
  ref,
) {
  return <Input ref={ref} beside={button} {...input} />;
});
