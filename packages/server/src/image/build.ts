/**
 * Golden image build script.
 * Creates a Lima VM from tangerine.yaml, runs ~/tangerine/images/<name>/build.sh,
 * stops the VM, and keeps it as the golden source for APFS CoW cloning.
 *
 * No `limactl snapshot` — VZ doesn't support it. Instead, `limactl clone`
 * uses APFS clonefile(2) for instant, space-efficient copies.
 */

import { resolve, join } from "path";
import { existsSync } from "fs";
import { Effect } from "effect";
import { LimaProvider } from "../vm/providers/lima.ts";
import { sshExec, waitForSsh } from "../vm/ssh.ts";
import { getDb } from "../db/index.ts";
import { createImage } from "../db/queries.ts";
import { TANGERINE_HOME } from "../config.ts";
import type { Logger } from "../logger.ts";

const TEMPLATE_PATH = resolve(import.meta.dir, "tangerine.yaml");

/** Name convention for golden VMs kept as clone sources */
export function goldenVmName(imageName: string): string {
  return `tangerine-golden-${imageName}`;
}

/** Directory for a given image's assets (build.sh, etc.) */
export function imageDir(imageName: string): string {
  return join(TANGERINE_HOME, "images", imageName);
}

export async function buildImage(imageName: string, log: Logger): Promise<void> {
  const buildScriptPath = join(imageDir(imageName), "build.sh");
  const goldenName = goldenVmName(imageName);
  const provider = new LimaProvider({ templatePath: TEMPLATE_PATH });
  const db = getDb();

  log.info("Building golden image", { imageName, template: TEMPLATE_PATH, goldenVm: goldenName });

  // Check if a golden VM already exists — destroy it first
  try {
    const existing = await Effect.runPromise(provider.getInstance(goldenName));
    if (existing) {
      log.info("Destroying existing golden VM", { goldenVm: goldenName });
      await Effect.runPromise(provider.destroyInstance(goldenName));
    }
  } catch {
    // Doesn't exist, that's fine
  }

  // Step 1: Create Lima VM from template
  log.info("Creating VM from template");
  const instance = await Effect.runPromise(provider.createInstance({
    region: "local",
    plan: "4cpu-8gb",
    label: goldenName,
  }));
  log.info("VM created", { id: instance.id, ip: instance.ip, sshPort: instance.sshPort });

  // Step 2: Wait for SSH
  log.info("Waiting for SSH");
  await Effect.runPromise(waitForSsh(
    instance.ip,
    instance.sshPort ?? 22,
  ));
  log.info("SSH ready");

  // Step 3: Run project's build script if it exists
  if (existsSync(buildScriptPath)) {
    log.info("Running build script", { path: buildScriptPath });
    const scriptContent = await Bun.file(buildScriptPath).text();
    const scriptBase64 = Buffer.from(scriptContent).toString("base64");

    // Upload build script to VM via stdin
    const uploadProc = Bun.spawn(
      ["ssh", "-o", "StrictHostKeyChecking=no", "-p", String(instance.sshPort ?? 22),
       `agent@${instance.ip}`, "base64 -d > /tmp/build.sh && chmod +x /tmp/build.sh"],
      {
        stdin: Buffer.from(scriptBase64),
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const uploadExit = await uploadProc.exited;
    if (uploadExit !== 0) {
      const stderr = await new Response(uploadProc.stderr).text();
      throw new Error(`Failed to upload build script: ${stderr}`);
    }

    // Execute the build script
    const buildResult = await Effect.runPromise(sshExec(
      instance.ip,
      instance.sshPort ?? 22,
      "bash -l /tmp/build.sh",
    ));
    if (buildResult) log.info("Build script output", { output: buildResult });

    // Clean up build script
    await Effect.runPromise(sshExec(
      instance.ip,
      instance.sshPort ?? 22,
      "rm -f /tmp/build.sh",
    ));
  } else {
    log.info("No build script found, using base image only", { path: buildScriptPath });
  }

  // Step 4: Stop the VM — keep it as the golden source for cloning
  log.info("Stopping golden VM");
  await Effect.runPromise(provider.stopInstance(goldenName));
  log.info("Golden VM stopped (kept as clone source)");

  // Step 5: Record in DB
  const imageId = `img-${imageName}-${Date.now()}`;
  Effect.runSync(createImage(db, {
    id: imageId,
    name: imageName,
    provider: "lima",
    snapshot_id: `clone:${goldenName}`,
  }));
  log.info("Golden image built successfully", { imageId, cloneSource: goldenName });
}
