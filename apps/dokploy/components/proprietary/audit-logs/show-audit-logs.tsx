import { ClipboardList } from "lucide-react";
import React from "react";

import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { columns } from "./columns";
import { type AuditLogFilters, DataTable } from "./data-table";

function AuditLogsContent() {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [pageSize, setPageSize] = React.useState(50);
	const [filters, setFilters] = React.useState<AuditLogFilters>({
		userEmail: "",
		resourceName: "",
		action: "",
		resourceType: "",
		dateRange: undefined,
	});

	const [debouncedText, setDebouncedText] = React.useState({
		userEmail: "",
		resourceName: "",
	});

	React.useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedText({
				userEmail: filters.userEmail,
				resourceName: filters.resourceName,
			});
			setPageIndex(0);
		}, 400);
		return () => clearTimeout(t);
	}, [filters.userEmail, filters.resourceName]);

	const handleFilterChange = <K extends keyof AuditLogFilters>(
		key: K,
		value: AuditLogFilters[K],
	) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		if (key !== "userEmail" && key !== "resourceName") {
			setPageIndex(0);
		}
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setPageIndex(0);
	};

	const { data, isLoading } = api.auditLog.all.useQuery({
		userEmail: debouncedText.userEmail || undefined,
		resourceName: debouncedText.resourceName || undefined,
		action: filters.action || undefined,
		resourceType: filters.resourceType || undefined,
		from: filters.dateRange?.from,
		to: filters.dateRange?.to,
		limit: pageSize,
		offset: pageIndex * pageSize,
	});

	return (
		<DataTable
			columns={columns}
			data={data?.logs ?? []}
			total={data?.total ?? 0}
			pageIndex={pageIndex}
			pageSize={pageSize}
			filters={filters}
			onPageChange={setPageIndex}
			onPageSizeChange={handlePageSizeChange}
			onFilterChange={handleFilterChange}
			isLoading={isLoading}
		/>
	);
}

export function ShowAuditLogs() {
	return (
		<div className="w-full p-4 md:p-6 flex flex-col gap-6">
			<div className="w-full overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] shadow-lg">
				<CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center p-4 border-b border-zinc-800/40">
					<div>
						<CardTitle className="text-xl flex flex-row gap-2 text-white">
							<ClipboardList className="size-6 text-muted-foreground self-center" />
							Audit Logs
						</CardTitle>
						<CardDescription className="text-zinc-400 mt-1">
							Track all actions performed by members in your organization.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="p-4">
					<AuditLogsContent />
				</CardContent>
			</div>
		</div>
	);
}
