import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (mock data từ DB)' })
  @ApiOkResponse({ type: ProductDto, isArray: true })
  list() {
    return this.productsService.list();
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo sản phẩm mới (seller)' })
  @ApiOkResponse({ type: ProductDto })
  create(@Req() req: { user: { sub: number } }, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.sub, dto);
  }
}
