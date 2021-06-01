import {ChangeDetectionStrategy, Component, EmbeddedViewRef, NgIterable, OnDestroy, OnInit} from '@angular/core';
import {PageEvent} from '@angular/material/paginator';
import {CachedForOfContext, CacheProvider, DefaultCacheProvider} from '../cached-for-of/cached-for-of.directive';

export interface Row {
  readonly rowId: string;
  readonly name: string;
  readonly rowClass: string;
}

@Component({
  selector: 'app-cached-for-of-usage',
  templateUrl: './cached-for-of-usage.component.html',
  styleUrls: ['./cached-for-of-usage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CachedForOfUsageComponent implements OnInit, OnDestroy {

  readonly cachedViews: CacheProvider<Row, ReadonlyArray<Row>> = new DefaultCacheProvider();

  readonly pageSize = 5;
  pageIndex = 0;
  pageRows: ReadonlyArray<Row> = [];

  readonly allRows: ReadonlyArray<Row> = [
    {rowId: '1', name: 'Row 1', rowClass: 'yellow'},
    {rowId: '2', name: 'Row 2', rowClass: 'red'},
    {rowId: '3', name: 'Row 3', rowClass: 'blue'},
    {rowId: '4', name: 'Row 4', rowClass: 'blue'},
    {rowId: '5', name: 'Row 5', rowClass: 'blue'},
    {rowId: '2', name: 'Row 2 (red)', rowClass: 'red'},
    {rowId: '6', name: 'Row 6', rowClass: 'yellow'},
    {rowId: '1', name: 'Row 1 (green)', rowClass: 'green'},
  ];

  readonly pageSize2 = 5;
  pageIndex2 = 0;
  pageRows2: ReadonlyArray<Row> = [];

  readonly allRows2: ReadonlyArray<Row> = [
    {rowId: '21', name: 'Row 21', rowClass: 'yellow'},
    {rowId: '22', name: 'Row 22', rowClass: 'red'},
    {rowId: '23', name: 'Row 23', rowClass: 'blue'},
    {rowId: '24', name: 'Row 24', rowClass: 'blue'},
    {rowId: '25', name: 'Row 25', rowClass: 'blue'},
    {rowId: '22', name: 'Row 22 (red)', rowClass: 'red'},
    {rowId: '26', name: 'Row 26', rowClass: 'yellow'},
    {rowId: '21', name: 'Row 21 (green)', rowClass: 'green'},
  ];

  constructor() {
    this.computePageRows();
    this.computePageRows2();
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    console.log('Usage component onDestroy');
    this.cachedViews.clear();
  }

  private computePageRows() {
    this.pageRows = this.allRows.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }

  private computePageRows2() {
    this.pageRows2 = this.allRows2.slice(this.pageIndex2 * this.pageSize2, (this.pageIndex2 + 1) * this.pageSize2);
  }

  onPageChange(changeEvent: PageEvent) {
    this.pageIndex = changeEvent.pageIndex;
    this.computePageRows();
  }

  onPageChange2(changeEvent: PageEvent) {
    this.pageIndex2 = changeEvent.pageIndex;
    this.computePageRows2();
  }

  trackByFn(index: number, value: Row): string {
    return value.rowId;
  }

  counter = 0;

  increment() {
    this.counter++;
  }

  counter1 = 0;
  increment1() {
    this.counter1++;
  }
}
