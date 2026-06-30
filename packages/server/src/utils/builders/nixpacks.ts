import path from "node:path";
import { getStaticCommand } from "@dokploy/server/utils/builders/static";
import { nanoid } from "nanoid";
import { prepareEnvironmentVariablesForShell } from "../docker/utils";
import { getBuildAppDirectory } from "../filesystem/directory";
import type { ApplicationNested } from ".";

const CUSTOM_CONFIG_NAMES = ["regz.toml", "rpanel.toml", "deploy.toml"];

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
			`[ -f "$BUILD_DIR/${name}" ] && [ ! -f "$CONFIG_FILE" ] && { echo "📄 Detected custom config: ${name}"; cp "$BUILD_DIR/${name}" "$CONFIG_FILE"; }`,
	).join("\n");

	// Comprehensive project detection script for ALL Nixpacks-supported languages.
	// Detection files match Nixpacks v1.41+ provider detection logic exactly.
	// Bun/Deno trigger files are removed first to prevent auto-detection issues.
	// Custom config filenames (regz.toml, rpanel.toml, deploy.toml) are supported.
	const bashDetectionScript = `
# === Nixpacks Smart Configuration — All Languages ===
BUILD_DIR="${buildAppDirectory}"
CONFIG_FILE="${nixpacksConfigPath}"

remove_bun_deno_triggers() {
	rm -f "$BUILD_DIR/bun.lockb" "$BUILD_DIR/bun.lock" "$BUILD_DIR/deno.json" "$BUILD_DIR/deno.jsonc"
	rm -rf "$BUILD_DIR/supabase/functions" "$BUILD_DIR/.supabase"
}

set_providers() {
	local providers="$1"
	if [ -f "$CONFIG_FILE" ]; then
		echo "providers = [$providers]" > /tmp/nixpacks.toml.tmp
		cat "$CONFIG_FILE" 2>/dev/null | grep -v '^providers' >> /tmp/nixpacks.toml.tmp || true
		mv /tmp/nixpacks.toml.tmp "$CONFIG_FILE"
	else
		echo "providers = [$providers]" > "$CONFIG_FILE"
	fi
}

apply_node_fixes() {
	echo "🔧 Applying Node.js runtime fixes..."
	# Fix ./node_modules/.bin/serve path (serve may not be installed)
	sed -i 's|\\./node_modules/\\.bin/serve|npx serve|g' "$CONFIG_FILE"
	# Hardcode port 3000 (PORT env may not be available at runtime)
	sed -i 's|-l \\$PORT|-l 3000|g' "$CONFIG_FILE"
	echo "✅ Node.js runtime fixes applied"
}

# Step 1: Remove Bun/Deno trigger files (safe for all project types)
remove_bun_deno_triggers

# Step 2: Check for custom config filenames (e.g., regz.toml, rpanel.toml)
${customConfigChecks}

# Step 3: If config already has providers configured, respect it entirely
if [ -f "$CONFIG_FILE" ] && grep -q '^providers' "$CONFIG_FILE" 2>/dev/null; then
	echo "✅ Respecting existing provider configuration in $(basename "$CONFIG_FILE")"
	EXISTING_PROVIDER=$(grep '^providers' "$CONFIG_FILE" 2>/dev/null | grep -o '"[^"]*"' | head -1 | tr -d '"')
	if [ "$EXISTING_PROVIDER" = "node" ]; then
		apply_node_fixes
	fi

# Step 4: Auto-detect project type
# Order: most specific first, common frameworks last

# --- Clojure ---
elif [ -f "$BUILD_DIR/project.clj" ] || [ -f "$BUILD_DIR/build.clj" ]; then
	echo "🍄 Detected Clojure project"
	set_providers '"clojure"'

# --- COBOL ---
elif ls "$BUILD_DIR"/*.cbl 1>/dev/null 2>&1; then
	echo "⚙️  Detected COBOL project"
	set_providers '"cobol"'

# --- Crystal ---
elif [ -f "$BUILD_DIR/shard.yml" ]; then
	echo "💎 Detected Crystal project"
	set_providers '"crystal"'

# --- C# ---
elif ls "$BUILD_DIR"/*.csproj 1>/dev/null 2>&1; then
	echo "🔷 Detected C# (.NET) project"
	set_providers '"csharp"'

# --- Dart ---
elif [ -f "$BUILD_DIR/pubspec.yaml" ]; then
	echo "🎯 Detected Dart project"
	set_providers '"dart"'

# --- Elixir ---
elif [ -f "$BUILD_DIR/mix.exs" ]; then
	echo "💧 Detected Elixir project"
	set_providers '"elixir"'

# --- F# ---
elif ls "$BUILD_DIR"/*.fsproj 1>/dev/null 2>&1; then
	echo "🔶 Detected F# (.NET) project"
	set_providers '"fsharp"'

# --- Gleam ---
elif [ -f "$BUILD_DIR/gleam.toml" ] && [ -f "$BUILD_DIR/manifest.toml" ]; then
	echo "🌟 Detected Gleam project"
	set_providers '"gleam"'

# --- Go ---
elif [ -f "$BUILD_DIR/go.mod" ] || [ -f "$BUILD_DIR/main.go" ]; then
	echo "🔵 Detected Go project"
	set_providers '"go"'

# --- Haskell ---
elif [ -f "$BUILD_DIR/package.yaml" ] && ls "$BUILD_DIR"/*.hs 1>/dev/null 2>&1; then
	echo "λ Detected Haskell project"
	set_providers '"haskell"'

# --- Java ---
elif [ -f "$BUILD_DIR/pom.xml" ] || [ -f "$BUILD_DIR/gradlew" ]; then
	echo "☕ Detected Java project"
	set_providers '"java"'

# --- Lunatic (Rust + lunatic runner) ---
elif [ -f "$BUILD_DIR/Cargo.toml" ] && [ -f "$BUILD_DIR/.cargo/config.toml" ] && grep -q 'runner.*=.*"lunatic"' "$BUILD_DIR/.cargo/config.toml" 2>/dev/null; then
	echo "🌙 Detected Lunatic project"
	set_providers '"lunatic"'

# --- Node.js ---
elif [ -f "$BUILD_DIR/package.json" ]; then
	echo "🔍 Detected Node.js project"
	set_providers '"node"'
	apply_node_fixes

# --- PHP ---
elif [ -f "$BUILD_DIR/composer.json" ] || [ -f "$BUILD_DIR/index.php" ]; then
	echo "🐘 Detected PHP project"
	set_providers '"php"'

# --- Python ---
elif [ -f "$BUILD_DIR/requirements.txt" ] || [ -f "$BUILD_DIR/setup.py" ] || [ -f "$BUILD_DIR/Pipfile" ] || [ -f "$BUILD_DIR/pyproject.toml" ] || [ -f "$BUILD_DIR/main.py" ]; then
	echo "🐍 Detected Python project"
	set_providers '"python"'

# --- Ruby ---
elif [ -f "$BUILD_DIR/Gemfile" ]; then
	echo "💎 Detected Ruby project"
	set_providers '"ruby"'

# --- Rust ---
elif [ -f "$BUILD_DIR/Cargo.toml" ]; then
	echo "🦀 Detected Rust project"
	set_providers '"rust"'

# --- Scala ---
elif [ -f "$BUILD_DIR/build.sbt" ]; then
	echo "🔆 Detected Scala project"
	set_providers '"scala"'

# --- Scheme ---
elif [ -f "$BUILD_DIR/haunt.scm" ]; then
	echo "λ Detected Scheme project"
	set_providers '"scheme"'

# --- Staticfile ---
elif [ -f "$BUILD_DIR/Staticfile" ] || [ -d "$BUILD_DIR/public" ] || [ -f "$BUILD_DIR/index.html" ]; then
	echo "📄 Detected Staticfile project"
	set_providers '"staticfile"'

# --- Swift ---
elif [ -f "$BUILD_DIR/Package.swift" ]; then
	echo "🐦 Detected Swift project"
	set_providers '"swift"'

# --- Zig ---
elif ls "$BUILD_DIR"/*.zig 1>/dev/null 2>&1; then
	echo "⚡ Detected Zig project"
	set_providers '"zig"'

# --- No specific project type detected ---
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
