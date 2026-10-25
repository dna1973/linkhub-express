// Prepara os ícones que o próprio domínio serve para os links: os SVGs de marca (simple-icons)
// e os do Lucide (lucide-static), copiados de node_modules, mais um catálogo de busca de cada um.
// Nenhum dos dois pacotes entra no bundle: o app pede /vendor-icons/<pacote>/<versão>/<nome>.svg.
//
// Roda sozinho antes de `npm run dev` ("predev") e de `npm run build` ("prebuild").
// O `npm run build:dev` (vite build --mode development) NÃO aciona o "prebuild": se precisar dele,
// rode `node scripts/prepare-icons.mjs` antes.
//
// Uma pasta "completa" (marcador .complete, catalog.json e o mesmo número de .svg da origem) não é
// recopiada. Pastas de outras versões são apagadas, para não irem junto no dist.
//
// No `npm run dev`, uma falha só avisa no console: os ícones de marca e do Lucide ficam quebrados.
// No `npm run build` (ou com REQUIRE_VENDOR_ICONS=1), a falha derruba o build: um dist sem os ícones,
// publicado por cima do servidor, apagaria os ícones dos links em produção sem ninguém notar.
// SKIP_VENDOR_ICONS=1 pula tudo, de propósito, também no build.
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mesmas versões do package.json (devDependencies, sem ^) e de src/lib/linkIcons/vendor.ts
const SIMPLE_ICONS_VERSION = '16.35.0';
const LUCIDE_STATIC_VERSION = '0.462.0';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(root, 'public', 'vendor-icons');
const COMPLETE_MARKER = '.complete';
const CATALOG_NAME = 'catalog.json';
const COPY_BATCH = 64;

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return null;
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

// Nomes (sem .svg) dos SVGs de uma pasta; pasta ausente conta como vazia
async function svgNames(dir) {
  try {
    return (await readdir(dir)).filter((name) => name.endsWith('.svg')).map((name) => name.slice(0, -4));
  } catch {
    return [];
  }
}

// Catálogo das marcas: [{ s: slug, t: título, h: '#rrggbb', a?: [apelidos] }]
async function brandCatalog(packageDir, available) {
  const data = await readJson(path.join(packageDir, 'data', 'simple-icons.json'));
  const icons = Array.isArray(data) ? data : data.icons;
  return icons
    .filter((icon) => available.has(icon.slug))
    .map((icon) => {
      const aliases = icon.aliases ?? {};
      const names = new Set([
        ...(aliases.aka ?? []),
        ...(aliases.dup ?? []).map((dup) => dup.title),
        ...Object.values(aliases.loc ?? {}),
        ...(aliases.old ?? []),
      ]);
      const entry = { s: icon.slug, t: icon.title, h: `#${icon.hex.toLowerCase()}` };
      if (names.size > 0) entry.a = [...names];
      return entry;
    });
}

// Catálogo do Lucide: [{ n: nome, k: [palavras-chave] }], só com nomes que tenham SVG, ordenado por nome
async function lucideCatalog(packageDir, available) {
  const tags = await readJson(path.join(packageDir, 'tags.json'));
  return Object.keys(tags)
    .filter((name) => available.has(name))
    .sort()
    .map((name) => ({ n: name, k: tags[name] }));
}

const PACKAGES = [
  {
    label: 'simple-icons',
    version: SIMPLE_ICONS_VERSION,
    packageDir: path.join(root, 'node_modules', 'simple-icons'),
    sourceDir: path.join(root, 'node_modules', 'simple-icons', 'icons'),
    baseDir: path.join(vendorDir, 'simple-icons'),
    buildCatalog: brandCatalog,
  },
  {
    label: 'lucide',
    packageName: 'lucide-static',
    version: LUCIDE_STATIC_VERSION,
    packageDir: path.join(root, 'node_modules', 'lucide-static'),
    sourceDir: path.join(root, 'node_modules', 'lucide-static', 'icons'),
    baseDir: path.join(vendorDir, 'lucide'),
    buildCatalog: lucideCatalog,
  },
];

const destOf = (pkg) => path.join(pkg.baseDir, pkg.version);
const packageName = (pkg) => pkg.packageName ?? pkg.label;

async function checkInstalledVersion(pkg) {
  try {
    const { version } = await readJson(path.join(pkg.packageDir, 'package.json'));
    if (version !== pkg.version) {
      console.warn(`[vendor-icons] node_modules tem ${packageName(pkg)} ${version}, mas o script espera ${pkg.version}. Atualize a versão aqui, no package.json e em src/lib/linkIcons/vendor.ts.`);
    }
  } catch {
    console.warn(`[vendor-icons] ${packageName(pkg)} não está instalado. Rode npm install.`);
  }
}

// Completo = marcador, catálogo e a mesma quantidade de .svg da origem (origem vazia nunca é completa)
async function isComplete(pkg, sourceCount) {
  const dest = destOf(pkg);
  if (sourceCount === 0) return false;
  if ((await sizeOf(path.join(dest, COMPLETE_MARKER))) === null) return false;
  if ((await sizeOf(path.join(dest, CATALOG_NAME))) === null) return false;
  return (await svgNames(dest)).length === sourceCount;
}

async function prepare(pkg) {
  const names = await svgNames(pkg.sourceDir);
  if (names.length === 0) throw new Error(`nenhum .svg em ${path.relative(root, pkg.sourceDir)}`);
  const dest = destOf(pkg);

  if (await isComplete(pkg, names.length)) {
    console.log(`[vendor-icons] ${pkg.label}: ${names.length} ícones (em dia)`);
    return;
  }

  // Recomeça do zero: uma cópia interrompida não deixa pasta pela metade com marcador antigo
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  for (let i = 0; i < names.length; i += COPY_BATCH) {
    await Promise.all(
      names.slice(i, i + COPY_BATCH).map((name) =>
        copyFile(path.join(pkg.sourceDir, `${name}.svg`), path.join(dest, `${name}.svg`)),
      ),
    );
  }
  const catalog = await pkg.buildCatalog(pkg.packageDir, new Set(names));
  await writeFile(path.join(dest, CATALOG_NAME), JSON.stringify(catalog));
  // O marcador vai por último: só existe se a cópia e o catálogo terminaram
  await writeFile(path.join(dest, COMPLETE_MARKER), `${pkg.version}\n`);
  console.log(`[vendor-icons] ${pkg.label}: ${names.length} ícones (copiados)`);
}

// Apaga as pastas irmãs de outras versões (ex.: simple-icons/16.34.0 depois de subir para 16.35.0)
async function removeOtherVersions(pkg) {
  let entries;
  try {
    entries = await readdir(pkg.baseDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === pkg.version) continue;
    await rm(path.join(pkg.baseDir, entry.name), { recursive: true, force: true });
    console.log(`[vendor-icons] ${pkg.label}: removida a versão antiga ${entry.name}`);
  }
}

async function main() {
  // SKIP_VENDOR_ICONS=1 pula tudo (build rápido); os ícones de marca e do Lucide ficam quebrados
  if (process.env.SKIP_VENDOR_ICONS === '1') {
    console.log('[vendor-icons] SKIP_VENDOR_ICONS=1: pulando preparo dos ícones.');
    return;
  }

  for (const pkg of PACKAGES) {
    await checkInstalledVersion(pkg);
    try {
      await removeOtherVersions(pkg);
      await prepare(pkg);
    } catch (error) {
      console.warn(`[vendor-icons] não foi possível preparar ${pkg.label}: ${error.message}. Os ícones dele ficarão indisponíveis.`);
    }
  }

  const strict = process.env.npm_lifecycle_event === 'prebuild' || process.env.REQUIRE_VENDOR_ICONS === '1';
  if (!strict) return;
  const incomplete = [];
  for (const pkg of PACKAGES) {
    const sourceCount = (await svgNames(pkg.sourceDir)).length;
    if (!(await isComplete(pkg, sourceCount))) incomplete.push(`public/vendor-icons/${pkg.label}/${pkg.version}/`);
  }
  if (incomplete.length > 0) {
    console.error(`[vendor-icons] build interrompido: incompleto em ${incomplete.join(', ')}.`);
    console.error('[vendor-icons] Rode npm install e tente de novo, ou use SKIP_VENDOR_ICONS=1 para gerar um build sem esses ícones.');
    process.exitCode = 1;
  }
}

await main();
