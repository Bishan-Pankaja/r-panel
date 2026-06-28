import { IS_CLOUD, isAdminPresent, validateRequest } from "@dokploy/server";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { AlertTriangle, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { SignInWithGithub } from "@/components/proprietary/auth/sign-in-with-github";
import { SignInWithGoogle } from "@/components/proprietary/auth/sign-in-with-google";
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

const registerSchema = z
	.object({
		name: z.string().min(1, {
			message: "First name is required",
		}),
		lastName: z.string().min(1, {
			message: "Last name is required",
		}),
		email: z
			.string()
			.min(1, {
				message: "Email is required",
			})
			.email({
				message: "Email must be a valid email",
			}),
		password: z
			.string()
			.min(1, {
				message: "Password is required",
			})
			.refine((password) => password === "" || password.length >= 8, {
				message: "Password must be at least 8 characters",
			}),
		confirmPassword: z
			.string()
			.min(1, {
				message: "Password is required",
			})
			.refine(
				(confirmPassword) =>
					confirmPassword === "" || confirmPassword.length >= 8,
				{
					message: "Password must be at least 8 characters",
				},
			),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type Register = z.infer<typeof registerSchema>;

interface Props {
	hasAdmin: boolean;
	isCloud: boolean;
}

const Register = ({ isCloud }: Props) => {
	const router = useRouter();
	const { config: whitelabeling } = useWhitelabelingPublic();
	const [isError, setIsError] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<any>(null);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const form = useForm<Register>({
		defaultValues: {
			name: "",
			lastName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		resolver: zodResolver(registerSchema),
	});

	useEffect(() => {
		form.reset();
	}, [form, form.reset, form.formState.isSubmitSuccessful]);

	const onSubmit = async (values: Register) => {
		const { data, error } = await authClient.signUp.email({
			email: values.email,
			password: values.password,
			name: values.name,
			lastName: values.lastName,
		});

		if (error) {
			setIsError(true);
			setError(error.message || "An error occurred");
		} else {
			toast.success("User registered successfully", {
				duration: 2000,
			});
			if (!isCloud) {
				router.push("/");
			} else {
				setData(data);
			}
		}
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
			<h1 className="text-2xl font-display font-bold text-center mb-1">
				{isCloud ? "Create Account" : "Setup the server"}
			</h1>
			<p className="text-xs text-muted-foreground text-center mb-6">
				Enter your details to {isCloud ? "create an account" : "setup the server"}
			</p>
			
			{isError && (
				<div className="my-2 flex flex-row items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-950">
					<AlertTriangle className="text-red-600 dark:text-red-400" size={14} />
					<span className="text-sm text-red-600 dark:text-red-400">
						{error}
					</span>
				</div>
			)}
			{isCloud && data && (
				<AlertBlock type="success" className="my-2">
					<span>
						Registered successfully, please check your inbox or spam
						folder to confirm your account.
					</span>
				</AlertBlock>
			)}
			
			{isCloud && (
				<div className="grid grid-cols-2 gap-3 mb-4">
					<SignInWithGithub className="w-full" />
					<SignInWithGoogle className="w-full" />
				</div>
			)}
			{isCloud && (
				<p className="mb-4 text-center text-xs text-muted-foreground">
					Or register with email
				</p>
			)}
			
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">First Name</label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input 
								placeholder="John" 
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...form.register("name")} 
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Last Name</label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input 
								placeholder="Doe" 
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...form.register("lastName")} 
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Email</label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input 
								placeholder="your@email.com" 
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...form.register("email")} 
							/>
						</div>
					</div>
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
						isLoading={form.formState.isSubmitting}
						className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:shadow-[0_0_30px_hsl(var(--glow-primary))] hover:scale-[1.02] transition-all"
					>
						{isCloud ? "Create Account" : "Setup Server"}
					</Button>
				</form>
			</Form>
			
			<div className="flex flex-row justify-center gap-4 mt-5">
				{isCloud && (
					<Link
						className="text-xs text-muted-foreground hover:text-primary transition-colors"
						href="/"
					>
						Already have an account? Sign in
					</Link>
				)}
				<Link
					className="text-xs text-muted-foreground hover:text-primary transition-colors"
					href="https://hpanel.regz.lk"
					target="_blank"
				>
					Need help?
				</Link>
			</div>
		</div>
	);
};

export default Register;

Register.getLayout = (page: ReactElement) => {
	return <OnboardingLayout>{page}</OnboardingLayout>;
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
	if (IS_CLOUD) {
		const { user } = await validateRequest(context.req);

		if (user) {
			return {
				redirect: {
					permanent: false,
					destination: "/dashboard/home",
				},
			};
		}
		return {
			props: {
				isCloud: true,
			},
		};
	}
	const hasAdmin = await isAdminPresent();

	if (hasAdmin) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
	return {
		props: {
			isCloud: false,
		},
	};
}
