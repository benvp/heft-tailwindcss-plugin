import fs from "node:fs/promises";
import path from "node:path";

import type { IHeftTaskPlugin, IHeftTaskSession } from "@rushstack/heft";
import { HeftConfiguration } from "@rushstack/heft";
import { spawn } from "node:child_process";

export const PLUGIN_NAME: string = "tailwindcss-plugin";

export interface TailwindCSSPluginOptions {
  inFile: string;
  outFile: string;
  compiler: "cli" | "postcss";
  postcssPluginOptions?: Record<string, unknown>;
}

export default class TailwindCSSPlugin implements IHeftTaskPlugin<TailwindCSSPluginOptions> {
  public apply(
    taskSession: IHeftTaskSession,
    heftConfiguration: HeftConfiguration,
    pluginOptions: TailwindCSSPluginOptions,
  ): void {
    if (
      pluginOptions.compiler !== "cli" &&
      pluginOptions.compiler !== "postcss"
    ) {
      taskSession.logger.emitError(
        new Error(
          `Invalid compiler "${pluginOptions.compiler}". Must be "cli" or "postcss".`,
        ),
      );
      return;
    }

    taskSession.hooks.run.tapPromise(PLUGIN_NAME, async () => {
      taskSession.logger.terminal.writeLine(
        `Tailwind CSS: building using ${pluginOptions.compiler}...`,
      );

      try {
        const inFile = path.resolve(
          heftConfiguration.buildFolderPath,
          pluginOptions.inFile,
        );
        const outFile = path.resolve(
          heftConfiguration.buildFolderPath,
          pluginOptions.outFile,
        );

        const isProduction = taskSession.parameters.production;

        if (pluginOptions.compiler === "cli") {
          const binPath = path.resolve(
            heftConfiguration.buildFolderPath,
            "node_modules/.bin/tailwindcss",
          );
          await this.compileTailwindCli(
            binPath,
            inFile,
            outFile,
            taskSession,
            isProduction,
          );
        } else {
          await this.compileTailwindPostCSS(
            inFile,
            outFile,
            isProduction,
            pluginOptions.postcssPluginOptions,
          );
        }
      } catch (e) {
        taskSession.logger.emitError(
          new Error(`Tailwind CSS build failed: ${e}`),
        );
      }
    });
  }

  private compileTailwindCli(
    binPath: string,
    inFile: string,
    outFile: string,
    taskSession: IHeftTaskSession,
    production: boolean,
  ): Promise<void> {
    return new Promise((resolve) => {
      const args = ["-i", inFile, "-o", outFile];

      if (production) {
        args.push("--minify");
      }

      const proc = spawn(binPath, args, { stdio: "pipe" });

      let stderr = "";

      proc.stdout?.on("data", (chunk: Buffer) => {
        taskSession.logger.terminal.writeLine(chunk.toString().trim());
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk;
        taskSession.logger.terminal.writeWarningLine(chunk.toString().trim());
      });

      proc.on("close", (code: number | null) => {
        if (code !== 0) {
          taskSession.logger.emitError(
            new Error(`Tailwind exited with code ${code}: ${stderr}`),
          );
        }

        resolve();
      });
    });
  }

  private async compileTailwindPostCSS(
    inFile: string,
    outFile: string,
    production: boolean,
    postcssPluginOptions?: Record<string, unknown>,
  ): Promise<void> {
    const { default: postcss } = await import("postcss");
    const { default: tailwindcss } = await import("@tailwindcss/postcss");

    const inputCss = await fs.readFile(inFile, "utf-8");

    const options =
      postcssPluginOptions ??
      (production ? { optimize: { minify: true } } : {});

    const result = await postcss([tailwindcss(options)]).process(inputCss, {
      from: inFile,
      to: outFile,
      map: false,
    });

    const existing = await fs.readFile(outFile, "utf-8").catch(() => "");

    if (result.css !== existing) {
      const outDir = path.dirname(outFile);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outFile, result.css, "utf-8");
    }
  }
}
