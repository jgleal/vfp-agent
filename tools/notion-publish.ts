import { tool } from "@opencode-ai/plugin";
import path from "path";

/**
 * notion_publish — create a Notion page and write VFP markdown content to it.
 *
 * Calls notion-publish.py via stdin for the markdown content (avoids
 * shell-escaping issues with large multi-line strings).
 *
 * Returns the page URL on success.
 */
export default tool({
  description:
    "Publish a VFP to Notion. Creates a page under parent_page_id with the " +
    "given title and writes the full markdown content using the Notion Markdown API " +
    "(### headings produce real heading_3 blocks). Returns the page URL.",
  args: {
    parent_page_id: tool.schema
      .string()
      .describe("ID of the parent Notion page (from notion_find_parent)"),
    title: tool.schema
      .string()
      .describe('Page title, e.g. "VFP — add booking system"'),
    markdown: tool.schema
      .string()
      .describe("Full VFP content in markdown format"),
  },
  async execute(args, _context) {
    const script = path.join(
      process.env.HOME ?? "~",
      ".config/vfp-agent/tools/notion-publish.py"
    );
    const result =
      await Bun.$`echo ${args.markdown} | python3 ${script} --parent-id ${args.parent_page_id} --title ${args.title}`.text();
    return result.trim();
  },
});
