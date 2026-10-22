import Link from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";

interface Props {
	children: React.ReactNode;
}

export const OnboardingLayout = ({ children }: Props) => {
	return (
		<div className="dark min-h-screen flex flex-col items-center justify-center bg-black text-zinc-100 p-4 w-full font-sans antialiased">
			<div className="w-full max-w-[420px] bg-[#0c0c0c] border border-zinc-800/80 rounded-[24px] p-8 shadow-2xl relative z-10">
				{children}
			</div>
		</div>
	);
};