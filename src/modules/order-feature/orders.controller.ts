import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Tao don hang (mua tren live hoac ngoai giao dien)' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Danh sach don hang cua user hien tai' })
  listMine(@Req() req: AuthenticatedRequest) {
    return this.ordersService.listMyOrders(req.user.sub);
  }
}
