import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface AssetMapping {
  sourcePrefix: string;
  targetDir: 'articles' | 'authors' | 'editorial';
  slug: string;
  widths: number[];
}

const ASSET_MAPPINGS: AssetMapping[] = [
  // Articles (16:9 editorial scenes)
  { sourcePrefix: 'hero_ai_quantum_chip_', targetDir: 'articles', slug: 'neuromorphic-silicon', widths: [400, 800, 1200] },
  { sourcePrefix: 'fintech_algorithmic_exchange_', targetDir: 'articles', slug: 'algorithmic-arbitrage', widths: [400, 800, 1200] },
  { sourcePrefix: 'productivity_deep_work_', targetDir: 'articles', slug: 'cognitive-sprint', widths: [400, 800, 1200] },
  { sourcePrefix: 'biotech_longevity_lab_', targetDir: 'articles', slug: 'cellular-longevity-nad', widths: [400, 800, 1200] },
  { sourcePrefix: 'ai_photonics_datacenter_', targetDir: 'articles', slug: 'photonic-supercomputing', widths: [400, 800, 1200] },
  { sourcePrefix: 'finance_global_markets_', targetDir: 'articles', slug: 'sovereign-wealth-liquidity', widths: [400, 800, 1200] },
  { sourcePrefix: 'neuroscience_synapse_lab_', targetDir: 'articles', slug: 'dopamine-baseline', widths: [400, 800, 1200] },
  { sourcePrefix: 'biotech_crispr_epigenetics_', targetDir: 'articles', slug: 'crispr-epigenetics', widths: [400, 800, 1200] },
  { sourcePrefix: 'news_semiconductor_fab_', targetDir: 'articles', slug: 'news-semiconductor-fab', widths: [400, 800, 1200] },
  { sourcePrefix: 'news_global_summit_', targetDir: 'articles', slug: 'news-settlement-summit', widths: [400, 800, 1200] },

  // Editorial institutional imagery
  { sourcePrefix: 'about_editorial_library_', targetDir: 'editorial', slug: 'about-library', widths: [600, 1200] },
  { sourcePrefix: 'about_editorial_masthead_', targetDir: 'editorial', slug: 'about-masthead', widths: [400, 800] },

  // Authors (1:1 square portraits)
  { sourcePrefix: 'author_evelyn_vance_', targetDir: 'authors', slug: 'evelyn-vance', widths: [160, 400] },
  { sourcePrefix: 'author_marcus_sterling_', targetDir: 'authors', slug: 'marcus-sterling', widths: [160, 400] },
  { sourcePrefix: 'author_clara_thorne_', targetDir: 'authors', slug: 'clara-thorne', widths: [160, 400] },
  { sourcePrefix: 'author_aris_thorne_', targetDir: 'authors', slug: 'aris-thorne', widths: [160, 400] },
  { sourcePrefix: 'author_elena_rostova_', targetDir: 'authors', slug: 'elena-rostova', widths: [160, 400] }
];

async function runOptimization() {
  const srcDir = path.resolve(process.cwd(), 'src/assets/images');
  const publicImagesDir = path.resolve(process.cwd(), 'public/images');
  const srcFiles = fs.readdirSync(srcDir);

  let generatedCount = 0;

  for (const mapping of ASSET_MAPPINGS) {
    const match = srcFiles.find(f => f.startsWith(mapping.sourcePrefix));
    if (!match) {
      console.warn(`[WARN] Missing source image for prefix: ${mapping.sourcePrefix}`);
      continue;
    }

    const inputPath = path.join(srcDir, match);
    const outDir = path.join(publicImagesDir, mapping.targetDir);
    fs.mkdirSync(outDir, { recursive: true });

    const aspectHeightRatio = mapping.targetDir === 'authors' ? 1 : 9 / 16;

    for (const width of mapping.widths) {
      const height = Math.round(width * aspectHeightRatio);
      const baseName = `${mapping.slug}-${width}`;

      const pipeline = sharp(inputPath).resize(width, height, {
        fit: 'cover',
        position: mapping.targetDir === 'authors' ? 'attention' : 'centre'
      });

      await pipeline
        .clone()
        .avif({ quality: 56, effort: 4 })
        .toFile(path.join(outDir, `${baseName}.avif`));

      await pipeline
        .clone()
        .webp({ quality: 76 })
        .toFile(path.join(outDir, `${baseName}.webp`));

      await pipeline
        .clone()
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toFile(path.join(outDir, `${baseName}.jpg`));

      generatedCount += 3;
    }

    console.log(`[OK] Optimized ${mapping.targetDir}/${mapping.slug} (${mapping.widths.join('w, ')}w)`);
  }

  // Also optimize brand logo & icon into compact webp + png assets in public/images/brand/
  const brandOutDir = path.join(publicImagesDir, 'brand');
  fs.mkdirSync(brandOutDir, { recursive: true });

  const logoSrc = path.resolve(process.cwd(), 'public/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png');
  const iconSrc = path.resolve(process.cwd(), 'public/assets/aistudio/Global_Orbit_E_Icon_346096e1.png');

  if (fs.existsSync(logoSrc)) {
    await sharp(logoSrc)
      .resize(360, null, { withoutEnlargement: true })
      .webp({ quality: 86 })
      .toFile(path.join(brandOutDir, 'eirvan-logo-360.webp'));
    await sharp(logoSrc)
      .resize(360, null, { withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(brandOutDir, 'eirvan-logo-360.png'));
    generatedCount += 2;
  }

  if (fs.existsSync(iconSrc)) {
    await sharp(iconSrc)
      .resize(192, 192)
      .webp({ quality: 88 })
      .toFile(path.join(brandOutDir, 'eirvan-icon-192.webp'));
    await sharp(iconSrc)
      .resize(192, 192)
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(brandOutDir, 'eirvan-icon-192.png'));
    await sharp(iconSrc)
      .resize(512, 512)
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(brandOutDir, 'eirvan-icon-512.png'));
    // Generate standard favicons cleanly sized
    await sharp(iconSrc)
      .resize(64, 64)
      .png({ compressionLevel: 9 })
      .toFile(path.resolve(process.cwd(), 'public/favicon-64.png'));
    generatedCount += 4;
  }

  console.log(`\nImage optimization complete: ${generatedCount} responsive files written under public/images/`);
}

runOptimization().catch(err => {
  console.error('[IMAGE OPT ERROR]', err);
  process.exit(1);
});
