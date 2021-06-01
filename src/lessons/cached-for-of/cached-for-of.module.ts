import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CachedForOf} from './cached-for-of.directive';
import { CachedForDestroyNotifierComponent } from './cached-for-destroy-notifier.component';


@NgModule({
  declarations: [
    CachedForOf,
    CachedForDestroyNotifierComponent,
  ],
  exports: [
    CachedForOf,
  ],
  imports: [
    CommonModule
  ]
})
export class CachedForOfModule { }
