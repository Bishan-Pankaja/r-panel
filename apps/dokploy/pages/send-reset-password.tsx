import { IS_CLOUD } from "@dokploy/server";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
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
		<div className="w-full">
			<div className="flex flex-col items-center mb-2">
				<Link href="/" className="w-16 h-16 rounded-[16px] bg-[#111] border border-zinc-800/80 shadow-lg flex items-center justify-center mb-6 overflow-hidden p-3 transition-transform hover:scale-105">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img 
						src={
							whitelabeling?.loginLogoUrl || 
							whitelabeling?.logoUrl || 
							"https://www.regz.lk/favicon.ico"
						} 
						alt="Logo" 
						className="w-full h-full object-contain"
					/>
				</Link>
				<h1 className="text-[22px] font-semibold text-white tracking-tight mb-1">
					Reset Password
				</h1>
				<p className="text-xs text-zinc-400 font-medium text-center">
					Enter your email to receive a password reset link
				</p>
			</div>

			<div className="w-full mt-6">
				{error && (
					<AlertBlock type="error" className="mb-4 bg-red-950/30 border-red-900/50 text-red-400 text-sm">
						{error}
					</AlertBlock>
				)}
				
				{!temp.is2FAEnabled ? (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<FormLabel className="text-zinc-300 text-xs font-normal">Email</FormLabel>
										<FormControl>
											<Input
												placeholder="your@email.com"
												maxLength={255}
												className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								isLoading={isLoading}
								className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl font-medium shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all mt-2"
							>
								Send Reset Link
							</Button>
						</form>
					</Form>
				) : null}

				<div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
					<Link
						className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors"
						href="/"
					>
						Back to login
					</Link>
				</div>
			</div>
		</div>
	);
}

Home.getLayout = (page: ReactElement) => {
	return <OnboardingLayout>{page}</OnboardingLayout>;
};

export async function getServerSideProps(_context: GetServerSidePropsContext) {
	return {
		props: {},
	};
}
