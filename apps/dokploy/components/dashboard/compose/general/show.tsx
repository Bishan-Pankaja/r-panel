import { ShowProviderFormCompose } from "./generic/show";

interface Props {
	composeId: string;
}

export const ShowGeneralCompose = ({ composeId }: Props) => {
	return <ShowProviderFormCompose composeId={composeId} />;
};
