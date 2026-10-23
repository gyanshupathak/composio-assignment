import { Guide } from "@/lib/schema/guideSchema";
import { githubGuide } from "./githubGuide";
import { gmailGuide } from "./gmailGuide";
import { slackGuide } from "./slackGuide";
import { notionGuide } from "./notionGuide";

export const CURATED_GUIDES: Guide[] = [
  githubGuide,
  gmailGuide,
  slackGuide,
  notionGuide,
];

export const CURATED_GUIDES_BY_SLUG: Record<string, Guide> = {
  github: githubGuide,
  gmail: gmailGuide,
  slack: slackGuide,
  notion: notionGuide,
};
