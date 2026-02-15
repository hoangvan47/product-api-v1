import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../@shared/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(buyerId: number, dto: CreateOrderDto) {
    if (!dto.items.length) {
      throw new BadRequestException('Danh sach san pham dat hang khong duoc rong.');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: { in: ['ACTIVE', 'LIVE'] } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Mot hoac nhieu san pham khong hop le hoac da ngung ban.');
    }

    const items = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return this.prisma.order.create({
      data: {
        buyerId,
        source: dto.source,
        roomId: dto.roomId,
        totalAmount,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });
  }

  listMyOrders(buyerId: number) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }
}
