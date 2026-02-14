import { PrismaClient, ProductStatus } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'demo@shop.local' },
    update: {},
    create: {
      email: 'demo@shop.local',
      password: passwordHash,
    },
  });

  const seller = await prisma.user.findUniqueOrThrow({
    where: { email: 'demo@shop.local' },
  });

  const products = [
    {
      title: 'Tai nghe Pro X',
      description: 'Tai nghe không dây chống ồn chủ động.',
      price: 129.99,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      sellerId: seller.id,
      status: ProductStatus.ACTIVE,
    },
    {
      title: 'Bàn phím Cơ K68',
      description: 'Switch tactile, RGB, layout 68 phím.',
      price: 89.5,
      imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800',
      sellerId: seller.id,
      status: ProductStatus.ACTIVE,
    },
    {
      title: 'Chuột Gaming M5',
      description: 'Cảm biến chính xác cao, trọng lượng nhẹ.',
      price: 59.0,
      imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
      sellerId: seller.id,
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const item of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(item) + 1 },
      update: item,
      create: item,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
