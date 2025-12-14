import spawn from 'cross-spawn-cb';
import fs from 'fs';
import getopts from 'getopts-compat';
import path from 'path';
import resolveBin from 'resolve-bin-sync';
import { type CommandCallback, type CommandOptions, wrapWorker } from 'tsds-lib';
import url from 'url';

// Node version detection (same pattern as other commands)
const major = +process.versions.node.split('.')[0];
const version = major > 14 ? 'local' : 'stable';

// Compatible __dirname (ESM + CJS)
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const dist = path.join(__dirname, '..');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

// wrapWorker points to CJS version for subprocess execution
const workerWrapper = wrapWorker(path.join(dist, 'cjs', 'command.js'));

/**
 * Detect whether to use bundled biome or legacy npm run format.
 * - 'bundled': Use bundled biome directly
 * - 'legacy': Fall back to npm run format (for backwards compatibility)
 */
function detectMode(cwd: string): 'bundled' | 'legacy' {
  const biomeJsonPath = path.join(cwd, 'biome.json');

  // No biome.json → use bundled with default config from tsds-config
  if (!fs.existsSync(biomeJsonPath)) {
    return 'bundled';
  }

  // Check if biome.json extends tsds-config
  try {
    const biomeJson = JSON.parse(fs.readFileSync(biomeJsonPath, 'utf8'));
    const extendsArr = biomeJson.extends || [];
    for (let i = 0; i < extendsArr.length; i++) {
      if (extendsArr[i].indexOf('tsds-config') >= 0) {
        return 'bundled';
      }
    }
  } catch (_err) {
    // Parse error, fall back to legacy
  }

  return 'legacy';
}

/**
 * Resolve the bundled biome binary path.
 */
function resolveBiomeBin(): string {
  return resolveBin('@biomejs/biome', 'biome');
}

/**
 * Try to resolve tsds-config's biome.json for default config.
 */
function resolveDefaultConfig(): string | null {
  try {
    return require.resolve('tsds-config/biome.json');
  } catch (_err) {
    return null;
  }
}

/**
 * The actual worker function - runs in 'stable' Node when user is on old Node.
 */
function worker(args: string[], options: CommandOptions, callback: CommandCallback): undefined {
  const cwd = (options.cwd as string) || process.cwd();
  const opts = getopts(args, { alias: { 'dry-run': 'd' }, boolean: ['dry-run', 'legacy'] });

  // Windows platform check (existing behavior)
  if (isWindows && ['x64', 'arm64'].indexOf(process.arch) < 0) {
    return callback();
  }

  if (opts['dry-run']) {
    console.log('Dry-run: would format code with biome');
    return callback();
  }

  // Explicit legacy flag
  if (opts.legacy) {
    console.log('[tsds-biome] Using legacy mode (npm run format)');
    spawn('npm', ['run', 'format'], { ...options, cwd }, callback);
    return;
  }

  const mode = detectMode(cwd);

  if (mode === 'legacy') {
    console.log('[tsds-biome] Using legacy mode (npm run format)');
    console.log('[tsds-biome] To migrate: extend tsds-config/biome.json in your biome.json');
    spawn('npm', ['run', 'format'], { ...options, cwd }, callback);
    return;
  }

  // Bundled biome mode
  const biomeBin = resolveBiomeBin();
  const biomeJsonPath = path.join(cwd, 'biome.json');
  const spawnArgs = ['check', '--write', '--unsafe'];

  // If no local biome.json, use tsds-config default
  if (!fs.existsSync(biomeJsonPath)) {
    const defaultConfig = resolveDefaultConfig();
    if (defaultConfig) {
      spawnArgs.push('--config-path', defaultConfig);
    }
  }

  // Append any additional args (filter out --legacy and --dry-run)
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--legacy' && args[i] !== '--dry-run' && args[i] !== '-d') {
      spawnArgs.push(args[i]);
    }
  }

  spawn(biomeBin, spawnArgs, { ...options, cwd }, callback);
}

/**
 * Main export - follows wrapWorker pattern for Node 0.8+ compatibility.
 */
export default function format(args: string[], options: CommandOptions, callback: CommandCallback): undefined {
  // If Node <= 14: spawn subprocess with 'stable' Node via wrapWorker
  // If Node > 14: run worker directly in current process
  version !== 'local' ? workerWrapper('stable', args, options, callback) : worker(args, options, callback);
}
