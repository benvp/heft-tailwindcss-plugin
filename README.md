# @benvp/heft-tailwindcss-plugin

A [Heft](https://heft.rushstack.io/) task plugin for compiling [Tailwind CSS v4](https://tailwindcss.com/). This plugin provides an easy way to integrate Tailwind CSS into the Heft build chain, which SPFx migrated to since v1.22.0.

Supports two compiler modes:

- **CLI** — uses `@tailwindcss/cli` to compile via the official Tailwind CSS binary
- **PostCSS** — uses `postcss` with `@tailwindcss/postcss` for in-process compilation

Production builds automatically apply minification.

## Installation

```bash
npm install --save-dev @benvp/heft-tailwindcss-plugin
```

Depending on the compiler mode you want to use, install the corresponding peer dependencies:

**CLI mode:**

```bash
npm install --save-dev @tailwindcss/cli
```

**PostCSS mode:**

```bash
npm install --save-dev @tailwindcss/postcss postcss
```

## Configuration

Register the plugin as a task in your `heft.json`. You need to configure the input CSS file (`inFile`) and the output file (`outFile`).

The `inFile` should point to your CSS file that contains the `@import 'tailwindcss'` directive. The `outFile` should point to a location in your `dist/` folder, e.g. `dist/app.css`. Your main webpart file should then import the generated output file.

```jsonc
{
  "phasesByName": {
    "build": {
      "tasksByName": {
        "tailwindcss": {
          "taskPlugin": {
            "pluginPackage": "@benvp/heft-tailwindcss-plugin",
            "pluginName": "tailwindcss-plugin",
            "options": {
              "inFile": "src/webparts/myWebPartName/assets/app.css", // adapt to correct location
              "outFile": "dist/app.css",
              "compiler": "cli"
            }
          }
        }
      }
    }
  }
}
```

Then import the compiled CSS in your webpart entry file:

```typescript
import './../../dist/app.css';
```

### Options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `inFile` | `string` | Yes | Input CSS file containing the `@import 'tailwindcss'` directive (relative to project root) |
| `outFile` | `string` | Yes | Output CSS file path, e.g. `dist/app.css` (relative to project root) |
| `compiler` | `"cli" \| "postcss"` | Yes | Which compiler to use |
| `postcssPluginOptions` | `object` | No | Options passed to `@tailwindcss/postcss`. Only used with the `postcss` compiler. When provided, this overrides the default production minification behavior. |

## License

MIT
