import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	CheckCircle2,
	ChevronDown,
	Cloud,
	ExternalLink,
	GlobeIcon,
	InfoIcon,
	LayoutGrid,
	LayoutList,
	Loader2,
	PenBoxIcon,
	RefreshCw,
	Server,
	Trash2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { createColumns } from "./columns";
import { DnsHelperModal } from "./dns-helper-modal";
import { AddDomain } from "./handle-domain";
import { HandleForwardAuth } from "./handle-forward-auth";

export type ValidationState = {
	isLoading: boolean;
	isValid?: boolean;
	error?: string;
	resolvedIp?: string;
	message?: string;
	cdnProvider?: string;
};

export type ValidationStates = Record<string, ValidationState>;

interface Props {
	id: string;
	type: "application" | "compose";
}

export const ShowDomains = ({ id, type }: Props) => {
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canCreateDomain = permissions?.domain.create ?? false;
	const canDeleteDomain = permissions?.domain.delete ?? false;
	const { data: application } =
		type === "application"
			? api.application.one.useQuery(
					{
						applicationId: id,
					},
					{
						enabled: !!id,
					},
				)
			: api.compose.one.useQuery(
					{
						composeId: id,
					},
					{
						enabled: !!id,
					},
				);
	const [validationStates, setValidationStates] = useState<ValidationStates>(
		{},
	);
	const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
		if (typeof window !== "undefined") {
			return (
				(localStorage.getItem("domains-view-mode") as "grid" | "table") ??
				"grid"
			);
		}
		return "grid";
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const { data: ip } = api.settings.getIp.useQuery();
	const { data: cloudflareAccount } =
		api.cloudflare.getConnectedAccount.useQuery();
	const { mutateAsync: autoConfigureDns, isPending: isAutoConfiguringDns } =
		api.cloudflare.autoConfigureDomainDns.useMutation();

	const {
		data,
		refetch,
		isLoading: isLoadingDomains,
	} = type === "application"
		? api.domain.byApplicationId.useQuery(
				{
					applicationId: id,
				},
				{
					enabled: !!id,
				},
			)
		: api.domain.byComposeId.useQuery(
				{
					composeId: id,
				},
				{
					enabled: !!id,
				},
			);

	const { mutateAsync: validateDomain } =
		api.domain.validateDomain.useMutation();
	const { mutateAsync: deleteDomain, isPending: isRemoving } =
		api.domain.delete.useMutation();

	const handleDeleteDomain = async (domainId: string) => {
		try {
			await deleteDomain({ domainId });
			refetch();
			toast.success("Domain deleted successfully");
		} catch {
			toast.error("Error deleting domain");
		}
	};

	const handleValidateDomain = async (host: string) => {
		setValidationStates((prev) => ({
			...prev,
			[host]: { isLoading: true },
		}));

		try {
			const result = await validateDomain({
				domain: host,
				serverIp:
					application?.server?.ipAddress?.toString() || ip?.toString() || "",
			});

			setValidationStates((prev) => ({
				...prev,
				[host]: {
					isLoading: false,
					isValid: result.isValid,
					error: result.error,
					resolvedIp: result.resolvedIp,
					cdnProvider: result.cdnProvider,
					message: result.error && result.isValid ? result.error : undefined,
				},
			}));
		} catch (err) {
			const error = err as Error;
			setValidationStates((prev) => ({
				...prev,
				[host]: {
					isLoading: false,
					isValid: false,
					error: error.message || "Failed to validate domain",
				},
			}));
		}
	};

	const handleAutoConfigureDns = async (domainId: string, host: string) => {
		try {
			await autoConfigureDns({ domainId });
			toast.success(
				"Cloudflare DNS record created. DNS propagation may take a few minutes.",
			);
			window.setTimeout(() => {
				void handleValidateDomain(host);
			}, 10_000);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to configure DNS with Cloudflare.",
			);
		}
	};

	const domainsRef = useRef(data);
	useEffect(() => {
		domainsRef.current = data;
	}, [data]);

	const validateDomainRef = useRef(handleValidateDomain);
	useEffect(() => {
		validateDomainRef.current = handleValidateDomain;
	}, [handleValidateDomain]);

	useEffect(() => {
		// Initial check on mount
		if (domainsRef.current) {
			domainsRef.current.forEach((domain) => {
				validateDomainRef.current(domain.host);
			});
		}

		// Interval check every 10s
		const interval = setInterval(() => {
			if (!domainsRef.current) return;
			domainsRef.current.forEach((domain) => {
				validateDomainRef.current(domain.host);
			});
		}, 10000);
		return () => clearInterval(interval);
	}, []);

	const columns = createColumns({
		id,
		type,
		validationStates,
		handleValidateDomain,
		handleDeleteDomain,
		isDeleting: isRemoving,
		serverIp: application?.server?.ipAddress?.toString() || ip?.toString(),
		canCreateDomain,
		canDeleteDomain,
		appName: application?.appName,
		hasCloudflareAccount: !!cloudflareAccount,
		handleAutoConfigureDns,
		isAutoConfiguringDns,
	});

	const customDomains = data || [];

	const table = useReactTable({
		data: customDomains,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	});

	return (
		<div className="flex w-full flex-col gap-5 ">
			<Card className="">
				<CardHeader className="flex flex-row items-center flex-wrap gap-4 justify-between">
					<div className="flex flex-col gap-1">
						<CardTitle className="text-xl">Domains</CardTitle>
						<CardDescription>
							Domains are used to access the application
						</CardDescription>
					</div>

					<div className="flex flex-row gap-2 flex-wrap">
						{customDomains.length > 0 && (
							<>
								<Button
									variant="outline"
									size="icon"
									onClick={() => {
										const next = viewMode === "grid" ? "table" : "grid";
										localStorage.setItem("domains-view-mode", next);
										setViewMode(next);
									}}
								>
									{viewMode === "grid" ? (
										<LayoutList className="size-4" />
									) : (
										<LayoutGrid className="size-4" />
									)}
								</Button>
								{canCreateDomain && (
									<AddDomain id={id} type={type}>
										<Button>
											<GlobeIcon className="size-4" /> Add Domain
										</Button>
									</AddDomain>
								)}
							</>
						)}
					</div>
				</CardHeader>
				<CardContent className="flex w-full flex-row gap-4">
					{isLoadingDomains ? (
						<div className="flex w-full flex-row gap-4 min-h-[40vh] justify-center items-center">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
							<span className="text-base text-muted-foreground">
								Loading domains...
							</span>
						</div>
					) : customDomains.length === 0 ? (
						<div className="flex w-full flex-col items-center justify-center gap-3 min-h-[40vh]">
							<GlobeIcon className="size-8 text-muted-foreground" />
							<span className="text-base text-muted-foreground">
								To access the application it is required to set at least 1
								domain
							</span>
							{canCreateDomain && (
								<div className="flex flex-row gap-4 flex-wrap">
									<AddDomain id={id} type={type}>
										<Button>
											<GlobeIcon className="size-4" /> Add Domain
										</Button>
									</AddDomain>
								</div>
							)}
						</div>
					) : viewMode === "table" ? (
						<div className="flex flex-col gap-4 w-full">
							<div className="flex items-center gap-2 max-sm:flex-wrap">
								<Input
									placeholder="Filter by host..."
									value={
										(table.getColumn("host")?.getFilterValue() as string) ?? ""
									}
									onChange={(event) =>
										table.getColumn("host")?.setFilterValue(event.target.value)
									}
									className="md:max-w-sm"
								/>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											className="sm:ml-auto max-sm:w-full"
										>
											Columns <ChevronDown className="ml-2 h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{table
											.getAllColumns()
											.filter((column) => column.getCanHide())
											.map((column) => {
												return (
													<DropdownMenuCheckboxItem
														key={column.id}
														className="capitalize"
														checked={column.getIsVisible()}
														onCheckedChange={(value) =>
															column.toggleVisibility(!!value)
														}
													>
														{column.id}
													</DropdownMenuCheckboxItem>
												);
											})}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow key={headerGroup.id}>
												{headerGroup.headers.map((header) => {
													return (
														<TableHead key={header.id}>
															{header.isPlaceholder
																? null
																: flexRender(
																		header.column.columnDef.header,
																		header.getContext(),
																	)}
														</TableHead>
													);
												})}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										{table?.getRowModel()?.rows?.length ? (
											table.getRowModel().rows.map((row) => (
												<TableRow
													key={row.id}
													data-state={row.getIsSelected() && "selected"}
												>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</TableCell>
													))}
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell
													colSpan={columns.length}
													className="h-24 text-center"
												>
													No results.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
							{customDomains.length > 0 && (
								<div className="flex items-center justify-end space-x-2 py-4">
									<div className="space-x-2 flex flex-wrap">
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2 w-full min-h-[40vh] ">
							{customDomains.map((item) => {
								const validationState = validationStates[item.host];
								return (
									<Card
										key={item.domainId}
										className="relative overflow-hidden w-full border border-zinc-800/80 transition-all hover:shadow-md bg-[#161616]/70 hover:bg-[#1a1a1a] h-fit rounded-xl"
									>
										<CardContent className="p-6 pt-8 sm:p-7 sm:pt-8">
											<div className="flex flex-col gap-5">
												{/* Service & Domain Info */}
												<div className="flex items-center flex-wrap gap-3">
													{item.serviceName && (
														<Badge variant="outline" className="w-fit">
															<Server className="size-3 mr-1" />
															{item.serviceName}
														</Badge>
													)}
													<div className="flex gap-2 flex-wrap">
														<DnsHelperModal
															domain={{
																host: item.host,
																https: item.https,
																path: item.path || undefined,
															}}
															serverIp={
																application?.server?.ipAddress?.toString() ||
																ip?.toString()
															}
															appName={application?.appName}
														/>
														{canCreateDomain && (
															<AddDomain
																id={id}
																type={type}
																domainId={item.domainId}
															>
																<Button
																	variant="ghost"
																	size="icon"
																	className="group hover:bg-blue-500/10"
																>
																	<PenBoxIcon className="size-3.5 text-primary group-hover:text-blue-500" />
																</Button>
															</AddDomain>
														)}
														{canCreateDomain && type === "application" && (
															<HandleForwardAuth
																domainId={item.domainId}
																applicationId={id}
															/>
														)}
														{canDeleteDomain && (
															<DialogAction
																title="Delete Domain"
																description="Are you sure you want to delete this domain?"
																type="destructive"
																onClick={async () => {
																	await deleteDomain({
																		domainId: item.domainId,
																	})
																		.then((_data) => {
																			refetch();
																			toast.success(
																				"Domain deleted successfully",
																			);
																		})
																		.catch(() => {
																			toast.error("Error deleting domain");
																		});
																}}
															>
																<Button
																	variant="ghost"
																	size="icon"
																	className="group hover:bg-red-500/10"
																	isLoading={isRemoving}
																>
																	<Trash2 className="size-4 text-primary group-hover:text-red-500" />
																</Button>
															</DialogAction>
														)}
													</div>
												</div>
												<div className="w-full break-all">
													<Link
														className="flex items-center gap-2 text-base font-medium hover:underline"
														target="_blank"
														href={`${item.https ? "https" : "http"}://${item.host}${item.path}`}
													>
														{item.host}
														<ExternalLink className="size-4 min-w-4" />
													</Link>
												</div>

												{/* Domain Details Summary Bar */}
												<div className="flex flex-wrap items-center gap-2 p-1.5 mt-1 bg-[#161616]/80 rounded-lg border border-zinc-800/80">
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-md transition-colors cursor-default">
																	<InfoIcon className="size-3.5 text-zinc-500" />
																	<span className="text-xs font-medium text-zinc-400">
																		Port
																	</span>
																	<span className="text-xs font-mono text-zinc-200">
																		{item.port}
																	</span>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>Container port exposed</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>

													<div className="w-px h-4 bg-zinc-800" />

													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-md transition-colors cursor-default">
																	<GlobeIcon className="size-3.5 text-zinc-500" />
																	<span className="text-xs font-medium text-zinc-400">
																		Protocol
																	</span>
																	<span className="text-xs font-mono text-zinc-200">
																		{item.https ? "HTTPS" : "HTTP"}
																	</span>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>
																	{item.https
																		? "Secure HTTPS connection"
																		: "Standard HTTP connection"}
																</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>

													{item.certificateType && (
														<>
															<div className="w-px h-4 bg-zinc-800" />
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-md transition-colors cursor-default">
																			<CheckCircle2 className="size-3.5 text-zinc-500" />
																			<span className="text-xs font-medium text-zinc-400">
																				Cert
																			</span>
																			<span className="text-xs font-mono text-zinc-200">
																				{item.certificateType}
																			</span>
																		</div>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>SSL Certificate Provider</p>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
														</>
													)}

													{item.middlewares && item.middlewares.length > 0 && (
														<>
															<div className="w-px h-4 bg-zinc-800" />
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-md transition-colors cursor-default">
																			<LayoutList className="size-3.5 text-zinc-500" />
																			<span className="text-xs font-medium text-zinc-400">
																				Middlewares
																			</span>
																			<span className="text-xs font-mono text-zinc-200">
																				{item.middlewares.length}
																			</span>
																		</div>
																	</TooltipTrigger>
																	<TooltipContent>
																		<div className="flex flex-col gap-1">
																			<p className="font-medium">
																				Traefik Middlewares:
																			</p>
																			<ul className="list-disc list-inside">
																				{item.middlewares.map((m, idx) => (
																					<li
																						key={idx}
																						className="text-zinc-300"
																					>
																						{m}
																					</li>
																				))}
																			</ul>
																		</div>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
														</>
													)}

													<div className="flex-1" />

													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className={`h-7 px-3 text-xs font-medium border ${
																		validationState?.isValid
																			? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20"
																			: validationState?.error
																				? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
																				: "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20"
																	}`}
																	onClick={() =>
																		handleValidateDomain(item.host)
																	}
																>
																	{validationState?.isLoading ? (
																		<>
																			<Loader2 className="size-3.5 mr-1.5 animate-spin" />
																			Checking DNS...
																		</>
																	) : validationState?.isValid ? (
																		<>
																			<CheckCircle2 className="size-3.5 mr-1.5" />
																			{validationState.message &&
																			validationState.cdnProvider
																				? `Behind ${validationState.cdnProvider}`
																				: "DNS Valid"}
																		</>
																	) : validationState?.error ? (
																		<>
																			<XCircle className="size-3.5 mr-1.5" />
																			Error
																		</>
																	) : (
																		<>
																			<RefreshCw className="size-3.5 mr-1.5" />
																			Validate DNS
																		</>
																	)}
																</Button>
															</TooltipTrigger>
															<TooltipContent className="max-w-xs">
																{validationState?.error ? (
																	<div className="flex flex-col gap-1">
																		<p className="font-medium text-red-500">
																			Error:
																		</p>
																		<p className="text-xs text-muted-foreground break-all">
																			{validationState.error}
																		</p>
																	</div>
																) : validationState?.isValid &&
																	validationState?.message ? (
																	<div className="flex flex-col gap-1">
																		<p className="font-medium text-green-500">
																			Warning:
																		</p>
																		<p className="text-xs text-muted-foreground break-all">
																			{validationState.message}
																		</p>
																	</div>
																) : validationState?.isValid ? (
																	<p>DNS records are correctly configured</p>
																) : (
																	<p>Click to check DNS configuration</p>
																)}
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
													{validationState?.error &&
														canCreateDomain &&
														(cloudflareAccount ? (
															<Button
																variant="outline"
																size="sm"
																className="h-7 gap-1.5 border-orange-500/30 bg-orange-500/10 px-2.5 text-xs text-orange-300 hover:bg-orange-500/20"
																disabled={isAutoConfiguringDns}
																onClick={() =>
																	handleAutoConfigureDns(
																		item.domainId,
																		item.host,
																	)
																}
															>
																{isAutoConfiguringDns ? (
																	<Loader2 className="size-3.5 animate-spin" />
																) : (
																	<Cloud className="size-3.5" />
																)}
																Auto-configure DNS
															</Button>
														) : (
															<Button
																variant="outline"
																size="sm"
																className="h-7 gap-1.5 px-2.5 text-xs"
																onClick={() =>
																	window.location.assign(
																		"/dashboard/settings/cloudflare",
																	)
																}
															>
																<Cloud className="size-3.5" />
																Connect Cloudflare
															</Button>
														))}
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
