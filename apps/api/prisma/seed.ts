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
  console.log('Seeding trade categories...')
  for (const cat of categories) {
    await prisma.tradeCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Done — 8 categories seeded.')

  // Seed admin user
  const email = 'admin@tradelink.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123456'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { email, passwordHash, name: 'Admin', isAdmin: true }
    })
    console.log('Admin user created: admin@tradelink.com')
  } else if (!existing.isAdmin) {
    await prisma.user.update({ where: { email }, data: { isAdmin: true } })
    console.log('Existing user promoted to admin')
  } else {
    console.log('Admin user already exists')
  }

  // Seed default platform settings
  const defaults = [
    { key: 'maintenanceMode', value: 'false' },
    { key: 'allowNewRegistrations', value: 'true' },
    { key: 'maxQuotesPerJob', value: '5' },
    { key: 'jobExpiryDays', value: '30' },
    { key: 'platformFeePercent', value: '10' },
    { key: 'featuredCategories', value: '[]' },
  ]
  for (const s of defaults) {
    await prisma.platformSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  console.log('Platform settings seeded')
}

main().catch(console.error).finally(() => prisma.$disconnect())
