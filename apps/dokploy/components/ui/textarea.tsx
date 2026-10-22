import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				className={cn(
					"flex min-h-[90px] w-full rounded-xl border border-zinc-800/80 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Textarea.displayName = "Textarea";

export { Textarea };
