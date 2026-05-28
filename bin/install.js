#!/usr/bin/env node
// vfp-agent — unified cross-platform installer.
//
// Follows the caveman installer pattern (github.com/JuliusBrussee/caveman):
// one Node script replaces bash/PS1 drift. Pure stdlib, zero npm runtime deps.
//
// Distribution:
//   Local clone: node bin/install.js [flags]
//   curl|bash:   delegated from install.sh → npx -y github:jgleal/vfp-agent -- [flags]
//
// Single source of truth: agents/vfp.md (opencode frontmatter format).
// Methodology skills: methodology/*.md (plain markdown). Frontmatter is generated
// inline at install time — no duplication in the repo.
// The installer parses/rewrites frontmatter per target tool at write time.

'use strict';

const fs            = require('fs');
const os            = require('os');
const path          = require('path');
const child_process = require('child_process');
const readline      = require('readline');

const REPO          = 'jgleal/vfp-agent';
const RAW_BASE      = `https://raw.githubusercontent.com/${REPO}/main`;
const AGENT_SOURCE  = 'agents/vfp.md';
const GH_API_BASE   = `https://api.github.com/repos/${REPO}`;

// Methodology skill files — source is methodology/*.md (canonical, no duplication).
// Frontmatter is generated inline at install time; methodology files stay plain markdown.
// vfp-retro-procedure intentionally omitted — deferred to Phase 3+.
const SKILLS = [
  {
    name: 'vfp-core-methodology',
    src:  'methodology/core-methodology.md',
    description: 'Core delivery assumptions, primary reasoning priorities, functional flow, evidence collection, and methodology improvement principles',
  },
  {
    name: 'vfp-guide',
    src:  'methodology/vfp-guide.md',
    description: 'Full 17-section VFP guide: purpose, section-by-section guidance, good/bad examples, lifecycle states, and common failure modes',
  },
  {
    name: 'vfp-capability-slicing',
    src:  'methodology/capability-slicing.md',
    description: 'Capability slicing principles: behaviour-driven decomposition, validation-oriented slicing, anti-patterns, and evolution model. In the current phase, §4.11 slices are the direct source for GitHub sub-issues — each must be independently workable',
  },
  {
    name: 'vfp-risk-uncertainty',
    src:  'methodology/risk-uncertainty.md',
    description: 'Risk and uncertainty classification: 8 signal types with detection patterns, examples, and recommended delivery responses',
  },
  {
    name: 'vfp-validation-evidence',
    src:  'methodology/validation-evidence-patterns.md',
    description: 'Validation evidence patterns: evidence types, collection approaches, confidence levels, and quality signals for behavioural validation',
  },
  {
    name: 'vfp-pilot-operational-model',
    src:  'methodology/pilot-operational-model.md',
    description: 'Pilot operational model: roles, ceremonies, cadence, escalation paths, and governance for the AI-native delivery framework',
  },
  {
    name: 'vfp-example-library',
    src:  'methodology/example-library.md',
    description: 'Worked VFP examples and anti-patterns, populated through the operational learning loop',
  },
];

// Tools that natively support multi-file skills (agent + separate skill files).
// All others receive a single merged file.
const SKILLS_NATIVE = new Set(['opencode', 'claude', 'project']);

// Marker fences for append-style installs (Windsurf).
const BLOCK_BEGIN = '<!-- vfp-agent-begin -->';
const BLOCK_END   = '<!-- vfp-agent-end -->';

// GitHub Actions workflow written by project-mode installs.
// Triggered by /vfp comments on issues; /vfp-check verifies secrets without running a full VFP.
const PROJECT_WORKFLOW = `name: vfp-agent

on:
  issue_comment:
    types: [created]

jobs:
  # /vfp-check: verify secrets are configured and post a comment
  check:
    if: startsWith(github.event.comment.body, '/vfp-check')
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Check secrets
        uses: actions/github-script@v7
        env:
          GOOGLE_GENERATIVE_AI_API_KEY: \${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
          NOTION_TOKEN: \${{ secrets.NOTION_TOKEN }}
        with:
          script: |
            const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'set' : 'MISSING';
            const notion = process.env.NOTION_TOKEN ? 'set' : 'MISSING';
            const ready = process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.NOTION_TOKEN;
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: [
                '## VFP Agent - secrets check',
                '',
                '- GOOGLE_GENERATIVE_AI_API_KEY: ' + google,
                '- NOTION_TOKEN: ' + notion,
                '',
                ready
                  ? 'Ready. Comment /vfp <description> on any issue to generate a VFP.'
                  : 'Not ready. Add the missing secrets in repo Settings > Secrets > Actions.'
              ].join('\\n')
            });

  # /vfp: generate a VFP for the issue using the specialised agent
  vfp:
    if: |
      startsWith(github.event.comment.body, '/vfp') &&
      !startsWith(github.event.comment.body, '/vfp-check')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Run VFP agent
        uses: anomalyco/opencode/github@latest
        env:
          GOOGLE_GENERATIVE_AI_API_KEY: \${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
          NOTION_TOKEN: \${{ secrets.NOTION_TOKEN }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          model: google/gemini-2.5-flash
          agent: vfp
          share: "false"
          mentions: "/vfp"
          use_github_token: "true"
`;

// opencode project-level config written by project-mode installs.
// Uses {env:NOTION_TOKEN} substitution (supported by opencode config loader)
// so the token comes from the NOTION_TOKEN secret at CI runtime — never hardcoded in the repo.
const PROJECT_OPENCODE_CONFIG = JSON.stringify({
  $schema: 'https://opencode.ai/config.json',
  mcp: {
    notion: {
      type: 'local',
      command: ['npx', '-y', '@notionhq/notion-mcp-server'],
      environment: { NOTION_TOKEN: '{env:NOTION_TOKEN}' },
      enabled: true,
    },
  },
}, null, 2) + '\n';

// ── Provider matrix ────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'opencode', label: 'opencode',          detect: 'command:opencode',                         supportsAgents: true  },
  { id: 'claude',   label: 'Claude Code',       detect: 'command:claude',                           supportsAgents: true  },
  { id: 'cursor',   label: 'Cursor',            detect: 'command:cursor||macapp:Cursor',             supportsAgents: true  },
  { id: 'gemini',   label: 'Gemini CLI',        detect: 'command:gemini',                           supportsAgents: true  },
  { id: 'codex',    label: 'OpenAI Codex CLI',  detect: 'command:codex',                            supportsAgents: true  },
  { id: 'vscode',   label: 'VS Code (Copilot)', detect: 'dir:~/.vscode||macapp:Visual Studio Code', supportsAgents: true  },
  { id: 'windsurf', label: 'Windsurf',          detect: 'command:windsurf||macapp:Windsurf',        supportsAgents: false },
  { id: 'project',  label: 'GitHub Actions (this repo)', detect: 'file:.git',                        supportsAgents: true  },
];

// ── Config/destination paths per provider ─────────────────────────────────
const IS_WIN = process.platform === 'win32';

function opencodeConfigDir() {
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'opencode');
  if (IS_WIN) return path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'opencode'
  );
  return path.join(os.homedir(), '.config', 'opencode');
}

function vscodeUserDir() {
  if (process.platform === 'darwin')
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User');
  if (IS_WIN)
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Code', 'User');
  return path.join(os.homedir(), '.config', 'Code', 'User');
}

const AGENT_DEST = {
  opencode: () => path.join(opencodeConfigDir(), 'agents', 'vfp.md'),
  claude:   () => path.join(os.homedir(), '.claude', 'agents', 'vfp.md'),
  cursor:   () => path.join(os.homedir(), '.cursor', 'agents', 'vfp.md'),
  gemini:   () => path.join(os.homedir(), '.gemini', 'agents', 'vfp.md'),
  codex:    () => path.join(os.homedir(), '.codex', 'agents', 'vfp.md'),
  vscode:   () => path.join(os.homedir(), '.copilot', 'agents', 'vfp.agent.md'),
  windsurf: () => path.join(os.homedir(), '.codeium', 'windsurf', 'memories', 'global_rules.md'),
  project:  () => path.join(process.cwd(), '.opencode', 'agents', 'vfp.md'),
};

// Skills destination root per provider (only for SKILLS_NATIVE tools).
const SKILLS_DEST = {
  opencode: () => path.join(opencodeConfigDir(), 'skills'),
  claude:   () => path.join(os.homedir(), '.claude', 'skills'),
  project:  () => path.join(process.cwd(), '.opencode', 'skills'),
};

// ── Frontmatter transform ──────────────────────────────────────────────────
// Source format is opencode. The body is never touched — only the frontmatter
// header is rewritten to match the target tool's expectations.

function parseFm(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fields: {}, body: content };
  const fields = {};
  for (const line of m[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim();
    const v = line.slice(colon + 1).trim();
    if (k) fields[k] = v;
  }
  return { fields, body: m[2].trimStart() };
}

function transformContent(source, toolId) {
  const { fields, body } = parseFm(source);
  const desc = fields.description || '';

  switch (toolId) {
    case 'project':
    case 'opencode':
      // Source format — pass through unchanged.
      return source;

    case 'claude':
      // Claude Code: name + description only.
      return `---\nname: vfp\ndescription: ${desc}\n---\n\n${body}`;

    case 'cursor':
    case 'gemini':
    case 'codex':
      // Description-only frontmatter.
      return `---\ndescription: ${desc}\n---\n\n${body}`;

    case 'vscode':
      // VS Code Copilot .agent.md: description + user-invocable.
      return `---\ndescription: ${desc}\nuser-invocable: true\n---\n\n${body}`;

    case 'windsurf':
      // Windsurf has no agents dir — content is appended to global_rules.md.
      // Strip frontmatter entirely; add a plain heading.
      return `# VFP Agent — Value Framing Packet Generator\n\n${body}`;

    default:
      return source;
  }
}

// ── Notion MCP config per provider ────────────────────────────────────────
const NOTION_MCP_CONFIGS = {
  opencode: {
    configFile: () => path.join(opencodeConfigDir(), 'opencode.json'),
    mcpKey: 'mcp',
    serverKey: 'notion',
    buildEntry: (token) => ({
      type: 'local',
      command: ['npx', '-y', '@notionhq/notion-mcp-server'],
      environment: { NOTION_TOKEN: token },
      enabled: true,
    }),
  },
  claude: {
    configFile: () => path.join(os.homedir(), '.claude', 'settings.json'),
    mcpKey: 'mcpServers',
    serverKey: 'notion',
    buildEntry: (token) => ({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: token },
    }),
  },
  cursor: {
    configFile: () => path.join(os.homedir(), '.cursor', 'mcp.json'),
    mcpKey: 'mcpServers',
    serverKey: 'notion',
    buildEntry: (token) => ({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: token },
    }),
  },
  vscode: {
    configFile: () => path.join(vscodeUserDir(), 'mcp.json'),
    mcpKey: 'servers',
    serverKey: 'notion',
    buildEntry: (token) => ({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: token },
    }),
  },
  windsurf: {
    configFile: () => path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    mcpKey: 'mcpServers',
    serverKey: 'notion',
    buildEntry: (token) => ({
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: token },
    }),
  },
};

// ── Argv ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    dryRun: false, force: false, all: false,
    listOnly: false, noColor: false, only: [],
    uninstall: false, nonInteractive: false, help: false,
    update: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run':         opts.dryRun = true; break;
      case '--force':           opts.force = true; break;
      case '--all':             opts.all = true; break;
      case '--list':            opts.listOnly = true; break;
      case '--no-color':        opts.noColor = true; break;
      case '--uninstall':
      case '-u':                opts.uninstall = true; break;
      case '--non-interactive': opts.nonInteractive = true; break;
      case '--update':          opts.update = true; break;
      case '-h':
      case '--help':            opts.help = true; break;
      case '--': break;
      case '--only': {
        const v = argv[++i];
        if (!v) die('error: --only requires an argument');
        opts.only.push(v);
        break;
      }
      default:
        die(`error: unknown flag: ${a}\n  run with --help for usage`);
    }
  }
  if (opts.only.length) {
    const knownIds = new Set(PROVIDERS.map(p => p.id));
    for (const id of opts.only) {
      if (!knownIds.has(id))
        die(`error: unknown provider: ${id}\n  run with --list to see valid ids`);
    }
  }
  return opts;
}

function die(msg) { process.stderr.write(msg + '\n'); process.exit(2); }

// ── Color helpers ──────────────────────────────────────────────────────────
function makeChalk(noColor) {
  const useColor = !noColor && process.stdout.isTTY && !process.env.NO_COLOR;
  const wrap = (codes) => (s) => useColor ? `\x1b[${codes}m${s}\x1b[0m` : s;
  return { green: wrap('32'), yellow: wrap('33'), dim: wrap('2'), red: wrap('31'), bold: wrap('1') };
}

// ── Detection helpers ──────────────────────────────────────────────────────
function hasCmd(cmd) {
  try {
    if (IS_WIN)
      return child_process.spawnSync('where', [cmd], { stdio: 'ignore' }).status === 0;
    return child_process.spawnSync(
      'sh', ['-c', `command -v '${cmd.replace(/'/g, "'\\''")}'`], { stdio: 'ignore' }
    ).status === 0;
  } catch (_) { return false; }
}

function macAppPresent(name) {
  if (process.platform !== 'darwin') return false;
  return [
    `/Applications/${name}.app`,
    path.join(os.homedir(), 'Applications', `${name}.app`),
  ].some(p => fs.existsSync(p));
}

function expandHome(p) {
  return p.replace(/^\$HOME/, os.homedir()).replace(/^~/, os.homedir());
}

function safeStat(p, method) {
  try { return fs.statSync(p)[method](); } catch (_) { return false; }
}

function detectMatch(spec) {
  if (!spec) return false;
  for (const clause of spec.split('||')) {
    const c = clause.trim(); if (!c) continue;
    const colon = c.indexOf(':');
    const kind  = colon === -1 ? c : c.slice(0, colon);
    const val   = colon === -1 ? '' : expandHome(c.slice(colon + 1));
    let ok = false;
    switch (kind) {
      case 'command': ok = hasCmd(val); break;
      case 'dir':     ok = safeStat(val, 'isDirectory'); break;
      case 'file':    ok = safeStat(val, 'isFile'); break;
      case 'macapp':  ok = macAppPresent(val); break;
    }
    if (ok) return true;
  }
  return false;
}

// ── State file ─────────────────────────────────────────────────────────────
// Persists { sha, tools, installedAt } so --update knows what to re-install.

function stateFilePath() {
  if (IS_WIN)
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'vfp-agent', 'state.json'
    );
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'vfp-agent', 'state.json'
  );
}

function readState() {
  const file = stateFilePath();
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function writeState(sha, tools) {
  const file = stateFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ sha, tools, installedAt: new Date().toISOString() }, null, 2) + '\n',
    'utf8'
  );
}

// Fetches the latest commit SHA from the GitHub API (plain SHA response).
function fetchLatestSha() {
  const url = `${GH_API_BASE}/commits/main`;
  const r = child_process.spawnSync(process.execPath, ['-e', `
    const h = require('https');
    h.get('${url}', {
      headers: { 'Accept': 'application/vnd.github.sha', 'User-Agent': 'vfp-agent-installer' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) { process.stderr.write('HTTP ' + res.statusCode + '\\n'); process.exit(1); }
        process.stdout.write(d.trim());
      });
    }).on('error', e => { process.stderr.write(e.message); process.exit(1); });
  `], { encoding: 'utf8', timeout: 10000 });
  if (r.status !== 0) throw new Error(`failed to fetch latest SHA: ${r.stderr || ''}`);
  return r.stdout.trim();
}

// Returns the current HEAD SHA of a local repo clone, or null on failure.
function getCurrentSha(repoRoot) {
  if (!repoRoot) return null;
  const r = child_process.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

// ── Source file resolution ─────────────────────────────────────────────────
// Reads agents/vfp.md (and skill files) from local clone or fetches from GitHub.
// Pass forceRemote=true to always fetch from GitHub (used by --update).
function detectRepoRoot() {
  const root = path.resolve(path.dirname(__filename), '..');
  if (fs.existsSync(path.join(root, 'agents', 'vfp.md'))) return root;
  return null;
}

function fetchRemoteFile(relativePath) {
  const url = `${RAW_BASE}/${relativePath}`;
  const r = child_process.spawnSync(process.execPath, ['-e', `
    const h = require('https');
    h.get('${url}', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) { process.stderr.write('HTTP ' + res.statusCode); process.exit(1); }
        process.stdout.write(d);
      });
    }).on('error', e => { process.stderr.write(e.message); process.exit(1); });
  `], { encoding: 'utf8', timeout: 15000 });
  if (r.status !== 0) throw new Error(`failed to fetch ${url}: ${r.stderr || ''}`);
  return r.stdout;
}

function readSourceFile(repoRoot, forceRemote) {
  if (repoRoot && !forceRemote) {
    return fs.readFileSync(path.join(repoRoot, AGENT_SOURCE), 'utf8');
  }
  process.stdout.write(`  fetching ${RAW_BASE}/${AGENT_SOURCE}\n`);
  return fetchRemoteFile(AGENT_SOURCE);
}

// Read all skill files — returns array of { name, content }.
// Reads methodology/*.md (plain markdown, no frontmatter) and generates the
// skill frontmatter inline at install time. No duplication in the repo.
function readSkillFiles(repoRoot, forceRemote) {
  return SKILLS.map(skill => {
    let body;
    if (repoRoot && !forceRemote) {
      body = fs.readFileSync(path.join(repoRoot, skill.src), 'utf8');
    } else {
      body = fetchRemoteFile(skill.src);
    }
    // Generate frontmatter inline — methodology files are plain markdown
    const content = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${body}`;
    return { name: skill.name, content };
  });
}

// Build merged single-file content for clients that don't support native skills.
// Strips frontmatter from each skill file and appends as labelled sections.
function buildMergedContent(agentSource, toolId, skillFiles) {
  const transformed = transformContent(agentSource, toolId);
  const sections = skillFiles.map(({ name, content }) => {
    const { body } = parseFm(content);
    return `\n\n---\n<!-- methodology: ${name} -->\n\n${body.trimStart()}`;
  });
  return transformed + sections.join('');
}

// ── File write helpers ─────────────────────────────────────────────────────
function writeFile(dest, content, opts, dry) {
  if (dry) { process.stdout.write(`  would write: ${dest}\n`); return 'ok'; }
  if (fs.existsSync(dest) && !opts.force) return 'skip';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
  return 'ok';
}

function appendBlock(dest, content, opts, dry) {
  const fenced = `${BLOCK_BEGIN}\n${content.trimEnd()}\n${BLOCK_END}\n`;
  if (dry) { process.stdout.write(`  would append block to: ${dest}\n`); return 'ok'; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    if (existing.includes(BLOCK_BEGIN)) {
      if (!opts.force) return 'skip';
      fs.writeFileSync(dest, stripBlock(existing).trimEnd() + '\n\n' + fenced, 'utf8');
      return 'ok';
    }
    const sep = existing.endsWith('\n') ? '\n' : '\n\n';
    fs.writeFileSync(dest, existing + sep + fenced, 'utf8');
    return 'ok';
  }
  fs.writeFileSync(dest, fenced, 'utf8');
  return 'ok';
}

function stripBlock(content) {
  const start = content.indexOf(BLOCK_BEGIN);
  const end   = content.indexOf(BLOCK_END);
  if (start === -1 || end === -1) return content;
  return content.slice(0, start) + content.slice(end + BLOCK_END.length);
}

function removeFile(dest, dry) {
  if (dry) { process.stdout.write(`  would remove: ${dest}\n`); return; }
  if (fs.existsSync(dest)) { fs.unlinkSync(dest); process.stdout.write(`  removed: ${dest}\n`); }
  else process.stdout.write(`  not found: ${dest}\n`);
}

function removeBlock(dest, dry) {
  if (dry) { process.stdout.write(`  would remove block from: ${dest}\n`); return; }
  if (!fs.existsSync(dest)) { process.stdout.write(`  not found: ${dest}\n`); return; }
  const content = fs.readFileSync(dest, 'utf8');
  if (!content.includes(BLOCK_BEGIN)) { process.stdout.write(`  block not found in: ${dest}\n`); return; }
  fs.writeFileSync(dest, stripBlock(content).trimEnd() + '\n', 'utf8');
  process.stdout.write(`  removed block from: ${dest}\n`);
}

// ── JSON config helpers ────────────────────────────────────────────────────

// Minimal JSONC parser: strips // line comments, /* */ block comments, and
// trailing commas before } or ]. Handles strings correctly (won't strip
// comment-like sequences inside quoted values).
function parseJsonc(text) {
  let i = 0;
  let out = '';
  while (i < text.length) {
    // Quoted string — copy verbatim, respecting escape sequences.
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '"') { j++; break; }
        j++;
      }
      out += text.slice(i, j);
      i = j;
    // Block comment /* ... */
    } else if (text[i] === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < text.length - 1 && !(text[j] === '*' && text[j + 1] === '/')) j++;
      i = j + 2;
    // Line comment // ...
    } else if (text[i] === '/' && text[i + 1] === '/') {
      let j = i + 2;
      while (j < text.length && text[j] !== '\n') j++;
      i = j;
    } else {
      out += text[i++];
    }
  }
  // Remove trailing commas before } or ]
  out = out.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(out);
}

// Returns parsed object, or null if the file doesn't exist.
// Throws with a clear message if the file exists but can't be parsed —
// this prevents silently overwriting valid config with an empty object.
function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8');
  try {
    return parseJsonc(text);
  } catch (e) {
    throw new Error(
      `Cannot parse ${file}: ${e.message}\n` +
      `  Fix the file manually, then re-run the installer.`
    );
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── Notion MCP check + setup ───────────────────────────────────────────────
function notionMcpConfigured(providerId) {
  const cfg = NOTION_MCP_CONFIGS[providerId];
  if (!cfg) return true;
  const file = cfg.configFile();
  if (!fs.existsSync(file)) return false;
  const data = readJson(file);
  return !!(data[cfg.mcpKey] && data[cfg.mcpKey][cfg.serverKey]);
}

function installNotionMcp(providerId, token, dry) {
  const cfg = NOTION_MCP_CONFIGS[providerId];
  if (!cfg) return;
  const file = cfg.configFile();
  if (dry) { process.stdout.write(`  would add Notion MCP to: ${file}\n`); return; }
  const data = readJson(file);
  if (!data[cfg.mcpKey]) data[cfg.mcpKey] = {};
  data[cfg.mcpKey][cfg.serverKey] = cfg.buildEntry(token);
  writeJson(file, data);
  process.stdout.write(`  Notion MCP configured in: ${file}\n`);
}

// ── Interactive prompt ─────────────────────────────────────────────────────
async function prompt(question) {
  if (!process.stdin.isTTY) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

// ── Interactive TUI selector ───────────────────────────────────────────────
// Arrow keys ↑/↓ move cursor, space toggles, a=all/none, enter=confirm, q=quit.
async function interactiveSelect(detected, all, c, opts) {
  const detectedSet    = new Set(detected.map(p => p.id));
  const detectedList   = all.filter(p =>  detectedSet.has(p.id));
  const undetectedList = all.filter(p => !detectedSet.has(p.id));
  const ordered        = [...detectedList, ...undetectedList];

  // Non-TTY: fall back to detected only.
  if (!process.stdin.isTTY) return detectedList;

  // Initially pre-select all detected tools.
  const selected = new Set();
  ordered.forEach((p, i) => { if (detectedSet.has(p.id)) selected.add(i); });

  let cursor = 0;
  // tool rows + 1 blank + 1 hint line
  const TOTAL_LINES = ordered.length + 2;

  function renderRows(redraw) {
    const out = [];
    for (let i = 0; i < ordered.length; i++) {
      const p          = ordered[i];
      const isSel      = selected.has(i);
      const isDetected = detectedSet.has(p.id);

      const check = isSel ? c.green('[✓]') : c.dim('[ ]');
      const label = isDetected ? c.bold(p.label) : p.label;
      const badge = p.id === 'project'
        ? c.dim(` (./${path.basename(process.cwd())})`)
        : (isDetected ? c.dim(' detected') : c.dim(' (not detected)'));
      const arrow = cursor === i ? '>' : ' ';

      out.push(`  ${arrow} ${check} ${label}${badge}`);
    }
    out.push('');
    out.push(c.dim('↑/↓ move  space toggle  a all/none  enter confirm  q quit'));

    if (redraw) {
      // Move up and overwrite each line in-place.
      process.stdout.write(`\x1b[${TOTAL_LINES}A`);
      for (const line of out) process.stdout.write(`\r\x1b[2K${line}\n`);
    } else {
      process.stdout.write(out.join('\n') + '\n');
    }
  }

  // Static header printed once.
  process.stdout.write('\n');
  process.stdout.write(c.bold('vfp-agent installer\n\n'));
  process.stdout.write('Available tools:\n');
  renderRows(false);

  // Hide terminal cursor while navigating.
  process.stdout.write('\x1b[?25l');

  return new Promise((resolve) => {
    let resolved = false;

    function cleanup(result) {
      if (resolved) return;
      resolved = true;
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\x1b[?25h\n'); // restore cursor + blank line
      resolve(result);
    }

    function onData(key) {
      if (key === '\x03') {                           // Ctrl-C
        cleanup([]);
        process.exit(0);
      } else if (key === '\x1b[A') {                 // ↑
        cursor = (cursor - 1 + ordered.length) % ordered.length;
        renderRows(true);
      } else if (key === '\x1b[B') {                 // ↓
        cursor = (cursor + 1) % ordered.length;
        renderRows(true);
      } else if (key === ' ') {                      // space: toggle
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
        renderRows(true);
      } else if (key === 'a') {                      // a: all/none
        if (selected.size === ordered.length) selected.clear();
        else ordered.forEach((_, i) => selected.add(i));
        renderRows(true);
      } else if (key === '\r') {                     // enter: confirm
        cleanup(ordered.filter((_, i) => selected.has(i)));
      } else if (key === 'q' || key === '\x1b') {    // q / Escape: quit
        cleanup([]);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

// ── Per-provider install ───────────────────────────────────────────────────
async function installProvider(prov, ctx) {
  const { say, note, warn, opts, source, skillFiles, results, sharedNotionToken } = ctx;
  const { id, label, supportsAgents } = prov;

  say(`→ ${label}`);

  // Native skills clients: write agent file + individual skill files.
  // Other clients: write single merged file containing everything.
  const content = SKILLS_NATIVE.has(id)
    ? transformContent(source, id)
    : buildMergedContent(source, id, skillFiles);
  const dest    = AGENT_DEST[id]();

  const fileResult = supportsAgents
    ? writeFile(dest, content, opts, opts.dryRun)
    : appendBlock(dest, content, opts, opts.dryRun);

  if (fileResult === 'ok') {
    if (!opts.dryRun) process.stdout.write(`  installed: ${dest}\n`);
    results.installed.push(id);
  } else {
    note(`  already installed — use --force to overwrite`);
    results.skipped.push(id);
  }

  // Write skill files for native-skills clients (opencode, claude, project).
  if (SKILLS_NATIVE.has(id) && SKILLS_DEST[id]) {
    const skillsRoot = SKILLS_DEST[id]();
    for (const { name, content: skillContent } of skillFiles) {
      const skillDest = path.join(skillsRoot, name, 'SKILL.md');
      const skillResult = writeFile(skillDest, skillContent, opts, opts.dryRun);
      if (skillResult === 'ok' && !opts.dryRun)
        process.stdout.write(`  skill: ${skillDest}\n`);
    }
  }

  // Write GitHub Actions workflow and opencode config for project installs.
  if (id === 'project') {
    const wfDest = path.join(process.cwd(), '.github', 'workflows', 'vfp.yml');
    const wfResult = writeFile(wfDest, PROJECT_WORKFLOW, opts, opts.dryRun);
    if (wfResult === 'ok' && !opts.dryRun)       process.stdout.write(`  workflow: ${wfDest}\n`);
    else if (wfResult === 'skip')                  note('  workflow already exists — use --force to overwrite');

    const cfgDest = path.join(process.cwd(), '.opencode', 'opencode.json');
    const cfgResult = writeFile(cfgDest, PROJECT_OPENCODE_CONFIG, opts, opts.dryRun);
    if (cfgResult === 'ok' && !opts.dryRun)       process.stdout.write(`  config: ${cfgDest}\n`);
    else if (cfgResult === 'skip')                 note('  opencode.json already exists — use --force to overwrite');

    if (!opts.dryRun) {
      process.stdout.write('\n');
      note('  Next: add these secrets in repo Settings → Secrets → Actions:');
      note('    GOOGLE_GENERATIVE_AI_API_KEY   your Google AI Studio API key (free at aistudio.google.com)');
      note('    NOTION_TOKEN                   your Notion integration token');
      note('  Then comment /vfp-check on any issue to verify.');
    }
  }

  // Notion MCP prerequisite
  if (NOTION_MCP_CONFIGS[id] && fileResult !== 'skip') {
    if (notionMcpConfigured(id)) {
      note('  Notion MCP already configured');
    } else {
      warn('  Notion MCP not found — required for VFP publishing');
      if (!opts.dryRun && !opts.nonInteractive) {
        let token = sharedNotionToken.value;
        if (!token) {
          process.stdout.write('\n');
          process.stdout.write('  The VFP agent publishes artefacts to Notion. To enable this:\n');
          process.stdout.write('\n');
          process.stdout.write('    1. Open https://www.notion.so/my-integrations\n');
          process.stdout.write('    2. Click "New integration" → give it a name → Save\n');
          process.stdout.write('    3. Copy the "Internal Integration Token" (starts with ntn_)\n');
          process.stdout.write('    4. After install, open your VFP workspace page in Notion\n');
          process.stdout.write('       → Share → Invite → select your integration\n');
          process.stdout.write('\n');
          token = await prompt('  Paste token (or press Enter to skip): ');
          if (token) sharedNotionToken.value = token;
        }
        if (token) {
          installNotionMcp(id, token, false);
        } else {
          note('  Skipped. To configure later, re-run:');
          note(`    node bin/install.js --only ${id} --force`);
        }
      } else if (opts.dryRun) {
        installNotionMcp(id, '<token>', true);
      } else {
        note('  Notion MCP not configured. To add it, re-run without --non-interactive:');
        note('    node bin/install.js --only ' + id + ' --force');
      }
    }
  }

  process.stdout.write('\n');
}

async function uninstallProvider(prov, say, dry) {
  const { id, label, supportsAgents } = prov;
  say(`→ ${label}`);
  supportsAgents ? removeFile(AGENT_DEST[id](), dry) : removeBlock(AGENT_DEST[id](), dry);
}

// ── Help ───────────────────────────────────────────────────────────────────
function printHelp(c) {
  process.stdout.write(`${c.bold('vfp-agent')} — installer

${c.bold('USAGE')}
  node bin/install.js [flags]
  curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash

${c.bold('DEFAULT')}
  No flags → interactive TUI selector. Detected tools shown first.
  ↑/↓ move cursor  space toggle selection  a all/none  enter confirm  q quit

${c.bold('FLAGS')}
  --all                  Install to all detected tools without prompting
  --only <id>            Install only to the specified tool (repeatable)
  --update               Re-install to all previously installed tools (fetches latest)
  --list                 List all supported tool IDs and exit
  --dry-run              Show what would happen without making changes
  --force                Overwrite existing files
  --uninstall, -u        Remove installed files
  --non-interactive      Skip all prompts (CI/automation)
  --no-color             Disable ANSI colors
  --help, -h             Show this help

${c.bold('SUPPORTED TOOLS')}
${PROVIDERS.map(p => `  ${p.id.padEnd(12)} ${p.label}`).join('\n')}

${c.bold('EXAMPLES')}
  node bin/install.js
  node bin/install.js --all
  node bin/install.js --only opencode --dry-run
  node bin/install.js --uninstall
  node bin/install.js --update
  curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --update
`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const opts     = parseArgs(process.argv.slice(2));
  const c        = makeChalk(opts.noColor);
  const say      = (s) => process.stdout.write(c.bold(s) + '\n');
  const note     = (s) => process.stdout.write(c.dim(s) + '\n');
  const warn     = (s) => process.stdout.write(c.yellow(s) + '\n');
  const ok       = (s) => process.stdout.write(c.green(s) + '\n');
  const fail     = (s) => process.stdout.write(c.red(s) + '\n');
  const repoRoot = detectRepoRoot();
  const results  = { installed: [], skipped: [], failed: [] };

  if (opts.help)     { printHelp(c); process.exit(0); }
  if (opts.listOnly) {
    process.stdout.write('Supported tools:\n');
    PROVIDERS.forEach(p => process.stdout.write(`  ${p.id.padEnd(12)} ${p.label}\n`));
    process.exit(0);
  }

  // ── --update flow ──────────────────────────────────────────────────────
  if (opts.update) {
    const state = readState();
    if (!state || !state.tools || state.tools.length === 0) {
      process.stderr.write('No previous install state found. Run the installer first.\n');
      process.exit(1);
    }

    process.stdout.write(`  checking for updates to ${REPO}...\n`);
    const latestSha = fetchLatestSha();
    if (state.sha && state.sha === latestSha) {
      ok(`Already up to date (${latestSha.slice(0, 7)}).`);
      process.exit(0);
    }

    if (state.sha) note(`  ${state.sha.slice(0, 7)} → ${latestSha.slice(0, 7)}`);
    else           note(`  installing latest (${latestSha.slice(0, 7)})`);

    // Always fetch the source from remote so we get the latest version.
    const source     = readSourceFile(repoRoot, true);
    const skillFiles = readSkillFiles(repoRoot, true);
    const active     = PROVIDERS.filter(p => state.tools.includes(p.id));

    process.stdout.write(`\nUpdating ${active.length} tool(s)...\n\n`);

    opts.force = true;  // overwrite existing installs
    opts.nonInteractive = true;
    const results = { installed: [], skipped: [], failed: [] };
    const sharedNotionToken = { value: null };
    const ctx = { say, note, warn, opts, source, skillFiles, results, sharedNotionToken };

    for (const p of active) {
      try {
        await installProvider(p, ctx);
      } catch (e) {
        fail(`  error: ${e.message}`);
        results.failed.push(p.id);
        process.stdout.write('\n');
      }
    }

    process.stdout.write('─'.repeat(50) + '\n');
    if (results.installed.length) ok(`✓ Updated:  ${results.installed.join(', ')}`);
    if (results.skipped.length)   note(`  Skipped:  ${results.skipped.join(', ')}`);
    if (results.failed.length)    fail(`✗ Failed:   ${results.failed.join(', ')}`);

    if (!results.failed.length) {
      writeState(latestSha, state.tools);
      note(`  state:     ${stateFilePath()}`);
    }

    process.exit(results.failed.length ? 1 : 0);
  }

  // Read source and skill files once — all tool writes derive from them.
  const source     = readSourceFile(repoRoot);
  const skillFiles = readSkillFiles(repoRoot);

  const allDetected = PROVIDERS.filter(p => detectMatch(p.detect));

  let active;
  if (opts.only.length) {
    active = PROVIDERS.filter(p => opts.only.includes(p.id));
  } else if (opts.all) {
    active = allDetected.length > 0 ? allDetected : PROVIDERS;
  } else if (opts.nonInteractive || !process.stdin.isTTY) {
    active = allDetected;
    if (active.length === 0) {
      warn('No supported tools detected. Use --only <id> or --all.');
      process.exit(0);
    }
  } else {
    active = await interactiveSelect(allDetected, PROVIDERS, c, opts);
    if (!active || active.length === 0) {
      process.stdout.write('Nothing selected. Exiting.\n');
      process.exit(0);
    }
  }

  if (opts.uninstall) {
    say('Uninstalling vfp-agent...\n');
    for (const p of active) await uninstallProvider(p, say, opts.dryRun);
    ok('\nDone.');
    process.exit(0);
  }

  process.stdout.write(`\nInstalling to ${active.length} tool(s)...\n\n`);

  const sharedNotionToken = { value: null };
  const ctx = { say, note, warn, opts, source, skillFiles, results, sharedNotionToken };

  for (const p of active) {
    try {
      await installProvider(p, ctx);
    } catch (e) {
      fail(`  error: ${e.message}`);
      results.failed.push(p.id);
      process.stdout.write('\n');
    }
  }

  process.stdout.write('─'.repeat(50) + '\n');
  if (results.installed.length) ok(`✓ Installed: ${results.installed.join(', ')}`);
  if (results.skipped.length)   note(`  Skipped:   ${results.skipped.join(', ')} (--force to overwrite)`);
  if (results.failed.length)    fail(`✗ Failed:    ${results.failed.join(', ')}`);

  // Persist state so --update can detect what to re-install later.
  if (!opts.dryRun && (results.installed.length || results.skipped.length)) {
    const installedTools = [...new Set([...results.installed, ...results.skipped])];
    let sha = getCurrentSha(repoRoot);
    if (!sha) {
      try { sha = fetchLatestSha(); } catch (_) { sha = ''; }
    }
    writeState(sha, installedTools);
    note(`  state:     ${stateFilePath()}`);
  }

  if (results.failed.length) process.exit(1);
  process.exit(0);
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
