import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

const ANCHOR_GAP = 8
const VIEWPORT_MARGIN = 8

interface TooltipProps {
  label: string
  hint?: string | undefined
  shortcut?: string
  side?: "top" | "bottom"
  /** A single element, because the wrapper has no box of its own and measures this one. */
  children: React.ReactElement
}

/** Rendered in a portal, so overflow and stacking contexts around the anchor cannot cut it off. */
const Tooltip = ({ label, hint, shortcut, side = "top", children }: TooltipProps) => {
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const tip = tipRef.current
    if (!anchor || !tip) return
    const center = anchor.left + anchor.width / 2
    const halfWidth = tip.offsetWidth / 2
    const left = Math.min(
      Math.max(center, VIEWPORT_MARGIN + halfWidth),
      window.innerWidth - VIEWPORT_MARGIN - halfWidth
    )
    tip.style.left = `${left}px`
    tip.style.top = `${side === "top" ? anchor.top - ANCHOR_GAP : anchor.bottom + ANCHOR_GAP}px`
    tip.style.setProperty("--arrow-offset", `${center - left}px`)
  }, [anchor, side])

  const show = (e: React.SyntheticEvent<HTMLElement>) =>
    setAnchor(e.currentTarget.firstElementChild?.getBoundingClientRect() ?? null)
  const hide = () => setAnchor(null)

  return (
    <span
      className="contents"
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") show(e)
      }}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) show(e)
      }}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === "Escape") hide()
      }}
    >
      {children}
      {anchor &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className={cn(
              "pointer-events-none fixed left-0 top-0 z-[100] w-max max-w-60 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 text-left shadow-xl",
              side === "top" && "-translate-y-full"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-white">{label}</span>
              {shortcut && (
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 font-sans text-[10px] text-slate-200">
                  {shortcut}
                </kbd>
              )}
            </div>
            {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</div>}
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1/2 ml-[calc(var(--arrow-offset)-0.25rem)] h-2 w-2 rotate-45 border-white/15 bg-slate-950",
                side === "top" ? "-bottom-[5px] border-b border-r" : "-top-[5px] border-l border-t"
              )}
            />
          </div>,
          document.body
        )}
    </span>
  )
}

export { Tooltip }
