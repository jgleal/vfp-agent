import { tool } from "@opencode-ai/plugin";
import path from "path";
import fs from "fs";

/**
 * notion_find_parent — locate the Notion page where VFPs are stored.
 *
 * Resolution order (handled by the Python script):
 *   1. PARENT_PAGE_ID env var — returned immediately, no API call
 *   2. Notion Search API — cascade: "VFPs" → "VFP" → "Value Framing"
 *
 * Returns the page ID as a plain string.
 *
 * Script resolution order:
 *   1. .opencode/tools/notion-find-parent.py (project-level, works in CI)
 *   2. ~/.config/vfp-agent/tools/notion-find-parent.py (global install)
 */
export default tool({
  description:
    "Find the Notion parent page where VFPs are stored. " +
    "Uses PARENT_PAGE_ID env var if set; otherwise searches the workspace. " +
    "Returns the page ID. Call this before notion_publish.",
  args: {},
  async execute(_args, _context) {
    const projectScript = path.join(process.cwd(), ".opencode", "tools", "notion-find-parent.py");
    const globalScript = path.join(
      process.env.HOME ?? "~",
      ".config/vfp-agent/tools/notion-find-parent.py"
    );
    const script = fs.existsSync(projectScript) ? projectScript : globalScript;
    const result = await Bun.$`python3 ${script}`.text();
    return result.trim();
  },
});
