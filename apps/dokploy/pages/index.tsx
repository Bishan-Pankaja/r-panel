import {
	getWebServerSettings,
	IS_CLOUD,
	isAdminPresent,
} from "@dokploy/server";
import { validateRequest } from "@dokploy/server/lib/auth";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { SignInWithGithub } from "@/components/proprietary/auth/sign-in-with-github";
import { SignInWithGoogle } from "@/components/proprietary/auth/sign-in-with-google";
import { SignInWithRegz } from "@/components/proprietary/auth/sign-in-with-regz";
import { SignInWithSSO } from "@/components/proprietary/sso/sign-in-with-sso";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { api } from "@/utils/api";
import { useWhitelabelingPublic } from "@/utils/hooks/use-whitelabeling";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

type LoginForm = z.infer<typeof LoginSchema>;

interface Props {
	IS_CLOUD: boolean;
	enforceSSO: boolean;
}
export default function Home({ IS_CLOUD, enforceSSO }: Props) {
	const router = useRouter();
	const { config: whitelabeling } = useWhitelabelingPublic();
	const { data: showSignInWithSSO } = api.sso.showSignInWithSSO.useQuery();
	const [isLoginLoading, setIsLoginLoading] = useState(false);
	const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);
	const [isBackupCodeLoading, setIsBackupCodeLoading] = useState(false);
	const [isTwoFactor, setIsTwoFactor] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [isBackupCodeModalOpen, setIsBackupCodeModalOpen] = useState(false);
	const [backupCode, setBackupCode] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const loginForm = useForm<LoginForm>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const onSubmit = async (values: LoginForm) => {
		setIsLoginLoading(true);
		try {
			const { data, error } = await authClient.signIn.email({
				email: values.email,
				password: values.password,
			});

			if (error) {
				const isEmailNotVerified =
					error.code === "EMAIL_NOT_VERIFIED" ||
					error.message?.toLowerCase().includes("email not verified");
				if (isEmailNotVerified) {
					const msg =
						"Your email is not verified. We've sent a new verification link to your email.";
					toast.info(msg);
					setError(msg);
					return;
				}
				toast.error(error.message);
				setError(error.message || "An error occurred while logging in");
				return;
			}

			// @ts-ignore
			if (data?.twoFactorRedirect as boolean) {
				setTwoFactorCode("");
				setIsTwoFactor(true);
				toast.info("Please enter your 2FA code");
				return;
			}

toast.success("Logged in successfully");
			router.push("/dashboard/projects");
		} catch {
			toast.error("An error occurred while logging in");
		} finally {
			setIsLoginLoading(false);
		}
	};
	const onTwoFactorSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (twoFactorCode.length !== 6) {
			toast.error("Please enter a valid 6-digit code");
			return;
		}

		setIsTwoFactorLoading(true);
		try {
			const { error } = await authClient.twoFactor.verifyTotp({
				code: twoFactorCode.replace(/\s/g, ""),
			});

			if (error) {
				toast.error(error.message);
				setError(error.message || "An error occurred while verifying 2FA code");
				return;
			}

			toast.success("Logged in successfully");
			router.push("/dashboard/projects");
		} catch {
			toast.error("An error occurred while verifying 2FA code");
		} finally {
			setIsTwoFactorLoading(false);
		}
	};

	const onBackupCodeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (backupCode.length < 8) {
			toast.error("Please enter a valid backup code");
			return;
		}

		setIsBackupCodeLoading(true);
		try {
			const { error } = await authClient.twoFactor.verifyBackupCode({
				code: backupCode.trim(),
			});

			if (error) {
				toast.error(error.message);
				setError(
					error.message || "An error occurred while verifying backup code",
				);
				return;
			}

			toast.success("Logged in successfully");
			router.push("/dashboard/projects");
		} catch {
			toast.error("An error occurred while verifying backup code");
		} finally {
			setIsBackupCodeLoading(false);
		}
	};

	const loginContent = (
		<div className="flex flex-col gap-6 mt-6">
			<Form {...loginForm}>
				<form
					onSubmit={loginForm.handleSubmit(onSubmit)}
					className="space-y-4"
					id="login-form"
				>
					<FormField
						control={loginForm.control}
						name="email"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<FormLabel className="text-zinc-300 text-xs font-normal">Email</FormLabel>
								<FormControl>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-zinc-500" />
										<Input 
											placeholder="your@email.com" 
											className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 pl-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 placeholder:text-zinc-600 shadow-inner"
											{...field} 
										/>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={loginForm.control}
						name="password"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex justify-between items-center">
									<FormLabel className="text-zinc-300 text-xs font-normal">Password</FormLabel>
									<Link
										href="/send-reset-password"
										className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
									>
										Forgot password?
									</Link>
								</div>
								<FormControl>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-zinc-500" />
										<Input
											type={showPassword ? "text" : "password"}
											placeholder="••••••••"
											className="bg-[#1a1a1a] border-zinc-800/80 text-zinc-100 h-11 pl-10 pr-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 placeholder:text-zinc-600 shadow-inner"
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
					<Button 
						className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl font-medium shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all" 
						type="submit" 
						isLoading={isLoginLoading}
					>
						{!isLoginLoading && <LogIn className="mr-2 size-4" />}
						Sign In
					</Button>
				</form>
			</Form>
			
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-zinc-800" />
				</div>
				<div className="relative flex justify-center text-[10px] uppercase tracking-widest font-medium">
					<span className="bg-[#0c0c0c] px-3 text-zinc-500">Or continue with</span>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-2 gap-3">
					{IS_CLOUD && <SignInWithGoogle />}
					{IS_CLOUD && <SignInWithGithub />}
				</div>
				<SignInWithRegz />
			</div>

			{IS_CLOUD && (
				<div className="text-center text-xs text-zinc-400 mt-2">
					Don't have an account?{" "}
					<Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium">
						Sign up
					</Link>
				</div>
			)}
		</div>
	);

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
					Welcome Back
				</h1>
				<p className="text-xs text-zinc-400 font-medium">
					Sign in to your account
				</p>
			</div>
			
			<div className="w-full">
				{error && (
					<AlertBlock type="error" className="mb-4 bg-red-950/30 border-red-900/50 text-red-400 text-sm">
						{error}
					</AlertBlock>
				)}
				
				{!isTwoFactor ? (
					<>
						{enforceSSO ? (
							<SignInWithSSO enforce />
						) : showSignInWithSSO ? (
							<SignInWithSSO>{loginContent}</SignInWithSSO>
						) : (
							loginContent
						)}
					</>
				) : (
					<div className="space-y-4 mt-6">
						<form
							onSubmit={onTwoFactorSubmit}
							className="relative space-y-4"
							id="two-factor-form"
							autoComplete="on"
						>
							<div className="flex flex-col gap-2">
								<Label htmlFor="totp-code" className="text-zinc-300 text-xs">Authentication Code</Label>
								<InputOTP
									id="totp-code"
									name="totp"
									value={twoFactorCode}
									onChange={setTwoFactorCode}
									maxLength={6}
									pattern={REGEXP_ONLY_DIGITS}
									autoFocus
									render={({ slots }) => (
										<div className="flex justify-between gap-2">
											{slots.map((slot, idx) => (
												<div key={idx} className={`w-10 h-12 flex items-center justify-center border rounded-xl text-lg font-medium ${slot.isActive ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-[#1a1a1a] text-zinc-100'}`}>
													{slot.char}
												</div>
											))}
										</div>
									)}
								/>
								<p className="text-xs text-zinc-500 mt-2">
									Enter the 6-digit code from your authenticator app
								</p>
								<button
									type="button"
									onClick={() => setIsBackupCodeModalOpen(true)}
									className="text-xs text-blue-500 hover:text-blue-400 self-start mt-2 transition-colors"
								>
									Lost access to your authenticator?
								</button>
							</div>

							<div className="flex gap-3 pt-2">
								<Button
									variant="outline"
									className="w-full bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 h-11 rounded-xl"
									type="button"
									onClick={() => {
										setIsTwoFactor(false);
										setTwoFactorCode("");
									}}
								>
									Back
								</Button>
								<Button
									className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl"
									type="submit"
									isLoading={isTwoFactorLoading}
								>
									Verify
								</Button>
							</div>
						</form>

						<Dialog
							open={isBackupCodeModalOpen}
							onOpenChange={setIsBackupCodeModalOpen}
						>
							<DialogContent className="bg-[#0c0c0c] border-zinc-800 text-white sm:rounded-2xl">
								<DialogHeader>
									<DialogTitle className="text-xl">Backup Recovery Code</DialogTitle>
									<DialogDescription className="text-zinc-400 text-xs">
										Enter one of your recovery codes provided during 2FA setup
									</DialogDescription>
								</DialogHeader>

								<form onSubmit={onBackupCodeSubmit} className="space-y-4 pt-2">
									<div className="flex flex-col gap-2">
										<Label className="text-zinc-300 text-xs">Recovery Code</Label>
										<Input
											value={backupCode}
											onChange={(e) => setBackupCode(e.target.value)}
											placeholder="xxxx-xxxx-xxxx"
											className="bg-[#1a1a1a] border-zinc-800 text-zinc-100 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
										/>
									</div>

									<div className="flex gap-3 pt-2">
										<Button
											variant="outline"
											className="w-full bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 h-11 rounded-xl"
											type="button"
											onClick={() => {
												setIsBackupCodeModalOpen(false);
												setBackupCode("");
											}}
										>
											Cancel
										</Button>
										<Button
											className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl"
											type="submit"
											isLoading={isBackupCodeLoading}
										>
											Verify
										</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				)}
			</div>
		</div>
	);
}

Home.getLayout = (page: ReactElement) => {
	return <OnboardingLayout>{page}</OnboardingLayout>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
	if (IS_CLOUD) {
		try {
			const { user } = await validateRequest(context.req);
			if (user) {
				return {
					redirect: {
						permanent: false,
						destination: "/dashboard/projects",
					},
				};
			}
		} catch {}

		return {
			props: {
				IS_CLOUD: IS_CLOUD,
				enforceSSO: false,
			},
		};
	}
	const hasAdmin = await isAdminPresent();

	if (!hasAdmin) {
		return {
			redirect: {
				permanent: false,
				destination: "/register",
			},
		};
	}

	const { user } = await validateRequest(context.req);

	if (user) {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/projects",
			},
		};
	}

	const webServerSettings = await getWebServerSettings();

	return {
		props: {
			hasAdmin,
			enforceSSO: webServerSettings?.enforceSSO ?? false,
		},
	};
}
