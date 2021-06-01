import {
  ComponentFactoryResolver,
  Directive,
  DoCheck,
  EmbeddedViewRef,
  Input,
  isDevMode,
  IterableChangeRecord,
  IterableChanges,
  IterableDiffer,
  IterableDiffers,
  NgIterable,
  OnDestroy,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef
} from '@angular/core';
import {CachedForDestroyNotifierComponent} from './cached-for-destroy-notifier.component';

// tslint:disable:variable-name
export class CachedForOfContext<T, U extends NgIterable<T> = NgIterable<T>> {
  constructor(public $implicit: T, public cachedForOf: U, public index: number, public count: number) {
  }

  get first(): boolean {
    return this.index === 0;
  }

  get last(): boolean {
    return this.index === this.count - 1;
  }

  get even(): boolean {
    return this.index % 2 === 0;
  }

  get odd(): boolean {
    return !this.even;
  }
}

export interface CacheProvider<T, U extends NgIterable<T> = NgIterable<T>> {
  cacheViewOrDestroy(view: EmbeddedViewRef<CachedForOfContext<T, U>>, item: T): void;

  getView(item: T): EmbeddedViewRef<CachedForOfContext<T, U>> | undefined;

  clear(): void;
}

export class DefaultCacheProvider<T, U extends NgIterable<T> = NgIterable<T>> implements CacheProvider<T, U> {
  private readonly views: Array<EmbeddedViewRef<CachedForOfContext<T, U>>> = [];

  constructor(private readonly cacheLimit: number = 0) {
  }

  cacheViewOrDestroy(view: EmbeddedViewRef<CachedForOfContext<T, U>>, item: T): void {
    if (this.cacheLimit === 0 || this.cacheLimit > this.views.length) {
      this.views.push(view);
    } else {
      view.destroy();
    }
  }

  getView(item: T): EmbeddedViewRef<CachedForOfContext<T, U>> | undefined {
    return this.views.pop();
  }

  clear(): void {
    for (const view of this.views) {
      view.destroy();
    }
    this.views.splice(0, this.views.length);
  }
}

// tslint:disable-next-line:directive-selector
@Directive({selector: '[cachedFor][cachedForOf]'})
// tslint:disable-next-line:directive-class-suffix
export class CachedForOf<T, U extends NgIterable<T> = NgIterable<T>> implements DoCheck, OnDestroy {
  private readonly defaultCacheProvider: CacheProvider<T, U> = new DefaultCacheProvider();

  // readonly defaultCachedViews: Array<EmbeddedViewRef<CachedForOfContext<T, U>>> = [];

  /**
   * The value of the iterable expression, which can be used as a
   * [template input variable](guide/structural-directives#template-input-variable).
   */
  @Input()
  set cachedForOf(cachedForOf: U & NgIterable<T> | undefined | null) {
    this._cachedForOf = cachedForOf;
    this._cachedForOfDirty = true;
  }

  @Input() cachedForCacheProvider: CacheProvider<T, U> = this.defaultCacheProvider;

  @Input()
  set cachedForTrackBy(fn: TrackByFunction<T>) {
    if (isDevMode() && fn != null && typeof fn !== 'function') {
      // TODO(vicb): use a log service once there is a public one available
      if (console && console.warn) {
        console.warn(
          `trackBy must be a function, but received ${JSON.stringify(fn)}. ` +
          `See https://angular.io/api/common/CachedForOf#change-propagation for more information.`);
      }
    }
    this._trackByFn = fn;
  }

  get cachedForTrackBy(): TrackByFunction<T> {
    return this._trackByFn;
  }

  private _cachedForOf: U | undefined | null = null;
  private _cachedForOfDirty = true;
  private _differ: IterableDiffer<T> | null = null;
  // TODO(issue/24571): remove '!'.
  private _trackByFn!: TrackByFunction<T>;

  constructor(
    private readonly _viewContainer: ViewContainerRef,
    private _template: TemplateRef<CachedForOfContext<T, U>>,
    private readonly _differs: IterableDiffers,
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    ) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(CachedForDestroyNotifierComponent);
    const componentRef = this._viewContainer.createComponent(componentFactory);
    componentRef.instance.setOnDestroyCallback(() => {
      const containerLength = this._viewContainer.length;
      console.log('looking at child', containerLength);
      for (let i = containerLength - 1; i >= 1; i--) {
        const view = this._viewContainer.detach(i);
        if (view.destroyed) {
          console.log('view destroyed');
        }
      }
    });
  }

  @Input()
  set cachedForTemplate(value: TemplateRef<CachedForOfContext<T, U>>) {
    // TODO(TS2.1): make TemplateRef<Partial<CachedForRowOf<T>>> once we move to TS v2.1
    // The current type is too restrictive; a template that just uses index, for example,
    // should be acceptable.
    if (value) {
      this._template = value;
    }
  }

  /**
   * Applies the changes when needed.
   */
  ngDoCheck(): void {
    if (this._cachedForOfDirty) {
      this._cachedForOfDirty = false;
      // React on cachedForOf changes only once all inputs have been initialized
      const value = this._cachedForOf;
      if (!this._differ && value) {
        try {
          this._differ = this._differs.find(value).create(this.cachedForTrackBy);
        } catch {
          throw new Error(`Cannot find a differ supporting object '${value}' of type '${
            getTypeName(value)}'. CachedFor only supports binding to Iterables such as Arrays.`);
        }
      }
    }
    if (this._differ) {
      const changes = this._differ.diff(this._cachedForOf);
      if (changes) {
        this._applyChanges2(changes);
      }
    }
  }

  ngOnDestroy() {
    this.defaultCacheProvider.clear();
  }

  private _applyChanges(changes: IterableChanges<T>) {
    const insertTuples: RecordViewTuple<T, U>[] = [];
    changes.forEachOperation(
      (item: IterableChangeRecord<T>, adjustedPreviousIndex: number | null,
       currentIndex: number | null) => {
        if (item.previousIndex == null) {
          // CachedForOf is never "null" or "undefined" here because the differ detected
          // that a new item needs to be inserted from the iterable. This implies that
          // there is an iterable value for "_cachedForOf".
          const indexToInsert = currentIndex === null ? undefined : currentIndex + 1;
          let view = this.cachedForCacheProvider.getView(item.item);
          if (view) {
            this._viewContainer.insert(view, indexToInsert);
          } else {
            view = this._viewContainer.createEmbeddedView(
              this._template, new CachedForOfContext<T, U>(null!, this._cachedForOf!, -1, -1),
              indexToInsert);
          }
          const tuple = new RecordViewTuple<T, U>(item, view);
          insertTuples.push(tuple);
        } else if (currentIndex == null) {
          const indexToRemove = adjustedPreviousIndex === null ? undefined : adjustedPreviousIndex + 1;
          const view = this._viewContainer.detach(indexToRemove) as EmbeddedViewRef<CachedForOfContext<T, U>>;
          delete view.context.$implicit;
          delete view.context.cachedForOf;
          view.context.index = -1;
          view.context.count = -1;
          this.cachedForCacheProvider.cacheViewOrDestroy(view, item.item);
        } else if (adjustedPreviousIndex !== null) {
          const view = this._viewContainer.get(adjustedPreviousIndex + 1)!;
          this._viewContainer.move(view, currentIndex);
          const tuple = new RecordViewTuple(item, view as EmbeddedViewRef<CachedForOfContext<T, U>>);
          insertTuples.push(tuple);
        }
      });

    for (const insertTuple of insertTuples) {
      // perViewChange
      insertTuple.view.context.$implicit = insertTuple.record.item;
    }

    const viewContainerLength = this._viewContainer.length;

    for (let i = 1, ilen = viewContainerLength; i < ilen; i++) {
      const viewRef = this._viewContainer.get(i) as EmbeddedViewRef<CachedForOfContext<T, U>>;
      const context = viewRef.context as CachedForOfContext<T>;
      context.index = i;
      context.count = ilen;
      context.cachedForOf = this._cachedForOf!;
    }

    changes.forEachIdentityChange((record: IterableChangeRecord<T>) => {
      const viewRef =
        this._viewContainer.get(record.currentIndex) as EmbeddedViewRef<CachedForOfContext<T, U>>;
      // populate data
      viewRef.context.$implicit = record.item;
    });
    // const v = this._viewContainer.detach(0);
    // this._viewContainer.insert(v, this._viewContainer.length);
  }


  private _applyChanges2(changes: IterableChanges<T>) {
    const moveOperations = produceMoveOperations(changes);
    for (const moveOperation of moveOperations) {
      const viewRef = this._viewContainer.get(moveOperation.fromIndex + 1);
      this._viewContainer.move(viewRef, moveOperation.toIndex + 1);
    }
    let newLength = 0;
    changes.forEachItem(() => {
      newLength++;
    });
    let index = 0;
    changes.forEachItem(record => {
      let viewRef =
        this._viewContainer.get(record.currentIndex + 1) as EmbeddedViewRef<CachedForOfContext<T, U>>;
      if (!viewRef) {
        viewRef = this.cachedForCacheProvider.getView(record.item);
        if (viewRef) {
          this._viewContainer.insert(viewRef);
        } else {
          viewRef = this._viewContainer.createEmbeddedView(
            this._template, new CachedForOfContext<T, U>(null!, this._cachedForOf!, -1, -1));
        }
      }
      const context = viewRef.context;
      context.index = index;
      context.count = newLength;
      viewRef.context.$implicit = record.item;
      index++;
    });

    for (let i = this._viewContainer.length; i > newLength + 1; i--) {
      const view = this._viewContainer.detach() as EmbeddedViewRef<CachedForOfContext<T, U>>;
      const item = view.context.$implicit;
      delete view.context.$implicit;
      delete view.context.cachedForOf;
      view.context.index = -1;
      view.context.count = -1;
      this.cachedForCacheProvider.cacheViewOrDestroy(view, item);
    }
  }

  /**
   * Asserts the correct type of the context for the template that `CachedForOf` will render.
   *
   * The presence of this method is a signal to the Ivy template type-check compiler that the
   * `CachedForOf` structural directive renders its template with a specific context type.
   */
  static ngTemplateContextGuard<T, U extends NgIterable<T>>(dir: CachedForOf<T, U>, ctx: any):
    ctx is CachedForOfContext<T, U> {
    return true;
  }
}

class RecordViewTuple<T, U extends NgIterable<T>> {
  constructor(public record: IterableChangeRecord<T>, public view: EmbeddedViewRef<CachedForOfContext<T, U>>) {
  }
}

function getTypeName(type: any): string {
  return type['name'] || typeof type;
}

export interface MoveOperation {
  readonly fromIndex: number;
  readonly toIndex: number;
}

type MutableMoveOperation = {
  -readonly [K in keyof MoveOperation]: MoveOperation[K]
};

export function produceMoveOperations(changes: IterableChanges<unknown>): ReadonlyArray<MoveOperation> {
  const moveOperationsLookup = new Map<number, MutableMoveOperation>();
  const moveOperations: MutableMoveOperation[] = [];

  let oldLength = 0;
  changes.forEachPreviousItem(record => {
    oldLength++;
  });
  let newLength = 0;
  changes.forEachItem(record => {
    newLength++;
    if (record.previousIndex !== null && Number.isInteger(record.previousIndex)) {
      const operation: MutableMoveOperation = {
        fromIndex: record.previousIndex,
        toIndex: record.currentIndex!,
      };
      moveOperations.push(operation);
      moveOperationsLookup.set(operation.fromIndex, operation);
    }
  });
  let toInsertCount = Math.max(newLength - oldLength, 0);
  let toDeleteCount = Math.max(oldLength - newLength, 0);
  moveOperations.sort((op1, op2) => op1.toIndex - op2.toIndex);
  for (let k = 0; k < moveOperations.length; k++) {
    const {fromIndex, toIndex} = moveOperations[k];
    if (fromIndex === toIndex) {
      continue;
    }
    if (fromIndex > toIndex) {
      // move up
      moveUp(moveOperations[k], moveOperationsLookup);
      continue;
    }
    // item is moved down, so instead of letting it move down, find an empty item to move up.
    if (toInsertCount > 0) {
      moveOperations.splice(k, 0, {fromIndex: -1, toIndex: k});
      k++;
      toInsertCount--;
      break;
    }
    const newOperation: MoveOperation = {
      fromIndex: findNextEmptyIndex(moveOperationsLookup, fromIndex, newLength),
      toIndex: k,
    };
    if (newOperation.fromIndex >= 0) {
      moveOperations.splice(k, 0, newOperation);
      k++;
      moveUp(newOperation, moveOperationsLookup);
    }
  }
  for (let i = 0; i < toInsertCount; i++) {
    moveOperations.push({fromIndex: -1, toIndex: -1});
  }
  return moveOperations.filter(operation => operation.fromIndex !== operation.toIndex);
}

function findNextEmptyIndex(moveOperationsLookup: Map<number, MutableMoveOperation>, fromIndex: number, length: number): number {
  for (let i = fromIndex + 1; i < length; i++) {
    if (!moveOperationsLookup.has(i)) {
      return i;
    }
  }
  return -1;
}

function moveUp(operation: MoveOperation, moveOperationsLookup: Map<number, MutableMoveOperation>) {
  moveOperationsLookup.delete(operation.fromIndex);
  for (let i = operation.fromIndex; i > operation.toIndex; i--) {
    const inBetweenOperation = moveOperationsLookup.get(i - 1);
    if (inBetweenOperation !== undefined) {
      moveOperationsLookup.set(i, inBetweenOperation);
      moveOperationsLookup.delete(i - 1);
      inBetweenOperation.fromIndex = i;
    }
  }
  moveOperationsLookup.set(operation.toIndex, operation);
}



export function produceMoveOperations2(changes: IterableChanges<unknown>): ReadonlyArray<MoveOperation> {
  const moveOperationsLookup: { [key: number]: MutableMoveOperation } = {};
  const moveOperations: Array<MutableMoveOperation> = [];
  changes.forEachItem(record => {
    if (Number.isInteger(record.previousIndex)) {
      const operation: MutableMoveOperation = {
        fromIndex: record.previousIndex,
        toIndex: record.currentIndex,
      };
      moveOperations.push(operation);
      moveOperationsLookup[operation.fromIndex] = operation;
    }
  });
  moveOperations.sort((operation1, operation2) => operation2.toIndex - operation1.toIndex);
  for (const operation of moveOperations) {
    for (let i = operation.fromIndex; i < operation.toIndex; i++) {
      if (moveOperationsLookup[i + 1] !== undefined) {
        moveOperationsLookup[i] = moveOperationsLookup[i + 1];
        delete moveOperationsLookup[i + 1];
        moveOperationsLookup[i].fromIndex = i;
      }
    }
  }
  return moveOperations.filter((operation: MutableMoveOperation): operation is MoveOperation => operation.fromIndex !== operation.toIndex);
}
