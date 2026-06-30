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
			{IS_CLOUD && <SignInWithGithub />}
			{IS_CLOUD && <SignInWithGoogle />}
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
							<FormItem>
								<FormLabel className="font-mono text-cyan-400">&gt; EMAIL</FormLabel>
								<FormControl>
									<Input placeholder="user@domain.com" {...field} className="font-mono bg-slate-900/50 border-slate-700" />
								</FormControl>
								<FormMessage className="font-mono" />
							</FormItem>
						)}
					/>
					<FormField
						control={loginForm.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="font-mono text-cyan-400">&gt; PASSWORD</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="••••••••"
										{...field}
										className="font-mono bg-slate-900/50 border-slate-700"
									/>
								</FormControl>
								<FormMessage className="font-mono" />
							</FormItem>
						)}
					/>
					<Button className="w-full font-mono bg-cyan-600 hover:bg-cyan-500" type="submit" isLoading={isLoginLoading}>
						&gt; Authenticate
					</Button>
				</form>
			</Form>
		</>
	);

	return (
		<>
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-2xl font-semibold tracking-tight font-mono">
					<div className="flex flex-row items-center justify-center gap-2">
						<div className="relative">
							<Logo
								className="size-12"
								logoUrl={
									whitelabeling?.loginLogoUrl ||
									whitelabeling?.logoUrl ||
									undefined
								}
							/>
							<div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20" />
						</div>
						<span className="text-cyan-400">[</span>
						<span className="text-white">Sign in</span>
						<span className="text-cyan-400">]</span>
					</div>
				</h1>
				<p className="text-sm text-slate-400 font-mono">
					&gt; Enter credentials to authenticate
				</p>
			</div>
			{error && (
				<AlertBlock type="error" className="my-2 border-red-900/50 bg-red-950/30 text-red-400">
					<span className="font-mono">⚠ {error}</span>
				</AlertBlock>
			)}
			<CardContent className="p-0">
				{!isTwoFactor ? (
					<>
						{enforceSSO ? (
							<SignInWithSSO enforce />
						) : showSignInWithSSO ? (
							<SignInWithSSO>{loginContent}</SignInWithSSO>
						) : (
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 rounded-lg" />
								<div className="relative">{loginContent}</div>
							</div>
						)}
					</>
				) : (
					<>
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 rounded-lg" />
							<form
								onSubmit={onTwoFactorSubmit}
								className="relative space-y-4"
								id="two-factor-form"
								autoComplete="on"
							>
								<div className="flex flex-col gap-2">
									<Label htmlFor="totp-code" className="font-mono text-emerald-400">&gt; 2FA_CODE</Label>
									<InputOTP
										id="totp-code"
										name="totp"
										value={twoFactorCode}
										onChange={setTwoFactorCode}
										maxLength={6}
										placeholder="••••••"
										pattern={REGEXP_ONLY_DIGITS}
										autoFocus
										className="font-mono"
									/>
									<CardDescription className="font-mono text-slate-400">
										// Enter 6-digit code from authenticator
									</CardDescription>
									<button
										type="button"
										onClick={() => setIsBackupCodeModalOpen(true)}
										className="text-sm text-emerald-400 hover:text-emerald-300 font-mono self-start mt-2"
									>
										? Lost authenticator access?
									</button>
								</div>

								<div className="flex gap-4">
									<Button
										variant="outline"
										className="w-full font-mono border-slate-700 text-slate-300 hover:bg-slate-800"
										type="button"
										onClick={() => {
											setIsTwoFactor(false);
											setTwoFactorCode("");
										}}
									>
										&lt; Back
									</Button>
									<Button
										className="w-full font-mono bg-emerald-600 hover:bg-emerald-500"
										type="submit"
										isLoading={isTwoFactorLoading}
									>
										Verify &gt;
									</Button>
								</div>
							</form>
						</div>

						<Dialog
							open={isBackupCodeModalOpen}
							onOpenChange={setIsBackupCodeModalOpen}
						>
							<DialogContent className="bg-slate-950 border-slate-800">
								<DialogHeader>
									<DialogTitle className="font-mono text-emerald-400">&gt; BACKUP_CODE</DialogTitle>
									<DialogDescription className="font-mono text-slate-400">
										// Enter recovery code from 2FA setup
									</DialogDescription>
								</DialogHeader>

								<form onSubmit={onBackupCodeSubmit} className="space-y-4">
									<div className="flex flex-col gap-2">
										<Label className="font-mono text-emerald-400">&gt; RECOVERY_CODE</Label>
										<Input
											value={backupCode}
											onChange={(e) => setBackupCode(e.target.value)}
											placeholder="xxxx-xxxx-xxxx"
											className="font-mono bg-slate-900 border-slate-700 text-emerald-300"
										/>
										<CardDescription className="font-mono text-slate-500">
											// Format: XXXX-XXXX-XXXX
										</CardDescription>
									</div>

									<div className="flex gap-4">
										<Button
											variant="outline"
											className="w-full font-mono border-slate-700 text-slate-300 hover:bg-slate-800"
											type="button"
											onClick={() => {
												setIsBackupCodeModalOpen(false);
												setBackupCode("");
											}}
										>
											Cancel
										</Button>
										<Button
											className="w-full font-mono bg-emerald-600 hover:bg-emerald-500"
											type="submit"
											isLoading={isBackupCodeLoading}
										>
											Verify &gt;
										</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
					</>
				)}

				<div className="flex flex-row justify-between flex-wrap">
					<div className="mt-4 text-center text-sm flex flex-row justify-center gap-2">
						{IS_CLOUD && (
							<Link
								className="hover:text-cyan-400 text-slate-400 font-mono transition-colors"
								href="/register"
							>
								+ Create account
							</Link>
						)}
					</div>

					<div className="mt-4 text-sm flex flex-row justify-center gap-2">
						{IS_CLOUD ? (
							<Link
								className="hover:text-cyan-400 text-slate-400 font-mono transition-colors"
								href="/send-reset-password"
							>
								? Reset password
							</Link>
						) : (
							<Link
								className="hover:text-cyan-400 text-slate-400 font-mono transition-colors"
								href="https://hpanel.regz.lk/docs/core/reset-password"
								target="_blank"
							>
								? Reset password
							</Link>
						)}
					</div>
				</div>
				<div className="p-2" />
			</CardContent>
		</>
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
