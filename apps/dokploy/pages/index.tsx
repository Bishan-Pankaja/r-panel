import {
	getWebServerSettings,
	IS_CLOUD,
	isAdminPresent,
} from "@dokploy/server";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
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
import { SignInWithSSO } from "@/components/proprietary/sso/sign-in-with-sso";
import { AlertBlock } from "@/components/shared/alert-block";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

const _TwoFactorSchema = z.object({
	code: z.string().min(6),
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
			router.push("/dashboard/home");
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
			router.push("/dashboard/home");
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
			router.push("/dashboard/home");
		} catch {
			toast.error("An error occurred while verifying backup code");
		} finally {
			setIsBackupCodeLoading(false);
		}
	};

	const loginContent = (
		<>
			{IS_CLOUD && (
				<div className="grid grid-cols-2 gap-3 mb-4">
					<SignInWithGithub className="w-full" />
					<SignInWithGoogle className="w-full" />
				</div>
			)}
			<Form {...loginForm}>
				<form
					onSubmit={loginForm.handleSubmit(onSubmit)}
					className="space-y-4"
					id="login-form"
				>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Email</label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
							<Input 
								placeholder="your@email.com" 
								className="w-full bg-secondary/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all"
								{...loginForm.register("email")} 
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
								{...loginForm.register("password")}
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
					<Button 
						className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:shadow-[0_0_30px_hsl(var(--glow-primary))] hover:scale-[1.02] transition-all" 
						type="submit" 
						isLoading={isLoginLoading}
					>
						Sign In <LogIn size={14} />
					</Button>
				</form>
			</Form>
		</>
	);

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
			<h1 className="text-2xl font-display font-bold text-center mb-1">Welcome Back</h1>
			<p className="text-xs text-muted-foreground text-center mb-6">Sign in to your account</p>
			
			{error && (
				<AlertBlock type="error" className="mb-4">
					<span>{error}</span>
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
				<>
					<form
						onSubmit={onTwoFactorSubmit}
						className="space-y-4"
						id="two-factor-form"
						autoComplete="on"
					>
						<div className="flex flex-col gap-2">
							<Label htmlFor="totp-code" className="text-xs text-muted-foreground">2FA Code</Label>
							<InputOTP
								id="totp-code"
								name="totp"
								value={twoFactorCode}
								onChange={setTwoFactorCode}
								maxLength={6}
								placeholder="••••••"
								pattern={REGEXP_ONLY_DIGITS}
								autoFocus
								className="bg-secondary/50 rounded-xl"
							/>
							<CardDescription className="text-xs">
								Enter the 6-digit code from your authenticator app
							</CardDescription>
							<button
								type="button"
								onClick={() => setIsBackupCodeModalOpen(true)}
								className="text-xs text-muted-foreground hover:underline self-start mt-2"
							>
								Lost access to your authenticator app?
							</button>
						</div>

						<div className="flex gap-4">
							<Button
								variant="outline"
								className="w-full rounded-xl"
								type="button"
								onClick={() => {
									setIsTwoFactor(false);
									setTwoFactorCode("");
								}}
							>
								Back
							</Button>
							<Button
								className="w-full rounded-xl"
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
						<DialogContent className="glass rounded-2xl">
							<DialogHeader>
								<DialogTitle>Enter Backup Code</DialogTitle>
								<DialogDescription>
									Enter one of your backup codes to access your account
								</DialogDescription>
							</DialogHeader>

							<form onSubmit={onBackupCodeSubmit} className="space-y-4">
								<div className="flex flex-col gap-2">
									<Label className="text-xs text-muted-foreground">Backup Code</Label>
									<Input
										value={backupCode}
										onChange={(e) => setBackupCode(e.target.value)}
										placeholder="Enter your backup code"
										className="font-mono bg-secondary/50 rounded-xl"
									/>
									<CardDescription className="text-xs">
										Enter one of the backup codes you received when setting up
										2FA
									</CardDescription>
								</div>

								<div className="flex gap-4">
									<Button
										variant="outline"
										className="w-full rounded-xl"
										type="button"
										onClick={() => {
											setIsBackupCodeModalOpen(false);
											setBackupCode("");
										}}
									>
										Cancel
									</Button>
									<Button
										className="w-full rounded-xl"
										type="submit"
										isLoading={isBackupCodeLoading}
									>
										Verify
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				</>
			)}

			<div className="flex flex-row justify-center gap-4 mt-5">
				{IS_CLOUD && (
					<Link
						className="text-xs text-muted-foreground hover:text-primary transition-colors"
						href="/register"
					>
						Create an account
					</Link>
				)}
				{IS_CLOUD ? (
					<Link
						className="text-xs text-muted-foreground hover:text-primary transition-colors"
						href="/send-reset-password"
					>
						Lost your password?
					</Link>
				) : (
					<Link
						className="text-xs text-muted-foreground hover:text-primary transition-colors"
						href="https://hpanel.regz.lk/docs/core/reset-password"
						target="_blank"
					>
						Lost your password?
					</Link>
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
						destination: "/dashboard/home",
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
				destination: "/dashboard/home",
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
