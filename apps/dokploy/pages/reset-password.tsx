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
import { cn } from "@/lib/utils";

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
		<div className="glass rounded-2xl p-8">
			<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
				<Logo
					className="size-6"
					logoUrl={
						whitelabeling?.loginLogoUrl ||
						whitelabeling?.logoUrl ||
						undefined
					}
				/>
			</div>
			<h1 className="text-2xl font-display font-bold text-center mb-1">Reset Password</h1>
			<p className="text-xs text-muted-foreground text-center mb-6">
				Enter your new password
			</p>

			{error && (
				<AlertBlock type="error" className="mb-4">
					{error}
				</AlertBlock>
			)}
			
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Password</label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...form.register("password")}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							>
								{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
							</button>
						</div>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Confirm Password</label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input
								type={showConfirmPassword ? "text" : "password"}
								placeholder="••••••••"
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...form.register("confirmPassword")}
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							>
								{showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
							</button>
						</div>
					</div>

					<Button
						type="submit"
						isLoading={isLoading}
						className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:shadow-[0_0_30px_hsl(var(--glow-primary))] hover:scale-[1.02] transition-all"
					>
						Confirm
					</Button>
				</form>
			</Form>

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
export async function getServerSideProps(context: GetServerSidePropsContext) {
	if (!IS_CLOUD) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
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
