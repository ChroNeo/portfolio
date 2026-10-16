import type { Core } from '@strapi/strapi';

/**
 * Project metadata mirrored from the site's MDX frontmatter.
 *
 * Seeding is create-if-missing: it only fills gaps so that edits made in the
 * admin panel are never overwritten on the next restart.
 */
const SEED_PROJECTS = [
  {
    slug: 'senior_project',
    title: 'ระบบการจัดการนิทรรศการและการมีส่วนร่วม',
    titleEn: 'Exhibition Management System',
    description:
      'ผู้จัดงานคุมทุกอย่างจากเว็บเดียว ผู้เข้าร่วมใช้งานผ่าน LINE โดยไม่ต้องติดตั้งแอปเพิ่ม ลงทะเบียน ติดตามสถิติแบบเรียลไทม์ ประเมินผลออนไลน์ และรับ E-Certificate อัตโนมัติ',
    date: '2026-04-01',
    stack: ['React', 'TypeScript', 'Fastify', 'Node.js', 'MySQL', 'LINE Messaging API', 'Docker'],
    category: 'Senior Project',
    github: 'https://github.com/ChroNeo/exhibitions-management-system',
  },
  {
    slug: 'test',
    title: 'CollaDoc',
    description: 'Real-time collaborative document editor',
    date: '2024-05-20',
    stack: ['React', 'Socket.io', 'Redis', 'PostgreSQL'],
    github: 'https://github.com/yourname/colladoc',
    demo: 'https://colladoc.vercel.app',
  },
];

/** Actions the public (unauthenticated) role may perform. */
const PUBLIC_ACTIONS = ['api::project.project.find', 'api::project.project.findOne'];

async function seedProjects(strapi: Core.Strapi) {
  const projects = strapi.documents('api::project.project');

  for (const seed of SEED_PROJECTS) {
    const existing = await projects.findFirst({ filters: { slug: seed.slug } });
    if (existing) continue;

    await projects.create({ data: seed });
    strapi.log.info(`Seeded project "${seed.slug}"`);
  }
}

async function grantPublicRead(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!role) {
    strapi.log.warn('Public role not found; skipping permission setup.');
    return;
  }

  for (const action of PUBLIC_ACTIONS) {
    const permission = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } });

    if (permission) {
      if (!permission.enabled) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .update({ where: { id: permission.id }, data: { enabled: true } });
      }
      continue;
    }

    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { action, role: role.id, enabled: true } });
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedProjects(strapi);
    await grantPublicRead(strapi);
  },
};
