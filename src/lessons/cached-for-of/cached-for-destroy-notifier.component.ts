import {Component, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-cached-for-destroy-notifier',
  template: '',
})
export class CachedForDestroyNotifierComponent implements OnInit, OnDestroy {

  callback: () => void = () => {};

  constructor() { }

  setOnDestroyCallback(callback: () => void) {
    this.callback = callback;
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.callback();
  }
}
