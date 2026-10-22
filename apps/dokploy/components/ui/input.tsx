import { EyeIcon, EyeOffIcon, RefreshCcw } from "lucide-react";
import * as React from "react";
import { generateRandomPassword } from "@/lib/password-utils";
import { cn } from "@/lib/utils";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	errorMessage?: string;
	enablePasswordGenerator?: boolean;
	passwordGeneratorLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			errorMessage,
			type,
			enablePasswordGenerator = false,
			passwordGeneratorLength,
			...props
		},
		ref,
	) => {
		const [showPassword, setShowPassword] = React.useState(false);
		const inputRef = React.useRef<HTMLInputElement>(null);
		const isPassword = type === "password";
		const shouldShowGenerator =
			isPassword &&
			enablePasswordGenerator !== false &&
			!props.disabled &&
			!props.readOnly;
		const inputType = isPassword ? (showPassword ? "text" : "password") : type;

		const setRefs = React.useCallback(
			(node: HTMLInputElement | null) => {
				// @ts-ignore
				inputRef.current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			},
			[ref],
		);

		const handleGeneratePassword = () => {
			const nextValue =
				typeof passwordGeneratorLength === "number" &&
				passwordGeneratorLength > 0
					? generateRandomPassword(Math.floor(passwordGeneratorLength))
					: generateRandomPassword();

			const input = inputRef.current;
			if (!input) {
				return;
			}

			const valueSetter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			if (valueSetter) {
				valueSetter.call(input, nextValue);
			} else {
				input.value = nextValue;
			}

			input.dispatchEvent(new Event("input", { bubbles: true }));
		};

		return (
			<>
				<div className="relative w-full">
					<input
						type={inputType}
						className={cn(
							"flex h-10 w-full rounded-xl bg-[#1a1a1a] border border-zinc-800/80 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
							isPassword && (shouldShowGenerator ? "pr-16" : "pr-10"),
							className,
						)}
						ref={setRefs}
						{...props}
					/>
					{isPassword && (
						<div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3 text-muted-foreground">
							{shouldShowGenerator && (
								<button
									type="button"
									className="hover:text-foreground focus:outline-none"
									onClick={handleGeneratePassword}
									aria-label="Generate password"
									title="Generate password"
									tabIndex={-1}
								>
									<RefreshCcw className="h-4 w-4" />
								</button>
							)}
							<button
								type="button"
								className="hover:text-foreground focus:outline-none"
								onClick={() => setShowPassword(!showPassword)}
								tabIndex={-1}
							>
								{showPassword ? (
									<EyeOffIcon className="h-4 w-4" />
								) : (
									<EyeIcon className="h-4 w-4" />
								)}
							</button>
						</div>
					)}
				</div>
				{errorMessage && (
					<span className="text-sm text-red-600 text-secondary-foreground">
						{errorMessage}
					</span>
				)}
			</>
		);
	},
);
Input.displayName = "Input";

const NumberInput = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, errorMessage, ...props }, ref) => {
		return (
			<Input
				type="number"
				className={cn("text-left", className)}
				ref={ref}
				{...props}
				// Convert string to number (or undefined) before sending to form controller
				value={props.value === undefined ? undefined : String(props.value)}
				onChange={(e) => {
					const raw = e.target.value;
					if (raw === "") {
						// Empty field – let Zod use the default (0)
						props.onChange?.(e);
					} else {
						const num = Number.parseInt(raw, 10);
						if (!Number.isNaN(num)) {
							const syntheticEvent = {
								...e,
								target: {
									...e.target,
									value: num,
								},
							};
							props.onChange?.(
								syntheticEvent as unknown as React.ChangeEvent<HTMLInputElement>,
							);
						}
					}
				}}
			/>
		);
	},
);
NumberInput.displayName = "NumberInput";

export { Input, NumberInput };
