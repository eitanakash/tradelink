import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
  // Trade categories — safe to run multiple times
  console.log('Seeding trade categories...')
  for (const cat of categories) {
    await prisma.tradeCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log(`✓ ${categories.length} categories seeded`)

  // Admin user — only if ADMIN_EMAIL and ADMIN_PASSWORD are set
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { isAdmin: true },
      create: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        isAdmin: true,
      },
    })
    console.log(`✓ Admin user upserted: ${adminEmail}`)
  } else {
    console.log('⚠ Skipping admin user — set ADMIN_EMAIL and ADMIN_PASSWORD env vars to create one')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
