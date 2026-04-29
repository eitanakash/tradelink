import { prisma } from '../src/lib/prisma'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

async function main() {
  const profiles = await prisma.contractorProfile.findMany({
    where: { slug: null },
    include: { user: { select: { name: true } } },
  })

  console.log(`Found ${profiles.length} contractor(s) with null slug`)

  for (const p of profiles) {
    const slug = generateSlug(p.user.name ?? p.id)
    await prisma.contractorProfile.update({ where: { id: p.id }, data: { slug } })
    console.log(`  ${p.id} → ${slug}`)
  }

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
