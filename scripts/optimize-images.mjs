import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = join(import.meta.dirname, '..', 'public', 'assets', 'nfts')
const files = (await readdir(dir)).filter((f) => f.endsWith('.png'))
for (const file of files) {
  const base = file.slice(0, -4)
  for (const width of [320, 640, 960]) {
    await sharp(join(dir, file))
      .resize({ width, height: width, fit: 'cover' })
      .webp({ quality: 78 })
      .toFile(join(dir, `${base}-${width}.webp`))
  }
  console.log(`✓ ${base}`)
}
