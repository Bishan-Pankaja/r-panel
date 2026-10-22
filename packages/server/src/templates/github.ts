import { parse } from "toml";

/**
 * Complete template interface that includes both metadata and configuration
 */
export interface CompleteTemplate {
	metadata: {
		id: string;
		name: string;
		description: string;
		tags: string[];
		version: string;
		logo: string;
		links: {
			github: string;
			website?: string;
			docs?: string;
		};
	};
	variables: {
		[key: string]: string;
	};
	config: {
		isolated?: boolean;
		domains: Array<{
			serviceName: string;
			port: number;
			path?: string;
			host?: string;
		}>;
		env: Record<string, string>;
		mounts?: Array<{
			filePath: string;
			content: string;
		}>;
	};
}

interface TemplateMetadata {
	id: string;
	name: string;
	description: string;
	version: string;
	logo: string;
	links: {
		github: string;
		website?: string;
		docs?: string;
	};
	tags: string[];
}

const DEFAULT_TEMPLATES_URL = "https://templates.dokploy.com";

/**
 * Fetches the list of available templates from meta.json
 */
export async function fetchTemplatesList(
	baseUrl?: string,
): Promise<TemplateMetadata[]> {
	const urlsToTry = [baseUrl || DEFAULT_TEMPLATES_URL];

	for (const url of urlsToTry) {
		try {
			const response = await fetch(`${url}/meta.json`, {
				signal: AbortSignal.timeout(10000),
			});
			if (response.ok) {
				const templates = (await response.json()) as TemplateMetadata[];
				return templates.map((template) => ({
					id: template.id,
					name: template.name,
					description: template.description,
					version: template.version,
					logo: template.logo,
					links: template.links,
					tags: template.tags,
				}));
			}
		} catch (error) {
			console.warn(`Failed to fetch templates from ${url}:`, error);
		}
	}

	throw new Error("Failed to fetch templates from all template sources");
}

/**
 * Fetches a specific template's files
 */
export async function fetchTemplateFiles(
	templateId: string,
	baseUrl?: string,
): Promise<{ config: CompleteTemplate; dockerCompose: string }> {
	const urlsToTry = [baseUrl || DEFAULT_TEMPLATES_URL];

	for (const url of urlsToTry) {
		try {
			const timeout = AbortSignal.timeout(10000);
			const [templateYmlResponse, dockerComposeResponse] = await Promise.all([
				fetch(`${url}/blueprints/${templateId}/template.toml`, {
					signal: timeout,
				}),
				fetch(`${url}/blueprints/${templateId}/docker-compose.yml`, {
					signal: timeout,
				}),
			]);

			if (templateYmlResponse.ok && dockerComposeResponse.ok) {
				const [templateYml, dockerCompose] = await Promise.all([
					templateYmlResponse.text(),
					dockerComposeResponse.text(),
				]);

				const config = parse(templateYml) as CompleteTemplate;
				return { config, dockerCompose };
			}
		} catch (error) {
			console.warn(`Failed to fetch template files from ${url}:`, error);
		}
	}

	throw new Error("Template files not found");
}
