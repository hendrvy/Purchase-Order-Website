import { cn } from '@/lib/utils.js'

export function Button({
    children,
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled = false,
    onClick,
    type = "button",
    className = "",
}) {
    const variants = {
        primary : "bg-[#B00100] text-white hover:bg-[#B33332] active:bg-[#810100]",
        secondary : "bg-[#E5E7EB] text-gray-800 hover:bg-[#D1D5DB]",
        danger : "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
        ghost : "bg-transparent text-gray-700 hover:bg-gray-100",
    }

    const sizes = {
        sm: "h-[40px] px-4 text-sm",
        md: "h-[48px] px-6 text-base",
        lg: "h-[52px] px-7 text-lg"
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isLoading || disabled}
            className={cn(
                "w-[200px] rounded-[27px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                variants[variant],
                sizes[size],
                className,
            )}
        >
            {isLoading ? "Loading..." : children}
        </button>
    )
}