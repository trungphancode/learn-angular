import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {CdComponent} from '../lessons/cd/cd.component';
import {CachedForOfUsageComponent} from '../lessons/cached-for-of-usage/cached-for-of-usage.component';


const routes: Routes = [
  {
    path: 'cd',
    component: CdComponent,
  },
  {
    path: 'for',
    component: CachedForOfUsageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
