import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input, NumberInput } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";

const getDateAfterThreeDays = () => {
	const date = new Date();
	date.setDate(date.getDate() + 3);
	return [
		date.getFullYear(),
		`${date.getMonth() + 1}`.padStart(2, "0"),
		`${date.getDate()}`.padStart(2, "0"),
	].join("-");
};

const addInvitation = z
	.object({
		mode: z.enum(["invitation", "credentials"]),
		email: z
			.string()
			.min(1, "Email is required")
			.email({ message: "Invalid email" }),
		role: z.string().min(1, "Role is required"),
		notificationId: z.string().optional(),
		password: z.string().optional(),
		confirmPassword: z.string().optional(),
		// Limits (Quotas)
		limitRam: z.number().min(0).optional(),
		limitCpu: z.number().min(0).optional(),
		limitDisk: z.number().min(0).optional(),
		limitServices: z.number().int().min(0).optional(),
		expirationEnabled: z.boolean().optional(),
		expirationDate: z.string().min(1, "Expiration date is required"),
	})
	.superRefine((value, ctx) => {
		if (value.mode !== "credentials") {
			return;
		}

		if (!value.password) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Password is required",
				path: ["password"],
			});
		} else if (value.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Password must be at least 8 characters",
				path: ["password"],
			});
		}

		if (!value.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Confirm password is required",
				path: ["confirmPassword"],
			});
		} else if (value.confirmPassword.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Password must be at least 8 characters",
				path: ["confirmPassword"],
			});
		}

		if (
			value.password &&
			value.confirmPassword &&
			value.password !== value.confirmPassword
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Passwords do not match",
				path: ["confirmPassword"],
			});
		}
	});

type AddInvitation = z.infer<typeof addInvitation>;

export const AddInvitation = () => {
	const [open, setOpen] = useState(false);
	const utils = api.useUtils();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: emailProviders } =
		api.notification.getEmailProviders.useQuery();
	const { mutateAsync: inviteMember, isPending: isInviting } =
		api.organization.inviteMember.useMutation();
	const { mutateAsync: sendInvitation } = api.user.sendInvitation.useMutation();
	const { mutateAsync: createUserWithCredentials, isPending: isCreating } =
		api.user.createUserWithCredentials.useMutation();
	const { data: customRoles } = api.customRole.all.useQuery();
	const [error, setError] = useState<string | null>(null);

	const form = useForm<AddInvitation>({
		defaultValues: {
			mode: "invitation",
			email: "",
			role: "member",
			notificationId: "",
			password: "",
			confirmPassword: "",
			limitRam: 0,
			limitCpu: 0,
			limitDisk: 0,
			limitServices: 0,
			expirationEnabled: false,
			expirationDate: getDateAfterThreeDays(),
		},
		resolver: zodResolver(addInvitation),
	});

	const mode = form.watch("mode");

	useEffect(() => {
		form.reset();
	}, [form, form.formState.isSubmitSuccessful, form.reset]);

	useEffect(() => {
		if (isCloud && form.getValues("mode") === "credentials") {
			form.setValue("mode", "invitation");
		}
	}, [form, isCloud]);

	const onSubmit = async (data: AddInvitation) => {
		setError(null);

		try {
			if (data.mode === "credentials") {
				await createUserWithCredentials({
					email: data.email.toLowerCase(),
					password: data.password!,
					role: data.role,
					limitRam: data.limitRam || 0,
					limitCpu: data.limitCpu || 0,
					limitDisk: data.limitDisk || 0,
					limitServices: data.limitServices || 0,
					expirationDate: data.expirationEnabled
						? new Date(
								`${data.expirationDate}T23:59:59.999+05:30`,
							).toISOString()
						: undefined,
				});
				toast.success("User created with initial credentials");
				setOpen(false);
			} else {
				const result = await inviteMember({
					email: data.email.toLowerCase(),
					role: data.role,
					limitServices: data.limitServices || 0,
					expirationDate: data.expirationEnabled
						? new Date(
								`${data.expirationDate}T23:59:59.999+05:30`,
							).toISOString()
						: undefined,
				});

				if (!isCloud && data.notificationId) {
					await sendInvitation({
						invitationId: result!.id,
						notificationId: data.notificationId || "",
					})
						.then(() => {
							toast.success("Invitation created and email sent");
						})
						.catch((error: any) => {
							toast.error(error.message);
						});
				} else {
					toast.success("Invitation created");
				}

				setOpen(false);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create user";
			setError(message);
			toast.error(message);
		} finally {
			await Promise.all([
				utils.organization.allInvitations.invalidate(),
				utils.user.all.invalidate(),
			]);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger className="" asChild>
				<Button>
					<PlusIcon className="h-4 w-4" /> Add Invitation
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add Invitation</DialogTitle>
					<DialogDescription>
						{mode === "credentials"
							? "Create a user with initial credentials"
							: "Invite a new user"}
					</DialogDescription>
				</DialogHeader>
				{error && <AlertBlock type="error">{error}</AlertBlock>}

				<Form {...form}>
					<form
						id="hook-form-add-invitation"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4 "
					>
						{!isCloud && (
							<FormField
								control={form.control}
								name="mode"
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>Invite Method</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select invite method" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="invitation">
														Invitation Link
													</SelectItem>
													<SelectItem value="credentials">
														Initial Credentials
													</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												Choose between invitation link flow or direct
												credentials provisioning
											</FormDescription>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						)}

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => {
								return (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input placeholder={"email@dash.regz.lk"} {...field} />
										</FormControl>
										<FormDescription>
											This will be the email of the new user
										</FormDescription>
										<FormMessage />
									</FormItem>
								);
							}}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => {
								return (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="member">Member</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
												{customRoles?.map((role) => (
													<SelectItem key={role.role} value={role.role}>
														{role.role}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>
											Select the role for the new user
										</FormDescription>
										<FormMessage />
									</FormItem>
								);
							}}
						/>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
							<FormField
								control={form.control}
								name="limitRam"
								render={({ field }) => (
									<FormItem>
										<FormLabel>RAM Limit (MB)</FormLabel>
										<FormControl>
											<NumberInput placeholder="0 = Unlimited" {...field} />
										</FormControl>
										<FormDescription>Max Memory</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="limitCpu"
								render={({ field }) => (
									<FormItem>
										<FormLabel>CPU Cores Limit</FormLabel>
										<FormControl>
											<NumberInput
												step="0.1"
												placeholder="0 = Unlimited"
												{...field}
											/>
										</FormControl>
										<FormDescription>Max CPUs</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="limitDisk"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Disk Limit (GB)</FormLabel>
										<FormControl>
											<NumberInput placeholder="0 = Unlimited" {...field} />
										</FormControl>
										<FormDescription>Max Storage</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="limitServices"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Service Limit</FormLabel>
										<FormControl>
											<NumberInput placeholder="0 = Unlimited" {...field} />
										</FormControl>
										<FormDescription>
											Maximum services this user can create
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="space-y-3">
							<FormField
								control={form.control}
								name="expirationEnabled"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-md border border-zinc-800 p-3">
										<div>
											<FormLabel>Set an expiration date</FormLabel>
											<FormDescription>
												Turn this on to test the 3-day expiration warning.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							{form.watch("expirationEnabled") && (
								<FormField
									control={form.control}
									name="expirationDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>User expiration date</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormDescription>
												Choose a date up to 3 days away to test the warning
												banner.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>

						{!isCloud && mode === "invitation" && (
							<FormField
								control={form.control}
								name="notificationId"
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>Email Provider</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select an email provider" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{emailProviders?.map((provider) => (
														<SelectItem
															key={provider.notificationId}
															value={provider.notificationId}
														>
															{provider.name}
														</SelectItem>
													))}
													<SelectItem value="none" disabled>
														None
													</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												Select the email provider to send the invitation
											</FormDescription>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						)}

						{!isCloud && mode === "credentials" && (
							<>
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>Password</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Enter initial password"
														{...field}
													/>
												</FormControl>
												<FormDescription>
													The user can sign in with this password immediately
												</FormDescription>
												<FormMessage />
											</FormItem>
										);
									}}
								/>

								<FormField
									control={form.control}
									name="confirmPassword"
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>Confirm Password</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Confirm initial password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							</>
						)}

						<DialogFooter className="flex w-full flex-row">
							<Button
								isLoading={isInviting || isCreating}
								form="hook-form-add-invitation"
								type="submit"
							>
								Create
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
