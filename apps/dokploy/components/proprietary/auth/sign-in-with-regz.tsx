"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignInWithRegz() {
	const [isLoading, setIsLoading] = useState(false);

	const handleClick = async () => {
		setIsLoading(true);
		try {
			const { error } = await authClient.signIn.oauth2({
				providerId: "regz",
				callbackURL: "/dashboard/projects",
			});
			if (error) {
				toast.error(error.message);
				return;
			}
		} catch (err) {
			toast.error("An error occurred while signing in with Regz", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			type="button"
			className="w-full bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl h-11 transition-colors"
			onClick={handleClick}
			isLoading={isLoading}
		>
			Continue with Regz
		</Button>
	);
}
