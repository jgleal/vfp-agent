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
// DEFAULT BEHAVIOUR (no flags):
//   Interactive selector. Detected tools are shown first with a ✓ marker.
//   User picks by number, range, "all", or Enter (installs detected only).

'use strict';

const fs            = require('fs');
const os            = require('os');
const path          = require('path');
const child_process = require('child_process');
const readline      = require('readline');

const REPO     = 'jgleal/vfp-agent';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;

// Marker fences for append-style installs (Windsurf).
const BLOCK_BEGIN = '<!-- vfp-agent-begin -->';
const BLOCK_END   = '<!-- vfp-agent-end -->';

// ── Provider matrix ────────────────────────────────────────────────────────
// Detection rules:
//   command:<bin>   — binary on PATH
//   macapp:<Name>   — macOS .app bundle in /Applications or ~/Applications
//   dir:<path>      — directory exists (soft signal; used only when no CLI)
//
// Tools where supportsAgents is false get rules/memories install instead.
const PROVIDERS = [
  { id: 'opencode', label: 'opencode',          detect: 'command:opencode',                         supportsAgents: true  },
  { id: 'claude',   label: 'Claude Code',       detect: 'command:claude',                           supportsAgents: true  },
  { id: 'cursor',   label: 'Cursor',            detect: 'command:cursor||macapp:Cursor',             supportsAgents: true  },
  { id: 'gemini',   label: 'Gemini CLI',        detect: 'command:gemini',                           supportsAgents: true  },
  { id: 'codex',    label: 'OpenAI Codex CLI',  detect: 'command:codex',                            supportsAgents: true  },
  { id: 'vscode',   label: 'VS Code (Copilot)', detect: 'dir:~/.vscode||macapp:Visual Studio Code', supportsAgents: true  },
  { id: 'windsurf', label: 'Windsurf',          detect: 'command:windsurf||macapp:Windsurf',        supportsAgents: false },
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
};

const IMPL_FILE = {
  opencode: 'implementations/opencode/vfp.md',
  claude:   'implementations/claude-code/vfp.md',
  cursor:   'implementations/cursor/vfp.md',
  gemini:   'implementations/gemini/vfp.md',
  codex:    'implementations/codex/vfp.md',
  vscode:   'implementations/vscode/vfp.agent.md',
  windsurf: 'implementations/windsurf/vfp.md',
};

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
  // Gemini / Codex: MCP config format not yet standardised; skip for now.
};

// ── Argv ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    dryRun: false, force: false, all: false,
    listOnly: false, noColor: false, only: [],
    uninstall: false, nonInteractive: false, help: false,
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
  return {
    green:  wrap('32'),
    yellow: wrap('33'),
    dim:    wrap('2'),
    red:    wrap('31'),
    bold:   wrap('1'),
    cyan:   wrap('36'),
  };
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

// ── Repo root resolution ───────────────────────────────────────────────────
function detectRepoRoot() {
  const root = path.resolve(path.dirname(__filename), '..');
  if (fs.existsSync(path.join(root, 'implementations')) &&
      fs.existsSync(path.join(root, 'bin', 'install.js')))
    return root;
  return null;
}

// ── Implementation file resolution ────────────────────────────────────────
function readImplFile(repoRoot, relPath) {
  if (repoRoot) {
    const full = path.join(repoRoot, relPath);
    if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
    throw new Error(`implementation file not found: ${full}`);
  }
  const url = `${RAW_BASE}/${relPath}`;
  process.stdout.write(`  fetching ${url}\n`);
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
      const stripped = stripBlock(existing);
      fs.writeFileSync(dest, stripped.trimEnd() + '\n\n' + fenced, 'utf8');
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
  else process.stdout.write(`  not found (already removed?): ${dest}\n`);
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
function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return {}; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── Notion MCP check + setup ───────────────────────────────────────────────
function notionMcpConfigured(providerId) {
  const cfg = NOTION_MCP_CONFIGS[providerId];
  if (!cfg) return true; // unknown format — skip check
  const configFile = cfg.configFile();
  if (!fs.existsSync(configFile)) return false;
  const data = readJson(configFile);
  const servers = data[cfg.mcpKey];
  return servers && servers[cfg.serverKey] !== undefined;
}

function installNotionMcp(providerId, token, dry) {
  const cfg = NOTION_MCP_CONFIGS[providerId];
  if (!cfg) return false;
  const configFile = cfg.configFile();
  if (dry) {
    process.stdout.write(`  would add Notion MCP to: ${configFile}\n`);
    return true;
  }
  const data = readJson(configFile);
  if (!data[cfg.mcpKey]) data[cfg.mcpKey] = {};
  data[cfg.mcpKey][cfg.serverKey] = cfg.buildEntry(token);
  writeJson(configFile, data);
  process.stdout.write(`  Notion MCP configured in: ${configFile}\n`);
  return true;
}

// ── Interactive prompt helpers ─────────────────────────────────────────────
async function prompt(question) {
  if (!process.stdin.isTTY) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

// ── Interactive tool selector ──────────────────────────────────────────────
// Shown when the user runs the installer without --all or --only.
// Detected tools are listed first (marked ✓), then undetected ones (marked ·).
// Input format: comma-separated numbers/ranges, "all", or Enter (= detected only).
async function interactiveSelect(detected, all, c) {
  process.stdout.write('\n');
  process.stdout.write(c.bold('vfp-agent installer\n\n'));

  const detectedSet = new Set(detected.map(p => p.id));
  const detectedList   = all.filter(p =>  detectedSet.has(p.id));
  const undetectedList = all.filter(p => !detectedSet.has(p.id));
  const ordered = [...detectedList, ...undetectedList];

  process.stdout.write('Available tools:\n\n');
  ordered.forEach((p, i) => {
    const num    = String(i + 1).padStart(2);
    const marker = detectedSet.has(p.id)
      ? c.green('✓')
      : c.dim('·');
    const label  = detectedSet.has(p.id)
      ? c.bold(p.label)
      : c.dim(p.label);
    const note   = detectedSet.has(p.id) ? '' : c.dim(' (not detected)');
    process.stdout.write(`  ${num}  ${marker}  ${label}${note}\n`);
  });

  process.stdout.write('\n');
  process.stdout.write(c.dim('Enter numbers (e.g. 1,3,5), ranges (1-3), "all",\n'));
  process.stdout.write(c.dim('or press Enter to install detected tools only.\n\n'));

  const answer = await prompt('> ');

  // Enter with no input → detected only
  if (answer === null || answer === '') return detectedList;

  const lower = answer.toLowerCase().trim();
  if (lower === 'all') return ordered;

  // Parse "1,2,3" and "1-3" into indices (1-based)
  const selected = new Set();
  for (const token of lower.split(',')) {
    const t = token.trim();
    const range = t.match(/^(\d+)-(\d+)$/);
    if (range) {
      const lo = parseInt(range[1], 10);
      const hi = parseInt(range[2], 10);
      for (let n = lo; n <= hi; n++) {
        if (n >= 1 && n <= ordered.length) selected.add(n - 1);
      }
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n >= 1 && n <= ordered.length) selected.add(n - 1);
    }
  }

  if (selected.size === 0) {
    process.stdout.write(c.yellow('Nothing selected — installing detected tools only.\n'));
    return detectedList;
  }

  return ordered.filter((_, i) => selected.has(i));
}

// ── Per-provider install ───────────────────────────────────────────────────
async function installProvider(prov, ctx) {
  const { say, note, warn, opts, repoRoot, results, sharedNotionToken } = ctx;
  const { id, label, supportsAgents } = prov;

  results.detected++;
  say(`→ ${label}`);

  // 1. Install agent / rules file
  const dest    = AGENT_DEST[id]();
  const content = readImplFile(repoRoot, IMPL_FILE[id]);

  let fileResult;
  if (supportsAgents) {
    fileResult = writeFile(dest, content, opts, opts.dryRun);
  } else {
    fileResult = appendBlock(dest, content, opts, opts.dryRun);
  }

  if (fileResult === 'ok') {
    if (!opts.dryRun) process.stdout.write(`  installed: ${dest}\n`);
    results.installed.push(id);
  } else {
    note(`  already installed (${dest}) — use --force to overwrite`);
    results.skipped.push([id, 'file exists']);
  }

  // 2. Check Notion MCP prerequisite
  const hasMcpConfig = NOTION_MCP_CONFIGS[id] !== undefined;
  if (hasMcpConfig && fileResult !== 'skip') {
    if (notionMcpConfigured(id)) {
      note(`  Notion MCP already configured`);
    } else {
      warn(`  Notion MCP not found — required for VFP publishing`);
      if (!opts.dryRun && !opts.nonInteractive) {
        let token = sharedNotionToken.value;
        if (!token) {
          token = await prompt('  Notion integration token (ntn_...): ');
          if (token) sharedNotionToken.value = token;
        }
        if (token) {
          installNotionMcp(id, token, false);
        } else {
          note('  Skipped — configure Notion MCP manually later.');
        }
      } else if (opts.dryRun) {
        installNotionMcp(id, '<token>', true);
      } else {
        note('  Run without --non-interactive to configure Notion MCP.');
      }
    }
  }

  process.stdout.write('\n');
}

async function uninstallProvider(prov, say, dry) {
  const { id, label, supportsAgents } = prov;
  say(`→ ${label}`);
  if (supportsAgents) {
    removeFile(AGENT_DEST[id](), dry);
  } else {
    removeBlock(AGENT_DEST[id](), dry);
  }
}

// ── Help ───────────────────────────────────────────────────────────────────
function printHelp(c) {
  process.stdout.write(`${c.bold('vfp-agent')} — installer

${c.bold('USAGE')}
  node bin/install.js [flags]
  curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash

${c.bold('DEFAULT')}
  Running without flags launches an interactive selector. Detected tools are
  shown first (✓). Select by number, range, "all", or Enter for detected only.

${c.bold('FLAGS')}
  --all                  Install to all detected tools without prompting
  --only <id>            Install only to the specified tool (repeatable)
  --list                 List all supported tools and exit
  --dry-run              Show what would happen without making changes
  --force                Overwrite existing files and blocks
  --uninstall, -u        Remove installed files instead of installing
  --non-interactive      Skip all prompts (no Notion MCP setup)
  --no-color             Disable ANSI colors
  --help, -h             Show this help

${c.bold('SUPPORTED TOOLS')}
${PROVIDERS.map(p => `  ${p.id.padEnd(12)} ${p.label}`).join('\n')}

${c.bold('NOTION MCP')}
  During install the script checks whether Notion MCP is configured for each
  selected tool. If missing it prompts once for your Notion integration token
  and patches the relevant config file automatically.
  Get a token at: https://www.notion.so/my-integrations

${c.bold('EXAMPLES')}
  node bin/install.js                 # interactive selector (recommended)
  node bin/install.js --all           # install to all detected tools
  node bin/install.js --only opencode
  node bin/install.js --dry-run --all
  node bin/install.js --uninstall
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
  const results  = { detected: 0, installed: [], skipped: [], failed: [] };

  if (opts.help)     { printHelp(c); process.exit(0); }
  if (opts.listOnly) {
    process.stdout.write('Supported tools:\n');
    PROVIDERS.forEach(p => process.stdout.write(`  ${p.id.padEnd(12)} ${p.label}\n`));
    process.exit(0);
  }

  // Build the full detected list (used by interactive mode and --all)
  const allDetected = PROVIDERS.filter(p => detectMatch(p.detect));

  // Determine active providers
  let active;
  if (opts.only.length) {
    active = PROVIDERS.filter(p => opts.only.includes(p.id));
  } else if (opts.all) {
    active = allDetected.length > 0 ? allDetected : PROVIDERS;
  } else if (opts.nonInteractive || !process.stdin.isTTY) {
    // Non-interactive without --all: install detected only
    active = allDetected;
    if (active.length === 0) {
      warn('No supported tools detected. Use --only <id> or --all to target tools explicitly.');
      process.exit(0);
    }
  } else {
    // Default: interactive selector
    active = await interactiveSelect(allDetected, PROVIDERS, c);
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
  const ctx = { say, note, warn, ok, fail, opts, repoRoot, results, sharedNotionToken };

  for (const p of active) {
    try {
      await installProvider(p, ctx);
    } catch (e) {
      fail(`  error installing to ${p.label}: ${e.message}`);
      results.failed.push([p.id, e.message]);
      process.stdout.write('\n');
    }
  }

  process.stdout.write('─'.repeat(50) + '\n');
  if (results.installed.length) ok(`✓ Installed: ${results.installed.join(', ')}`);
  if (results.skipped.length)   note(`  Skipped:   ${results.skipped.map(([id]) => id).join(', ')} (--force to overwrite)`);
  if (results.failed.length)    fail(`✗ Failed:    ${results.failed.map(([id, r]) => `${id} (${r})`).join(', ')}`);

  if (results.failed.length) process.exit(1);
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
