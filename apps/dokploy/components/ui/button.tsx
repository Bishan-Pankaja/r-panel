import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap select-none rounded-xl transition-all will-change-transform active:hover:scale-[0.98] active:hover:transform text-xs font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
	{
		variants: {
			variant: {
				default:
					"bg-white text-zinc-950 font-semibold hover:bg-zinc-200 shadow-sm",
				destructive:
					"bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
				outline:
					"border border-zinc-800/80 bg-[#1a1a1a] text-zinc-200 hover:bg-[#222222] hover:text-white",
				secondary:
					"bg-[#1a1a1a] text-zinc-200 border border-zinc-800/80 hover:bg-[#222222] hover:text-white",
				ghost: "hover:bg-zinc-800/60 text-zinc-300 hover:text-white",
				link: "text-blue-400 underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-lg px-3 text-xs",
				lg: "h-11 rounded-xl px-8 text-sm",
				icon: "h-9 w-9 rounded-xl",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	isLoading?: boolean;
	children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			children,
			isLoading = false,
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		const type = props.type ?? undefined;

		return (
			<>
				<Comp
					className={cn(
						buttonVariants({ variant, size, className }),
						"flex gap-2",
						className,
					)}
					ref={ref}
					{...props}
					disabled={isLoading || props.disabled}
					type={type}
				>
					{isLoading && <Loader2 className="animate-spin" />}
					<Slottable>{children}</Slottable>
				</Comp>
			</>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
