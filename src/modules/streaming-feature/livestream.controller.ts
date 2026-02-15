import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../@core/decorators/public.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LivestreamService } from './livestream.service';

type AuthenticatedRequest = {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('livestream')
@Controller('livestream/rooms')
export class LivestreamController {
  constructor(private readonly livestreamService: LivestreamService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Người bán tạo phòng livestream' })
  createRoom(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoomDto) {
    return this.livestreamService.createRoom(req.user.sub, dto.title);
  }

  @Post(':roomId/join')
  @Public()
  @ApiOperation({ summary: 'Join phòng livestream qua link phòng' })
  joinRoom(@Param('roomId') roomId: string, @Body() dto: JoinRoomDto) {
    return this.livestreamService.joinRoom(roomId, dto.role, dto.userId);
  }

  @Post(':roomId/start')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Người bán bắt đầu livestream' })
  startRoom(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.livestreamService.startRoom(roomId, req.user.sub);
  }

  @Post(':roomId/stop')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Người bán dừng livestream' })
  stopRoom(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.livestreamService.stopRoom(roomId, req.user.sub);
  }

  @Get(':roomId')
  @Public()
  @ApiOperation({ summary: 'Lấy trạng thái phòng livestream' })
  getRoom(@Param('roomId') roomId: string) {
    return this.livestreamService.getRoom(roomId);
  }

  @Get(':roomId/viewers')
  @Public()
  @ApiOperation({ summary: 'Lấy số người đang xem livestream' })
  getViewerCount(@Param('roomId') roomId: string) {
    return this.livestreamService.getViewerCount(roomId);
  }
}
