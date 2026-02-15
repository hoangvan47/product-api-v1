import { Injectable } from '@nestjs/common';
import { PrismaService } from '../@shared/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'LIVE'] } },
      orderBy: { id: 'asc' },
    });
  }

  create(sellerId: number, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        status: dto.status ?? 'ACTIVE',
        sellerId,
      },
    });
  }
}
