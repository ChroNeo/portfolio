import {
  SiReact,
  SiTypescript,
  SiJavascript,
  SiFastify,
  SiNodedotjs,
  SiMysql,
  SiDocker,
  SiLinux,
  SiGooglecloud,
  SiSocketdotio,
  SiRedis,
  SiPostgresql,
} from "react-icons/si";
import { FaAws, FaLine } from "react-icons/fa6";
import type { IconType } from "react-icons/lib";

const icons: Record<string, IconType> = {
  React: SiReact,
  TypeScript: SiTypescript,
  JavaScript: SiJavascript,
  Fastify: SiFastify,
  "Node.js": SiNodedotjs,
  MySQL: SiMysql,
  Docker: SiDocker,
  Linux: SiLinux,
  AWS: FaAws,
  GCP: SiGooglecloud,
  "Socket.io": SiSocketdotio,
  Redis: SiRedis,
  PostgreSQL: SiPostgresql,
  LINE: FaLine,
  "LINE Messaging API": FaLine,
};

export const getTechIcon = (tech: string): IconType =>
  icons[tech] ?? SiJavascript;
