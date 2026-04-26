import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'AC Installation', description: 'Air conditioning installation and repair', icon: '❄️' },
  { name: 'Plumbing', description: 'Pipes, leaks, and water systems', icon: '🔧' },
  { name: 'Electrical', description: 'Wiring, panels, and electrical work', icon: '⚡' },
  { name: 'Moving', description: 'Residential and commercial moving services', icon: '📦' },
  { name: 'Painting', description: 'Interior and exterior painting', icon: '🎨' },
  { name: 'Carpentry', description: 'Custom woodwork and furniture', icon: '🪚' },
  { name: 'Roofing', description: 'Roof installation and repair', icon: '🏠' },
  { name: 'Landscaping', description: 'Garden design and maintenance', icon: '🌿' },
]

async function main() {
  console.log('Seeding trade categories...')
  for (const cat of categories) {
    await prisma.tradeCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Done — 8 categories seeded.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
