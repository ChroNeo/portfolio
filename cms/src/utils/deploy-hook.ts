/**
 * Notifies Vercel that content changed, so it rebuilds the site.
 *
 * Strapi's admin webhooks are a paid-plan feature, so the same thing is done
 * from a content-type lifecycle instead. Two rules matter:
 *
 * 1. coalesce — authoring a page means several saves in a row, and a build per
 *    save would queue a dozen deployments. The notification is sent once the
 *    saves have been quiet for `delayMs`.
 * 2. never fail the save — a deploy hook that is down or misconfigured must not
 *    surface as an error in the admin, so everything is caught and logged.
 */
export interface DeployNotifierOptions {
  /** The Vercel Deploy Hook url; when unset the notifier is a no-op. */
  url?: string;
  /** How long to wait for quiet before triggering. */
  delayMs?: number;
  /** Defaults to `console`. */
  log?: (message: string) => void;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export interface DeployNotifier {
  /** Queue a deploy, resetting the quiet timer. */
  schedule: () => void;
  /** Send now, cancelling a pending timer. */
  flush: () => Promise<void>;
}

export const createDeployNotifier = ({
  url,
  delayMs = 15_000,
  log = (message) => console.log(message),
  fetchImpl = fetch,
}: DeployNotifierOptions): DeployNotifier => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = async (): Promise<void> => {
    if (!url) {
      log("deploy-hook: VERCEL_DEPLOY_HOOK is not set — skipping rebuild.");
      return;
    }

    try {
      const response = await fetchImpl(url, { method: "POST" });
      log(
        response.ok
          ? `deploy-hook: rebuild triggered (${response.status}).`
          : `deploy-hook: rebuild failed (${response.status}).`,
      );
    } catch (error) {
      log(`deploy-hook: could not reach Vercel — ${String(error)}`);
    }
  };

  const schedule = (): void => {
    if (!url) {
      return;
    }

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      void send();
    }, delayMs);

    // A pending rebuild must not hold the process open on shutdown.
    (timer as { unref?: () => void }).unref?.();
  };

  const flush = async (): Promise<void> => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    await send();
  };

  return { schedule, flush };
};
