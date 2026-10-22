import { IS_CLOUD } from "@dokploy/server";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Lock, Eye, EyeOff } from "lucide-react";
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

const loginSchema = z
	.object({
		password: z
			.string()
			.min(1, {
				message: "Password is required",
			})
			.min(8, {
				message: "Password must be at least 8 characters",
			}),
		confirmPassword: z
			.string()
			.min(1, {
				message: "Password is required",
			})
			.min(8, {
				message: "Password must be at least 8 characters",
			}),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type Login = z.infer<typeof loginSchema>;

interface Props {
	tokenResetPassword: string;
}

export default function Home({ tokenResetPassword }: Props) {
	const { config: whitelabeling } = useWhitelabelingPublic();
	const [token, setToken] = useState<string | null>(tokenResetPassword);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const router = useRouter();
	const form = useForm<Login>({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		resolver: zodResolver(loginSchema),
	});

	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get("token");

		if (token) {
			setToken(token);
		}
	}, [token]);

	useEffect(() => {
		form.reset();
	}, [form, form.reset, form.formState.isSubmitSuccessful]);

	const onSubmit = async (values: Login) => {
		setIsLoading(true);
		const { error } = await authClient.resetPassword({
			newPassword: values.password,
			token: token || "",
		});

		if (error) {
			setError(error.message || "An error occurred");
		} else {
			toast.success("Password reset successfully");
			router.push("/");
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
					Set new password
				</h1>
				<p className="text-xs text-zinc-400 font-medium text-center">
					Please enter your new password below
				</p>
			</div>

			<div className="w-full mt-6">
				{error && (
					<AlertBlock type="error" className="mb-4 bg-red-950/30 border-red-900/50 text-red-400 text-sm">
						{error}
					</AlertBlock>
				)}
				
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-zinc-300 text-xs font-normal">New Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-zinc-500" />
											<Input
												type={showPassword ? "text" : "password"}
												placeholder="••••••••"
												className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 pl-10 pr-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner"
												{...field}
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
											>
												{showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-zinc-300 text-xs font-normal">Confirm Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-zinc-500" />
											<Input
												type={showConfirmPassword ? "text" : "password"}
												placeholder="••••••••"
												className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 pl-10 pr-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner"
												{...field}
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
											>
												{showConfirmPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
											</button>
										</div>
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
							Reset Password
						</Button>
					</form>
				</Form>

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

export async function getServerSideProps(context: GetServerSidePropsContext) {
	const { token } = context.query;

	if (typeof token !== "string") {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	return {
		props: {
			tokenResetPassword: token,
		},
	};
}
