# R-Panel Custom Nixpacks Configuration

## Custom Config Filenames

R-Panel supports alternative config filenames instead of `nixpacks.toml`.  
You can use any of the following filenames in your project root:

| Config File | Description |
|---|---|
| `regz.toml` | Primary custom name — recommended |
| `rpanel.toml` | Alternative alias |
| `deploy.toml` | Generic deploy config name |
| `nixpacks.toml` | Default Nixpacks name (always works) |

**Example:** Create a `regz.toml` in your project root:

```toml
providers = ["python"]

[phases.setup]
nixPkgs = ["python311", "poetry"]

[phases.install]
cmds = ["poetry install"]

[phases.start]
cmd = "poetry run gunicorn app:app -b 0.0.0.0:8000"
```

> **Priority:** If `nixpacks.toml` exists, it takes priority. Custom names are only used when `nixpacks.toml` is absent.

---

## Auto-Detection: Supported Languages

When no `nixpacks.toml` / `regz.toml` exists with `providers = [...]`, R-Panel auto-detects your project type by scanning for these trigger files:

| # | Language | Provider | Trigger Files |
|---|----------|----------|---------------|
| 1 | **Clojure** | `clojure` | `project.clj` or `build.clj` |
| 2 | **COBOL** | `cobol` | `*.cbl` |
| 3 | **Crystal** | `crystal` | `shard.yml` |
| 4 | **C# (.NET)** | `csharp` | `*.csproj` |
| 5 | **Dart** | `dart` | `pubspec.yaml` |
| 6 | **Elixir** | `elixir` | `mix.exs` |
| 7 | **F# (.NET)** | `fsharp` | `*.fsproj` |
| 8 | **Gleam** | `gleam` | `gleam.toml` + `manifest.toml` |
| 9 | **Go** | `go` | `go.mod` or `main.go` |
| 10 | **Haskell** | `haskell` | `package.yaml` + `*.hs` |
| 11 | **Java** | `java` | `pom.xml` or `gradlew` |
| 12 | **Lunatic** | `lunatic` | `Cargo.toml` + `.cargo/config.toml` with `runner = "lunatic"` |
| 13 | **Node.js** | `node` | `package.json` |
| 14 | **PHP** | `php` | `composer.json` or `index.php` |
| 15 | **Python** | `python` | `requirements.txt` / `setup.py` / `Pipfile` / `pyproject.toml` / `main.py` |
| 16 | **Ruby** | `ruby` | `Gemfile` |
| 17 | **Rust** | `rust` | `Cargo.toml` |
| 18 | **Scala** | `scala` | `build.sbt` |
| 19 | **Scheme** | `scheme` | `haunt.scm` |
| 20 | **Staticfile** | `staticfile` | `Staticfile` or `public/` dir or `index.html` |
| 21 | **Swift** | `swift` | `Package.swift` |
| 22 | **Zig** | `zig` | `*.zig` |

### Detection Priority

1. If `nixpacks.toml` (or custom config) **already has** `providers = [...]`, it's used as-is.
2. If not, R-Panel checks trigger files **in the order above** (specific → generic).
3. If nothing matches, Nixpacks auto-detects on its own (all providers tried).

---

## Node.js-Specific Behavior

When Node.js is detected, two additional fixes are applied automatically:

- `./node_modules/.bin/serve` → `npx serve` (the `serve` package may not be in your dependencies)
- `-l $PORT` → `-l 3000` (Docker Swarm doesn't always set the `PORT` env var at runtime)

These fixes are **only** applied to Node.js projects.

---

## Override Auto-Detection

To skip auto-detection entirely, create a `regz.toml` (or `nixpacks.toml`) with explicit providers:

```toml
providers = ["python", "node"]
```

This tells Nixpacks to use multiple providers. R-Panel respects this and won't modify it.

---

## Supported Runtime Images

For Python projects, you can specify the Python version in `regz.toml`:

```toml
[phases.setup]
nixPkgs = ["python311"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[phases.start]
cmd = "gunicorn app:app"
```

For Node.js, you can set the Node version:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.start]
cmd = "npm start"
```
