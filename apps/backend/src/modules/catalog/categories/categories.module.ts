import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryImagesService } from './category-images.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryImagesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

