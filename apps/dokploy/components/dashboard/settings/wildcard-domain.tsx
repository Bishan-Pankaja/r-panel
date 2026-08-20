import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { GlobeIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";

const updateWildcardDomain = z.object({
	dnsGatewayDomain: z.string().optional().nullable(),
	mainPanelDomain: z.string().optional().nullable(),
	wildcardDomain: z.string().optional().nullable(),
	previewDomain: z.string().optional().nullable(),
});

type UpdateWildcardDomain = z.infer<typeof updateWildcardDomain>;

export const WildcardDomain = () => {
	const { data, refetch } = api.settings.getWebServerSettings.useQuery();
	const { mutateAsync, isPending } =
		api.settings.updateWebServerSettings.useMutation();

	const form = useForm<UpdateWildcardDomain>({
		defaultValues: {
			dnsGatewayDomain: "",
			mainPanelDomain: "",
			wildcardDomain: "",
			previewDomain: "",
		},
		resolver: zodResolver(updateWildcardDomain),
	});

	useEffect(() => {
		if (data) {
			form.reset({
				dnsGatewayDomain: data.dnsGatewayDomain || "",
				mainPanelDomain: data.mainPanelDomain || "",
				wildcardDomain: data.wildcardDomain || "",
				previewDomain: data.previewDomain || "",
			});
		}
	}, [form, data]);

	const onSubmit = async (formData: UpdateWildcardDomain) => {
		await mutateAsync({
			dnsGatewayDomain: formData.dnsGatewayDomain,
			mainPanelDomain: formData.mainPanelDomain,
			wildcardDomain: formData.wildcardDomain,
			previewDomain: formData.previewDomain,
		})
			.then(async () => {
				await refetch();
				toast.success("Wildcard Domain Settings Updated");
			})
			.catch(() => {
				toast.error("Error updating wildcard domain settings");
			});
	};

	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center">
						<div className="flex flex-col gap-1">
							<CardTitle className="text-xl flex flex-row gap-2">
								<GlobeIcon className="size-6 text-muted-foreground self-center" />
								DNS Wildcard Settings
							</CardTitle>
							<CardDescription>
								Configure DNS Wildcard and Preview Domain settings for auto-generating domains on creation.
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="space-y-2 py-6 border-t">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="grid w-full gap-4 grid-cols-2"
							>
								<FormField
									control={form.control}
									name="dnsGatewayDomain"
									render={({ field }) => (
										<FormItem className="col-span-2 md:col-span-1">
											<FormLabel>DNS Gateway Domain</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="dns.regz.lk"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="mainPanelDomain"
									render={({ field }) => (
										<FormItem className="col-span-2 md:col-span-1">
											<FormLabel>Main Panel Domain</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="dash.regz.lk"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="wildcardDomain"
									render={({ field }) => (
										<FormItem className="col-span-2 md:col-span-1">
											<FormLabel>Wildcard Domain</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="*.dns.regz.lk"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="previewDomain"
									render={({ field }) => (
										<FormItem className="col-span-2 md:col-span-1">
											<FormLabel>Preview Domain</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="preview.regz.lk"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="flex w-full justify-end col-span-2 mt-4">
									<Button isLoading={isPending} type="submit">
										Save
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
