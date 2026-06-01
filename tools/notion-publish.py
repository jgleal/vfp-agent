#!/usr/bin/env python3
"""
notion-publish — create a Notion page and write VFP content to it.

Inputs:
  --parent-id   required — ID of the parent Notion page
  --title       required — page title (e.g. "VFP — add booking system")
  stdin         required — full VFP markdown content

Environment:
  NOTION_TOKEN  required — Notion Personal Access Token

Output:
  stdout — page URL on success
  stderr — error message on failure
  exit 0 on success, exit 1 on failure

Markdown format:
  ### headings produce real heading_3 blocks (via Notion Markdown API)
  - bullets produce bulleted_list_item blocks
  Plain paragraphs produce paragraph blocks
"""
import argparse
import json
import os
import sys
import urllib.request


def notion(token, method, path, body=None, version='2022-06-28'):
    req = urllib.request.Request(
        f'https://api.notion.com/v1/{path}',
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Notion-Version': version,
        },
        method=method,
    )
    return json.loads(urllib.request.urlopen(req).read())


def main():
    parser = argparse.ArgumentParser(description='Publish a VFP to Notion')
    parser.add_argument('--parent-id', required=True, help='Parent page ID')
    parser.add_argument('--title', required=True, help='Page title')
    args = parser.parse_args()

    token = os.environ.get('NOTION_TOKEN', '').strip()
    if not token:
        print('ERROR: NOTION_TOKEN is not set', file=sys.stderr)
        sys.exit(1)

    markdown = sys.stdin.read()
    if not markdown.strip():
        print('ERROR: no markdown content on stdin', file=sys.stderr)
        sys.exit(1)

    # Step 1 — create the page (properties only, no content)
    try:
        page = notion(token, 'POST', 'pages', {
            'parent': {'page_id': args.parent_id},
            'properties': {
                'title': {'title': [{'text': {'content': args.title}}]},
            },
        })
    except Exception as e:
        print(f'ERROR: failed to create page: {e}', file=sys.stderr)
        sys.exit(1)

    page_id = page['id']
    page_url = page['url']

    # Step 2 — write content via Markdown API (### → real heading_3 blocks)
    try:
        notion(token, 'PATCH', f'pages/{page_id}/markdown',
               {'type': 'replace_content', 'replace_content': {'new_str': markdown}},
               version='2026-03-11')
    except Exception as e:
        print(f'ERROR: failed to write content to page {page_url}: {e}', file=sys.stderr)
        sys.exit(1)

    print(page_url)


if __name__ == '__main__':
    main()
