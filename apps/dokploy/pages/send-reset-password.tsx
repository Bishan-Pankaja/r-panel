import { IS_CLOUD } from "@dokploy/server";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Mail } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { AlertBlock } from "@/components/shared/alert-block";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useWhitelabelingPublic } from "@/utils/hooks/use-whitelabeling";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
	email: z
		.string()
		.min(1, {
			message: "Email is required",
		})
		.max(255, {
			message: "Email must be at most 255 characters",
		})
		.email({
			message: "Email must be a valid email",
		}),
});

type Login = z.infer<typeof loginSchema>;

type AuthResponse = {
	is2FAEnabled: boolean;
	authId: string;
};

export default function Home() {
	const { config: whitelabeling } = useWhitelabelingPublic();
	const [temp, _setTemp] = useState<AuthResponse>({
		is2FAEnabled: false,
		authId: "",
	});

	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const _router = useRouter();
	const form = useForm<Login>({
		defaultValues: {
			email: "",
		},
		resolver: zodResolver(loginSchema),
	});

	useEffect(() => {
		form.reset();
	}, [form, form.reset, form.formState.isSubmitSuccessful]);

	const onSubmit = async (values: Login) => {
		setIsLoading(true);
		const { error } = await authClient.requestPasswordReset({
			email: values.email,
			redirectTo: "/reset-password",
		});
		if (error) {
			setError(error.message || "An error occurred");
			setIsLoading(false);
		} else {
			toast.success("Email sent", {
				duration: 2000,
			});
		}
		setIsLoading(false);
	};
	return (
		<div className="glass rounded-2xl p-8">
			<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
				<Logo
					className="size-6"
					logoUrl={
						whitelabeling?.loginLogoUrl || whitelabeling?.logoUrl || undefined
					}
				/>
			</div>
			<h1 className="text-2xl font-display font-bold text-center mb-1">Reset Password</h1>
			<p className="text-xs text-muted-foreground text-center mb-6">
				Enter your email to reset your password
			</p>

			{error && (
				<AlertBlock type="error" className="mb-4">
					{error}
				</AlertBlock>
			)}
			
			{!temp.is2FAEnabled ? (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<div className="space-y-1.5">
							<label className="text-xs text-muted-foreground">Email</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
								<Input
									placeholder="your@email.com"
									maxLength={255}
									className="w-full bg-secondary/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
									{...form.register("email")}
								/>
							</div>
						</div>

						<Button
							type="submit"
							isLoading={isLoading}
							className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:shadow-[0_0_30px_hsl(var(--glow-primary))] hover:scale-[1.02] transition-all"
						>
							Send Reset Link
						</Button>
					</form>
				</Form>
			) : null}

			<div className="flex flex-row justify-center mt-5">
				<Link
					className="text-xs text-muted-foreground hover:text-primary transition-colors"
					href="/"
				>
					Back to login
				</Link>
			</div>
		</div>
	);
}

Home.getLayout = (page: ReactElement) => {
	return <OnboardingLayout>{page}</OnboardingLayout>;
};
export async function getServerSideProps(_context: GetServerSidePropsContext) {
	if (!IS_CLOUD) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	return {
		props: {},
	};
}
