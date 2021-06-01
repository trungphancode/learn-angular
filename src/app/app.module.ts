import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {CdModule} from '../lessons/cd/cd.module';
import {CachedForOfUsageModule} from '../lessons/cached-for-of-usage/cached-for-of-usage.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CdModule,
    CachedForOfUsageModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
