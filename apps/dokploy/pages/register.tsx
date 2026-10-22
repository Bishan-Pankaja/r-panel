import { IS_CLOUD, isAdminPresent, validateRequest } from "@dokploy/server";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { AlertTriangle } from "lucide-react";
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
import { SignInWithRegz } from "@/components/proprietary/auth/sign-in-with-regz";
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
		<div className="w-full">
			<div className="flex flex-col items-center mb-2">
				<div className="w-16 h-16 rounded-[16px] bg-[#111] border border-zinc-800/80 shadow-lg flex items-center justify-center mb-6 overflow-hidden p-3">
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
				</div>
				<h1 className="text-[22px] font-semibold text-white tracking-tight mb-1">
					{isCloud ? "Create an account" : "Initial setup"}
				</h1>
				<p className="text-xs text-zinc-400 font-medium text-center">
					{isCloud ? "Join us today and start building" : "Configure your server in just a few moments"}
				</p>
			</div>

			<div className="w-full mt-6">
				{isError && (
					<AlertBlock type="error" className="mb-4 bg-red-950/30 border-red-900/50 text-red-400 text-sm">
						{error}
					</AlertBlock>
				)}
				{isCloud && data && (
					<AlertBlock type="success" className="mb-4 bg-emerald-950/30 border-emerald-900/50 text-emerald-400 text-sm">
						✨ Almost there! Check your inbox to confirm your account
					</AlertBlock>
				)}
				
				<div className="flex flex-col gap-3 mb-6">
					{isCloud && (
						<div className="grid grid-cols-2 gap-3">
							<SignInWithGoogle />
							<SignInWithGithub />
						</div>
					)}
					<SignInWithRegz />
				</div>
				
				<div className="relative mb-6">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-zinc-800" />
					</div>
					<div className="relative flex justify-center text-[10px] uppercase tracking-widest font-medium">
						<span className="bg-[#0c0c0c] px-3 text-zinc-500">Or continue with</span>
					</div>
				</div>
				
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<FormLabel className="text-zinc-300 text-xs font-normal">First Name</FormLabel>
										<FormControl>
											<Input placeholder="John" className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="lastName"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<FormLabel className="text-zinc-300 text-xs font-normal">Last Name</FormLabel>
										<FormControl>
											<Input placeholder="Doe" className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-zinc-300 text-xs font-normal">Email</FormLabel>
									<FormControl>
										<Input placeholder="name@example.com" className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="text-zinc-300 text-xs font-normal">Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="••••••••"
											className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600 shadow-inner"
											{...field}
										/>
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
										<Input
											type="password"
											placeholder="••••••••"
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
							isLoading={form.formState.isSubmitting}
							className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl font-medium shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all mt-2"
						>
							{isCloud ? "Register" : "Complete Setup"}
						</Button>
					</form>
				</Form>
				
				<div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
					{isCloud && (
						<div className="text-xs text-zinc-400">
							Already have an account?{" "}
							<Link className="text-blue-500 hover:text-blue-400 font-medium transition-colors" href="/">
								Sign in
							</Link>
						</div>
					)}
				</div>
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
					destination: "/dashboard/projects",
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
