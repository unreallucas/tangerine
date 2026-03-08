#!/usr/bin/env bun
/**
 * Golden image build script.
 * Creates a Lima VM from tangerine.yaml, runs an optional image-specific
 * build script, snapshots it, and records the result in the DB.
 *
 * Usage: bun run packages/server/src/image/build.ts <image-name>
 */

import { resolve, join } from "path";
import { existsSync } from "fs";
import { LimaProvider } from "../vm/providers/lima.ts";
import { sshExec, waitForSsh, buildSshArgs } from "../vm/ssh.ts";
import { getDb } from "../db/index.ts";
import { createImage } from "../db/queries.ts";

const TEMPLATE_PATH = resolve(import.meta.dir, "tangerine.yaml");
const IMAGES_DIR = resolve(import.meta.dir, "../../../../images");

async function buildImage(imageName: string): Promise<void> {
  const label = `tangerine-build-${imageName}-${Date.now()}`;
  const provider = new LimaProvider({ templatePath: TEMPLATE_PATH });
  const db = getDb();

  console.log(`Building golden image: ${imageName}`);
  console.log(`Template: ${TEMPLATE_PATH}`);
  console.log(`Build VM: ${label}`);

  // Step 1: Create Lima VM from template
  console.log("\n==> Creating VM from template...");
  const instance = await provider.createInstance({
    region: "local",
    plan: "4cpu-8gb",
    label,
  });
  console.log(`VM created: ${instance.id} (ip: ${instance.ip}, port: ${instance.sshPort})`);

  try {
    // Step 2: Wait for VM to be ready + SSH
    console.log("\n==> Waiting for SSH...");
    await waitForSsh(
      instance.ip,
      "agent",
      180_000,
      instance.sshPort,
      (msg) => console.log(`  ${msg}`)
    );
    console.log("SSH ready");

    // Step 3: Run image-specific build script if it exists
    const buildScriptPath = join(IMAGES_DIR, imageName, "build.sh");
    if (existsSync(buildScriptPath)) {
      console.log(`\n==> Running build script: ${buildScriptPath}`);
      const scriptContent = await Bun.file(buildScriptPath).text();
      const scriptBase64 = Buffer.from(scriptContent).toString("base64");

      // Upload build script to VM via stdin
      const uploadArgs = buildSshArgs(
        "agent",
        instance.ip,
        instance.sshPort,
        "base64 -d > /tmp/build.sh && chmod +x /tmp/build.sh"
      );
      const uploadProc = Bun.spawn(uploadArgs, {
        stdin: Buffer.from(scriptBase64),
        stdout: "pipe",
        stderr: "pipe",
      });
      const uploadExit = await uploadProc.exited;
      if (uploadExit !== 0) {
        const stderr = await new Response(uploadProc.stderr).text();
        throw new Error(`Failed to upload build script: ${stderr}`);
      }

      // Execute the build script with PATH configured for bun/node
      const buildResult = await sshExec({
        host: instance.ip,
        port: instance.sshPort,
        command: "bash -l /tmp/build.sh",
        env: {
          PATH: "/home/agent/.local/bin:/home/agent/.bun/bin:/usr/local/bin:/usr/bin:/bin",
        },
        timeoutMs: 600_000, // 10 minutes for build scripts
      });

      if (buildResult.stdout) console.log(buildResult.stdout);
      if (buildResult.stderr) console.error(buildResult.stderr);

      if (buildResult.exitCode !== 0) {
        throw new Error(`Build script failed with exit code ${buildResult.exitCode}`);
      }

      // Clean up build script
      await sshExec({
        host: instance.ip,
        port: instance.sshPort,
        command: "rm -f /tmp/build.sh",
        timeoutMs: 10_000,
      });
    } else {
      console.log(`\n==> No build script found at ${buildScriptPath}, using base image only`);
    }

    // Step 4: Create snapshot
    console.log("\n==> Creating snapshot...");
    const snapshot = await provider.createSnapshot(instance.id, imageName);
    console.log(`Snapshot created: ${snapshot.id}`);

    // Step 5: Record in DB
    const imageId = `img-${imageName}-${Date.now()}`;
    createImage(db, {
      id: imageId,
      name: imageName,
      provider: "lima",
      snapshot_id: snapshot.id,
    });
    console.log(`Image recorded in DB: ${imageId}`);

    console.log(`\nGolden image "${imageName}" built successfully.`);
    console.log(`Snapshot ID: ${snapshot.id}`);
    console.log(`Use this snapshot ID in your pool config to spawn VMs from this image.`);
  } finally {
    // Step 6: Destroy build VM
    console.log("\n==> Destroying build VM...");
    try {
      await provider.destroyInstance(instance.id);
      console.log("Build VM destroyed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to destroy build VM: ${msg}`);
    }
  }
}

// CLI entry point
const imageName = process.argv[2];
if (!imageName) {
  console.error("Usage: bun run packages/server/src/image/build.ts <image-name>");
  console.error("Available images:");
  try {
    const entries = Array.from(new Bun.Glob("*/build.sh").scanSync(IMAGES_DIR));
    for (const entry of entries) {
      console.error(`  - ${entry.split("/")[0]}`);
    }
  } catch {
    console.error("  (could not scan images directory)");
  }
  process.exit(1);
}

buildImage(imageName).catch((err) => {
  console.error(`\nBuild failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
