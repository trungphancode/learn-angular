import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CachedForOfUsageComponent } from './cached-for-of-usage.component';
import {MatPaginatorModule} from '@angular/material/paginator';
import {CachedForOfModule} from '../cached-for-of/cached-for-of.module';


@NgModule({
  declarations: [CachedForOfUsageComponent],
  imports: [
    CommonModule,
    MatPaginatorModule,
    CachedForOfModule,
  ],
})
export class CachedForOfUsageModule { }
