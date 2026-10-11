import { cn } from "@/lib/utils"
import { badgeVariants, type BadgeProps } from "@/utils/uiVariants"

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

Badge.displayName = "Badge"

export { Badge }