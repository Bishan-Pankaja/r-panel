import { ShowBuildChooseForm } from "@/components/dashboard/application/build/show";
import { ShowProviderForm } from "@/components/dashboard/application/general/generic/show";

interface Props {
	applicationId: string;
}

export const ShowGeneralApplication = ({ applicationId }: Props) => {
	return (
		<>
			<ShowProviderForm applicationId={applicationId} />
			<ShowBuildChooseForm applicationId={applicationId} />
		</>
	);
};
