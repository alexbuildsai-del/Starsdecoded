# Menu

A raised list of actions that opens from a button: the account menu, more options on a person in Share, the site phone menu.

- Built on Radix `DropdownMenu`. Parts: `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuLabel`, `MenuSeparator`, plus check, radio and sub-menu rows.
- States: closed (the trigger alone), open, hovered or keyboard-focused (`surface` fill), disabled (half strength, no pointer).
- Rows are 44 px tall. Danger goes last, with `<MenuItem danger>`, in `error`.
- Two to seven actions about one thing; no icons on every row; no menu inside a menu.
- The old names (`DropdownMenu`, `DropdownMenuItem`, ...) are exported from here too, and `components/ui/dropdown-menu` re-exports this file.

Fates: O25 the standard account menu; O26 becomes more options on a person in Share; O24 becomes the site phone menu (the `<details>` panel takes this look in group 3); O23 is kept as it is, its items open inline under the row.
