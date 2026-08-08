import type { StreamingProvider } from "../types";
import { vidsrc } from "./vidsrc";
import { vidsrcxyz } from "./vidsrcxyz";
import { vidsrccc } from "./vidsrccc";
import { twoembed } from "./twoembed";
import { smashystream } from "./smashystream";

export const providers: StreamingProvider[] = [
  vidsrc,
  vidsrcxyz,
  vidsrccc,
  twoembed,
  smashystream,
];

export { vidsrc, vidsrcxyz, vidsrccc, twoembed, smashystream };
