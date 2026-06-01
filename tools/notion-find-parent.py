#!/usr/bin/env python3
"""
notion-find-parent — locate the Notion page where VFPs are stored.

Resolution order:
  1. PARENT_PAGE_ID env var (skips all API calls)
  2. Notion Search API — cascade: "VFPs" → "VFP" → "Value Framing"

Inputs (all from environment):
  NOTION_TOKEN      required — Notion Personal Access Token
  PARENT_PAGE_ID    optional — if set, printed directly and exit 0

Output:
  stdout — page ID (plain string, no newline issues)
  stderr — error message on failure
  exit 0 on success, exit 1 on failure
"""
import json
import os
import sys
import urllib.request


def notion_post(token, path, body):
    req = urllib.request.Request(
        f'https://api.notion.com/v1/{path}',
        data=json.dumps(body).encode(),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        method='POST',
    )
    return json.loads(urllib.request.urlopen(req).read())


def main():
    # 1. Fast path: caller already knows the page ID
    parent = os.environ.get('PARENT_PAGE_ID', '').strip()
    if parent:
        print(parent)
        return

    token = os.environ.get('NOTION_TOKEN', '').strip()
    if not token:
        print('ERROR: NOTION_TOKEN is not set', file=sys.stderr)
        sys.exit(1)

    # 2. Search cascade
    for query in ['VFPs', 'VFP', 'Value Framing']:
        try:
            result = notion_post(token, 'search', {
                'query': query,
                'filter': {'property': 'object', 'value': 'page'},
            })
            results = result.get('results', [])
            if results:
                print(results[0]['id'])
                return
        except Exception as e:
            print(f'ERROR: search for "{query}" failed: {e}', file=sys.stderr)
            sys.exit(1)

    print(
        'ERROR: no VFPs/VFP/Value Framing page found. '
        'Set PARENT_PAGE_ID env var or create a page named "VFPs" in your workspace.',
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == '__main__':
    main()
