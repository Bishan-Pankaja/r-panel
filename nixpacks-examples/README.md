# R-Panel Nixpacks Configuration Examples

This folder contains ready-to-use `regz.toml` examples for all 22 Nixpacks-supported languages.

## How to Use

1. Find your language folder below
2. Copy the `regz.toml` file to your project root
3. Customize versions, commands, and dependencies as needed
4. R-Panel will auto-detect `regz.toml` during build

## Index

| # | Language | Folder | Trigger Files |
|---|----------|--------|---------------|
| 1 | Clojure | [clojure/](./clojure/) | `project.clj` / `build.clj` |
| 2 | COBOL | [cobol/](./cobol/) | `*.cbl` |
| 3 | Crystal | [crystal/](./crystal/) | `shard.yml` |
| 4 | C# (.NET) | [csharp/](./csharp/) | `*.csproj` |
| 5 | Dart | [dart/](./dart/) | `pubspec.yaml` |
| 6 | Elixir | [elixir/](./elixir/) | `mix.exs` |
| 7 | F# (.NET) | [fsharp/](./fsharp/) | `*.fsproj` |
| 8 | Gleam | [gleam/](./gleam/) | `gleam.toml` + `manifest.toml` |
| 9 | Go | [golang/](./golang/) | `go.mod` / `main.go` |
| 10 | Haskell | [haskell/](./haskell/) | `package.yaml` + `*.hs` |
| 11 | Java | [java/](./java/) | `pom.xml` / `gradlew` |
| 12 | Lunatic | [lunatic/](./lunatic/) | `Cargo.toml` + `runner = "lunatic"` |
| 13 | Node.js | [nodejs/](./nodejs/) | `package.json` |
| 14 | PHP | [php/](./php/) | `composer.json` / `index.php` |
| 15 | Python | [python/](./python/) | `requirements.txt` / `Pipfile` / `pyproject.toml` / `setup.py` / `main.py` |
| 16 | Ruby | [ruby/](./ruby/) | `Gemfile` |
| 17 | Rust | [rust/](./rust/) | `Cargo.toml` |
| 18 | Scala | [scala/](./scala/) | `build.sbt` |
| 19 | Scheme | [scheme/](./scheme/) | `haunt.scm` |
| 20 | Staticfile | [staticfile/](./staticfile/) | `Staticfile` / `public/` / `index.html` |
| 21 | Swift | [swift/](./swift/) | `Package.swift` |
| 22 | Zig | [zig/](./zig/) | `*.zig` |

## Notes

- Node.js projects auto-apply serve path and PORT fixes — see `nodejs/regz.toml` for manual config
- If `nixpacks.toml` already has `providers = [...]`, auto-detection is skipped
- Custom config names checked: `regz.toml` → `rpanel.toml` → `deploy.toml` → `nixpacks.toml`
