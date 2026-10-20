/**
 * Rebuilds the portfolio when a project changes.
 *
 * `cms:sync` used to be the only thing that published a change, and it needed
 * someone to remember to run it. Now the site is built from this CMS, so a save
 * has to reach Vercel on its own — otherwise the live site keeps serving the
 * previous content.
 */
import { createDeployNotifier } from "../../../../utils/deploy-hook";

const notifier = createDeployNotifier({
  url: process.env.VERCEL_DEPLOY_HOOK,
  log: (message) => console.log(`[projects] ${message}`),
});

export default {
  afterCreate() {
    notifier.schedule();
  },
  afterUpdate() {
    notifier.schedule();
  },
  afterDelete() {
    notifier.schedule();
  },
};
