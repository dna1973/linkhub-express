// Prepara os ícones que o próprio domínio serve para os links: os SVGs de marca (simple-icons)
// e os do Lucide (lucide-static), copiados de node_modules, mais um catálogo de busca de cada um.
// Nenhum dos dois pacotes entra no bundle: o app pede /vendor-icons/<pacote>/<versão>/<nome>.svg.
//
// Roda sozinho antes de `npm run dev` ("predev") e de `npm run build` ("prebuild").
// O `npm run build:dev` (vite build --mode development) NÃO aciona o "prebuild": se precisar dele,
// rode `node scripts/prepare-icons.mjs` antes.
//
// Uma pasta "completa" (marcador .complete, catalog.v1.json e o mesmo número de .svg da origem) não é
// recopiada. Se só faltar o catálogo (ex.: mudou a versão do formato), ele é regerado sem recopiar os SVGs.
// Pastas de outras versões são apagadas, para não irem junto no dist.
//
// No `npm run dev`, uma falha só avisa no console: os ícones de marca e do Lucide ficam quebrados.
// No `npm run build` (ou com REQUIRE_VENDOR_ICONS=1), a falha derruba o build: um dist sem os ícones,
// publicado por cima do servidor, apagaria os ícones dos links em produção sem ninguém notar.
// Nesse modo, um node_modules com versão diferente da esperada também derruba o build.
// SKIP_VENDOR_ICONS=1 pula tudo, de propósito, também no build.
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mesmas versões do package.json (devDependencies, sem ^) e de src/lib/linkIcons/vendor.ts
const SIMPLE_ICONS_VERSION = '16.35.0';
const LUCIDE_STATIC_VERSION = '0.462.0';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(root, 'public', 'vendor-icons');
const COMPLETE_MARKER = '.complete';
// A versão do formato vai no nome (o mesmo de BRAND_CATALOG_URL/LUCIDE_CATALOG_URL em vendor.ts)
const CATALOG_NAME = 'catalog.v1.json';
// Nomes de catálogos de formatos anteriores, apagados quando encontrados
const LEGACY_CATALOGS = ['catalog.json'];
const COPY_BATCH = 64;
// No Windows, antivírus e indexador seguram arquivos por instantes: o rm tenta de novo antes de desistir
const RM_OPTIONS = { recursive: true, force: true, maxRetries: 5 };

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

// Versão instalada em node_modules, ou null se o pacote não estiver instalado
async function installedVersion(pkg) {
  try {
    return (await readJson(path.join(pkg.packageDir, 'package.json'))).version ?? null;
  } catch {
    return null;
  }
}

async function checkInstalledVersion(pkg) {
  const version = await installedVersion(pkg);
  if (version === null) {
    console.warn(`[vendor-icons] ${packageName(pkg)} não está instalado. Rode npm install.`);
  } else if (version !== pkg.version) {
    console.warn(`[vendor-icons] node_modules tem ${packageName(pkg)} ${version}, mas o script espera ${pkg.version}. Rode npm install, ou atualize a versão aqui, no package.json e em src/lib/linkIcons/vendor.ts.`);
  }
}

// SVGs completos = marcador e a mesma quantidade de .svg da origem (origem vazia nunca é completa)
async function svgsComplete(pkg, sourceCount) {
  const dest = destOf(pkg);
  if (sourceCount === 0) return false;
  if ((await sizeOf(path.join(dest, COMPLETE_MARKER))) === null) return false;
  return (await svgNames(dest)).length === sourceCount;
}

// Completo = SVGs completos e o catálogo no formato atual
async function isComplete(pkg, sourceCount) {
  if (!(await svgsComplete(pkg, sourceCount))) return false;
  return (await sizeOf(path.join(destOf(pkg), CATALOG_NAME))) !== null;
}

// Grava num temporário e renomeia: um catálogo interrompido no meio nunca fica com o nome final
async function writeCatalog(pkg, names) {
  const dest = destOf(pkg);
  const catalog = await pkg.buildCatalog(pkg.packageDir, new Set(names));
  const temp = path.join(dest, `${CATALOG_NAME}.${process.pid}.tmp`);
  await writeFile(temp, JSON.stringify(catalog));
  await rename(temp, path.join(dest, CATALOG_NAME));
}

async function removeLegacyCatalogs(pkg) {
  for (const name of LEGACY_CATALOGS) {
    const file = path.join(destOf(pkg), name);
    if ((await sizeOf(file)) === null) continue;
    await rm(file, RM_OPTIONS);
    console.log(`[vendor-icons] ${pkg.label}: removido o catálogo antigo ${name}`);
  }
}

async function prepare(pkg) {
  const names = await svgNames(pkg.sourceDir);
  if (names.length === 0) throw new Error(`nenhum .svg em ${path.relative(root, pkg.sourceDir)}`);
  const dest = destOf(pkg);

  if (await svgsComplete(pkg, names.length)) {
    await removeLegacyCatalogs(pkg);
    if ((await sizeOf(path.join(dest, CATALOG_NAME))) === null) {
      await writeCatalog(pkg, names);
      console.log(`[vendor-icons] ${pkg.label}: ${names.length} ícones (em dia, catálogo regerado)`);
    } else {
      console.log(`[vendor-icons] ${pkg.label}: ${names.length} ícones (em dia)`);
    }
    return;
  }

  // Recomeça do zero: uma cópia interrompida não deixa pasta pela metade com marcador antigo
  await rm(dest, RM_OPTIONS);
  await mkdir(dest, { recursive: true });
  for (let i = 0; i < names.length; i += COPY_BATCH) {
    await Promise.all(
      names.slice(i, i + COPY_BATCH).map((name) =>
        copyFile(path.join(pkg.sourceDir, `${name}.svg`), path.join(dest, `${name}.svg`)),
      ),
    );
  }
  await writeCatalog(pkg, names);
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
    await rm(path.join(pkg.baseDir, entry.name), RM_OPTIONS);
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
  const problems = [];
  for (const pkg of PACKAGES) {
    // Versão diferente no node_modules: os SVGs copiados não são os da versão que o app pede
    const version = await installedVersion(pkg);
    if (version !== pkg.version) {
      problems.push(`${packageName(pkg)} ${version ?? 'ausente'} em node_modules (esperado ${pkg.version})`);
      continue;
    }
    const sourceCount = (await svgNames(pkg.sourceDir)).length;
    if (!(await isComplete(pkg, sourceCount))) problems.push(`incompleto em public/vendor-icons/${pkg.label}/${pkg.version}/`);
  }
  if (problems.length > 0) {
    console.error(`[vendor-icons] build interrompido: ${problems.join('; ')}.`);
    console.error('[vendor-icons] Rode npm install e tente de novo, ou use SKIP_VENDOR_ICONS=1 para gerar um build sem esses ícones.');
    process.exitCode = 1;
  }
}

await main();
