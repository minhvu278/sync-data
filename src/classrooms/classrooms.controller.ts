import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { SyncClassroomResult, SyncClassroomsDto } from './dto/sync-classrooms.dto';

@Controller('sync/classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async syncClassrooms(@Body() dto: SyncClassroomsDto): Promise<{ status: string; message: string; data: SyncClassroomResult[] }> {
    const result = await this.classroomsService.syncClassrooms(dto);
    return {
      status: 'success',
      message: 'Sync completed for multiple classrooms',
      data: result,
    };
  }
}