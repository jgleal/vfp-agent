import { tool } from "@opencode-ai/plugin";
import path from "path";

/**
 * notion_find_parent — locate the Notion page where VFPs are stored.
 *
 * Resolution order (handled by the Python script):
 *   1. PARENT_PAGE_ID env var — returned immediately, no API call
 *   2. Notion Search API — cascade: "VFPs" → "VFP" → "Value Framing"
 *
 * Returns the page ID as a plain string.
 */
export default tool({
  description:
    "Find the Notion parent page where VFPs are stored. " +
    "Uses PARENT_PAGE_ID env var if set; otherwise searches the workspace. " +
    "Returns the page ID. Call this before notion_publish.",
  args: {},
  async execute(_args, context) {
    const script = path.join(
      process.env.HOME ?? "~",
      ".config/vfp-agent/tools/notion-find-parent.py"
    );
    const result = await Bun.$`python3 ${script}`.text();
    return result.trim();
  },
});
