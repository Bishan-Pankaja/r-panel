import path from "node:path";
import { getStaticCommand } from "@dokploy/server/utils/builders/static";
import { nanoid } from "nanoid";
import { prepareEnvironmentVariablesForShell } from "../docker/utils";
import { getBuildAppDirectory } from "../filesystem/directory";
import type { ApplicationNested } from ".";

const CUSTOM_CONFIG_NAMES = ["rpanel.toml", "regz.toml", "deploy.toml"];

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

	const nixpacksConfigPath = path.join(buildAppDirectory, "nixpacks.toml");
	const customConfigChecks = CUSTOM_CONFIG_NAMES.map(
		(name) =>
			`[ -f "$BUILD_DIR/${name}" ] && [ ! -f "$CONFIG_FILE" ] && { echo "📄 Detected custom config: ${name}"; cp "$BUILD_DIR/${name}" "$CONFIG_FILE"; CONFIG_FILE="$CONFIG_FILE"; }`,
	).join("\n");

	// Smart auto-detection script: removes Bun/Deno triggers, detects project type,
	// and configures Nixpacks accordingly. Respects existing nixpacks.toml with providers.
	const bashDetectionScript = `
# === Nixpacks Smart Configuration ===
BUILD_DIR="${buildAppDirectory}"
CONFIG_FILE="${nixpacksConfigPath}"

# Remove Bun/Deno/Supabase trigger files that confuse Nixpacks auto-detection (safe for all)
rm -f "$BUILD_DIR/bun.lockb" "$BUILD_DIR/bun.lock" "$BUILD_DIR/deno.json" "$BUILD_DIR/deno.jsonc"
rm -rf "$BUILD_DIR/supabase/functions" "$BUILD_DIR/.supabase"

# Check for custom config filenames (e.g., regz.toml, rpanel.toml)
${customConfigChecks}

# If config already has providers configured, respect it entirely
if [ -f "$CONFIG_FILE" ] && grep -q '^providers' "$CONFIG_FILE" 2>/dev/null; then
	echo "✅ Respecting existing provider configuration in $(basename "$CONFIG_FILE")"

elif [ -f "$BUILD_DIR/package.json" ]; then
	echo "🔍 Detected Node.js project"
	# Force Node.js provider to prevent Bun/Deno auto-detection
	{ echo 'providers = ["node"]'; cat "$CONFIG_FILE" 2>/dev/null | grep -v '^providers' || true; } > /tmp/nixpacks.toml.tmp
	mv /tmp/nixpacks.toml.tmp "$CONFIG_FILE"
	# Fix ./node_modules/.bin/serve path (serve may not be installed)
	sed -i 's|\\./node_modules/\\.bin/serve|npx serve|g' "$CONFIG_FILE"
	# Hardcode port 3000 (PORT env may not be available at runtime)
	sed -i 's|-l \\$PORT|-l 3000|g' "$CONFIG_FILE"
	echo "✅ Node.js project configured"

elif [ -f "$BUILD_DIR/requirements.txt" ] || [ -f "$BUILD_DIR/setup.py" ] || [ -f "$BUILD_DIR/Pipfile" ] || [ -f "$BUILD_DIR/pyproject.toml" ]; then
	echo "🐍 Detected Python project"
	if [ ! -f "$CONFIG_FILE" ]; then
		echo 'providers = ["python"]' > "$CONFIG_FILE"
	fi
	echo "✅ Python project configured"

elif [ -f "$BUILD_DIR/composer.json" ]; then
	echo "🐘 Detected PHP project"
	if [ ! -f "$CONFIG_FILE" ]; then
		echo 'providers = ["php"]' > "$CONFIG_FILE"
	fi
	echo "✅ PHP project configured"

elif [ -f "$BUILD_DIR/go.mod" ]; then
	echo "🔵 Detected Go project"
	if [ ! -f "$CONFIG_FILE" ]; then
		echo 'providers = ["go"]' > "$CONFIG_FILE"
	fi
	echo "✅ Go project configured"

elif [ -f "$BUILD_DIR/Cargo.toml" ]; then
	echo "🦀 Detected Rust project"
	if [ ! -f "$CONFIG_FILE" ]; then
		echo 'providers = ["rust"]' > "$CONFIG_FILE"
	fi
	echo "✅ Rust project configured"

else
	echo "ℹ️  No specific project type detected - letting Nixpacks auto-detect"
fi
`;

	let bashCommand = `
		echo "Starting nixpacks build..." ;
		${bashDetectionScript}
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
