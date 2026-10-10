import * as React from "react";
import * as P from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Menu = P.Root;
export const MenuTrigger = P.Trigger;
export const MenuGroup = P.Group;
export const MenuPortal = P.Portal;
export const MenuSub = P.Sub;
export const MenuRadioGroup = P.RadioGroup;

// Rows reach 44 px so a thumb finds them; the highlight is the one hovered state, and a keyboard focus lands on it too.
const ROW =
  "relative flex min-h-11 cursor-default select-none items-center gap-2 rounded-inner px-3 py-2 text-sm text-paper outline-none transition-colors duration-[var(--dur-fast)] ease-[var(--ease)] data-[highlighted]:bg-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0";

const PANEL =
  "z-50 min-w-[8rem] overflow-hidden rounded-card border border-line bg-raised p-1 text-paper shadow-raised";

const MOTION =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none";

export const MenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof P.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof P.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <P.SubTrigger ref={ref} className={cn(ROW, "data-[state=open]:bg-surface", inset && "pl-8", className)} {...props}>
    {children}
    <ChevronRight className="ml-auto" />
  </P.SubTrigger>
));
MenuSubTrigger.displayName = P.SubTrigger.displayName;

export const MenuSubContent = React.forwardRef<
  React.ElementRef<typeof P.SubContent>,
  React.ComponentPropsWithoutRef<typeof P.SubContent>
>(({ className, ...props }, ref) => (
  <P.SubContent ref={ref} className={cn(PANEL, MOTION, className)} {...props} />
));
MenuSubContent.displayName = P.SubContent.displayName;

export const MenuContent = React.forwardRef<
  React.ElementRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <P.Portal>
    <P.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(PANEL, "max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto", MOTION, className)}
      {...props}
    />
  </P.Portal>
));
MenuContent.displayName = P.Content.displayName;

/** `danger` is the last row of a list, in the error colour. */
export const MenuItem = React.forwardRef<
  React.ElementRef<typeof P.Item>,
  React.ComponentPropsWithoutRef<typeof P.Item> & { inset?: boolean; danger?: boolean }
>(({ className, inset, danger, ...props }, ref) => (
  <P.Item ref={ref} className={cn(ROW, inset && "pl-8", danger && "text-error", className)} {...props} />
));
MenuItem.displayName = P.Item.displayName;

export const MenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof P.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof P.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <P.CheckboxItem ref={ref} className={cn(ROW, "pl-8", className)} checked={checked} {...props}>
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <P.ItemIndicator>
        <Check className="size-4" />
      </P.ItemIndicator>
    </span>
    {children}
  </P.CheckboxItem>
));
MenuCheckboxItem.displayName = P.CheckboxItem.displayName;

export const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof P.RadioItem>,
  React.ComponentPropsWithoutRef<typeof P.RadioItem>
>(({ className, children, ...props }, ref) => (
  <P.RadioItem ref={ref} className={cn(ROW, "pl-8", className)} {...props}>
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <P.ItemIndicator>
        <Circle className="size-2 fill-current" />
      </P.ItemIndicator>
    </span>
    {children}
  </P.RadioItem>
));
MenuRadioItem.displayName = P.RadioItem.displayName;

export const MenuLabel = React.forwardRef<
  React.ElementRef<typeof P.Label>,
  React.ComponentPropsWithoutRef<typeof P.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <P.Label ref={ref} className={cn("px-3 py-1.5 font-label text-[11px] font-medium uppercase tracking-[.14em] text-paper-dim", inset && "pl-8", className)} {...props} />
));
MenuLabel.displayName = P.Label.displayName;

export const MenuSeparator = React.forwardRef<
  React.ElementRef<typeof P.Separator>,
  React.ComponentPropsWithoutRef<typeof P.Separator>
>(({ className, ...props }, ref) => (
  <P.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-line-soft", className)} {...props} />
));
MenuSeparator.displayName = P.Separator.displayName;

export const MenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest text-paper-dim", className)} {...props} />
);
MenuShortcut.displayName = "MenuShortcut";

export {
  Menu as DropdownMenu,
  MenuTrigger as DropdownMenuTrigger,
  MenuContent as DropdownMenuContent,
  MenuItem as DropdownMenuItem,
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuRadioItem as DropdownMenuRadioItem,
  MenuLabel as DropdownMenuLabel,
  MenuSeparator as DropdownMenuSeparator,
  MenuShortcut as DropdownMenuShortcut,
  MenuGroup as DropdownMenuGroup,
  MenuPortal as DropdownMenuPortal,
  MenuSub as DropdownMenuSub,
  MenuSubContent as DropdownMenuSubContent,
  MenuSubTrigger as DropdownMenuSubTrigger,
  MenuRadioGroup as DropdownMenuRadioGroup,
};
