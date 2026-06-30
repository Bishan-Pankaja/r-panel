import path from "node:path";
import { getStaticCommand } from "@dokploy/server/utils/builders/static";
import { nanoid } from "nanoid";
import { prepareEnvironmentVariablesForShell } from "../docker/utils";
import { getBuildAppDirectory } from "../filesystem/directory";
import type { ApplicationNested } from ".";

export const getNixpacksCommand = (application: ApplicationNested) => {
	const { env, appName, publishDirectory, cleanCache } = application;

	const buildAppDirectory = getBuildAppDirectory(application);
	const buildContainerId = `${appName}-${nanoid(10)}`;
	const envVariables = prepareEnvironmentVariablesForShell(
		env,
		application.environment.project.env,
		application.environment.env,
	);

	const args = ["build", buildAppDirectory, "--name", appName];

	if (cleanCache) {
		args.push("--no-cache");
	}

	for (const env of envVariables) {
		args.push("--env", env);
	}

	if (publishDirectory) {
		/* No need for any start command, since we'll use nginx later on */
		args.push("--no-error-without-start");
	}
	const command = `nixpacks ${args.join(" ")}`;

	// Set up providers: respect existing nixpacks.toml, otherwise default to node.
	// Also remove Bun/Deno trigger files to prevent unwanted auto-detection.
	const nixpacksConfigPath = path.join(buildAppDirectory, "nixpacks.toml");
	const providersBashCmd = `
rm -f "${buildAppDirectory}/bun.lockb" "${buildAppDirectory}/bun.lock" "${buildAppDirectory}/deno.json" "${buildAppDirectory}/deno.jsonc"
rm -rf "${buildAppDirectory}/supabase/functions" "${buildAppDirectory}/.supabase"
if grep -q '^providers' "${nixpacksConfigPath}" 2>/dev/null; then
	echo "nixpacks.toml already has providers (respecting user config)";
else
	{ echo 'providers = ["node"]'; cat "${nixpacksConfigPath}" 2>/dev/null || true; } > /tmp/nixpacks.toml.tmp
	mv /tmp/nixpacks.toml.tmp "${nixpacksConfigPath}"
	# Node-specific: replace serve binary + hardcode port
	sed -i 's|\\./node_modules/\\.bin/serve|npx serve|g' "${nixpacksConfigPath}"
	sed -i 's|-l $PORT|-l 3000|g' "${nixpacksConfigPath}"
fi
`;

	let bashCommand = `
		echo "Starting nixpacks build..." ;
		${providersBashCmd}
		${command} || {
			echo "❌ Nixpacks build failed" ;
			exit 1;
		}
		echo "✅ Nixpacks build completed." ;
		`;

	/*
		Run the container with the image created by nixpacks,
		and copy the artifacts on the host filesystem.
		Then, remove the container and create a static build.
	 */
	if (publishDirectory) {
		const localPath = path.join(buildAppDirectory, publishDirectory);
		const isDirectory =
			publishDirectory.endsWith("/") || !path.extname(publishDirectory);

		bashCommand += `
	docker create --name ${buildContainerId} ${appName}
	mkdir -p ${localPath}
	docker cp ${buildContainerId}:/app/${publishDirectory}${isDirectory ? "/." : ""} ${path.join(buildAppDirectory, publishDirectory)} || {
		docker rm ${buildContainerId}
		echo "❌ Copying ${publishDirectory} to ${path.join(buildAppDirectory, publishDirectory)} failed" ;
		exit 1;
	}
	docker rm ${buildContainerId}
	${getStaticCommand(application)}
				`;
	}

	return bashCommand;
};
