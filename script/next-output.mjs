/**
 * Shared Next `output` resolution for next.config (see tests).
 * @param {NodeJS.ProcessEnv} env
 * @returns {"export" | undefined}
 */
export function resolveNextOutput(env) {
  if (env.NODE_ENV === "production") {
    return "export";
  }
  return undefined;
}
