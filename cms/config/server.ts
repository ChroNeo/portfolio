import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  /**
   * The public url this instance answers on.
   *
   * A tunnel in front of a local Strapi terminates https and forwards to
   * localhost, so Strapi has to be told what address visitors actually use or
   * it generates admin and media urls pointing at localhost.
   */
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  /** Trust the proxy's X-Forwarded-* headers, so https is detected correctly. */
  proxy: true,
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
