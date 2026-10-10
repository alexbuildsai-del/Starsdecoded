import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The design system's text styles are font sizes; unknown to the merge they read as colours, and a colour after one dropped it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "hero", "section", "page-title", "sheet-title", "card-title", "card-title-sm", "lede", "prose", "ui", "small",
            "caption", "button", "button-compact", "kicker", "label", "data", "data-sm", "stat",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
