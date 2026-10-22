import { TemplateGenerator } from "@/components/dashboard/project/ai/template-generator";

interface Props {
	environmentId: string;
	projectName?: string;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const AddAiAssistant = ({
	environmentId,
	isOpen,
	onOpenChange,
}: Props) => {
	return (
		<TemplateGenerator
			environmentId={environmentId}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
		/>
	);
};
