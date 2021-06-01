import {IterableChanges} from '@angular/core';
import {from} from 'rxjs';

/**
 * If fromIndex === undefined, it's insertion at toIndex. Note that if toIndex is also undefined, then it's appending to the list.
 * If toIndex === undefined, it's delete operation (note that the fromIndex must not be undefined).
 * If fromIndex !== undefined && toIndex !== undefined, it's a move operation.
 */
export interface UpdateOperation {
  readonly fromIndex?: number;
  readonly toIndex?: number;
}

type MutableUpdateOperation = {
  -readonly [K in keyof UpdateOperation]: UpdateOperation[K]
};

export class UpdateOperationsBuilder<V> {
  private readonly updateOperationsLookup = new Map<number, MutableUpdateOperation>();
  private readonly updateOperationsLookupTo = new Map<number, MutableUpdateOperation>();
  private readonly oldLength: number;
  private readonly newLength: number;
  private currLength: number;
  private rowsAvailableToDelete: number;
  private rowsAvailableToInsert: number;

  constructor(private readonly changes: IterableChanges<V>) {
    let oldLength = 0;
    changes.forEachPreviousItem(() => {
      oldLength++;
    });
    this.oldLength = oldLength;
    let newLength = 0;
    this.updateOperationsLookup = new Map();
    changes.forEachItem(() => {
      newLength++;
    });
    this.newLength = newLength;

    this.currLength = oldLength;
    this.rowsAvailableToDelete = Math.max(this.oldLength - this.newLength, 0);
    this.rowsAvailableToInsert = Math.max(this.newLength - this.oldLength, 0);
  }


  build() {
    this.changes.forEachItem(record => {
      if (record.previousIndex != null && Number.isInteger(record.previousIndex)) {
        const operation: MutableUpdateOperation = {
          fromIndex: record.previousIndex,
          toIndex: record.currentIndex!,
        };
        this.updateOperationsLookup.set(operation.fromIndex, operation);
        this.updateOperationsLookupTo.set(operation.toIndex, operation);
        // updateOperations.push(operation);
      }
    });
    for (let k = 0; k < this.newLength; k++) {
      const moveToK = this.updateOperationsLookupTo.get(k);
      if (moveToK) {
        if (moveToK.fromIndex > moveToK.toIndex) {
          this.moveUp(moveToK);
        }
        continue;
      }
      if (this.updateOperationsLookup.has(k)) {
        const moveFromK = this.updateOperationsLookup.get(k);
        const {fromIndex, toIndex} = moveFromK;
        if (fromIndex < toIndex) {
          this.insert(k);
          this.rowsAvailableToInsert--;
        }
      }
    }

    const updateOperations: MutableUpdateOperation[] = [];
    for (let i = 0; i < this.newLength; i++) {
      if (this.updateOperationsLookupTo.has(i)) {
        updateOperations.push(this.updateOperationsLookupTo.get(i));
      }
    }
    for (let i = 0; i < this.rowsAvailableToInsert; i++) {
      updateOperations.push({});
    }
    for (let i = 0; i < this.rowsAvailableToDelete; i++) {
      updateOperations.push({fromIndex: this.currLength - 1});
    }
    return updateOperations.filter(operation => operation.fromIndex === undefined || operation.fromIndex !== operation.toIndex);
  }

  private deleteEmptyRows(rowsWantToDelete: number, index: number): ReadonlyArray<MutableUpdateOperation> {
    const maxDeletable = Math.min(this.rowsAvailableToDelete, rowsWantToDelete);
    let rowsToDelete = 0;
    for (let i = index; i < maxDeletable; i++) {
      if (this.updateOperationsLookup.has(i)) {
        break;
      }
      rowsToDelete++;
    }
    if (rowsToDelete === 0) {
      return [];
    }
    for (let i = index + rowsToDelete; i < this.currLength; i++) {
      const remainingOperation = this.updateOperationsLookup.get(i);
      if (remainingOperation !== undefined) {
        this.updateOperationsLookup.set(i - rowsToDelete, remainingOperation);
        this.updateOperationsLookup.delete(i);
        remainingOperation.fromIndex = i - rowsToDelete;
      }
    }
    this.currLength -= rowsToDelete;
    this.rowsAvailableToDelete -= rowsToDelete;
    return Array.from({length: rowsToDelete}).map(() => ({fromIndex: index}));
  }

  private insertNewRows(rowsWantToInsert: number, index: number): ReadonlyArray<MutableUpdateOperation> {
    const rowsToInsert = Math.min(this.rowsAvailableToInsert, rowsWantToInsert);
    if (rowsToInsert === 0) {
      return [];
    }
    for (let i = this.currLength - 1; i >= index; i--) {
      const remainingOperation = this.updateOperationsLookup.get(i);
      if (remainingOperation !== undefined) {
        this.updateOperationsLookup.set(i + rowsToInsert, remainingOperation);
        this.updateOperationsLookup.delete(i);
        remainingOperation.fromIndex = i - rowsToInsert;
      }
    }
    this.currLength += rowsToInsert;
    this.rowsAvailableToInsert -= rowsToInsert;
    return Array.from({length: rowsToInsert}).map(() => ({toIndex: index}));
  }

  findNextEmptyIndex(fromIndex: number): number {
    for (let i = fromIndex + 1; i < this.currLength; i++) {
      if (!this.updateOperationsLookup.has(i)) {
        return i;
      }
    }
    return -1;
  }

  moveUp(operation: UpdateOperation) {
    if (operation.fromIndex === undefined || operation.toIndex === undefined || operation.fromIndex <= operation.toIndex) {
      throw Error(`${operation.fromIndex} ${operation.toIndex}`);
    }
    this.updateOperationsLookup.delete(operation.fromIndex);
    for (let i = operation.fromIndex; i > operation.toIndex; i--) {
      const inBetweenOperation = this.updateOperationsLookup.get(i - 1);
      if (inBetweenOperation !== undefined) {
        this.updateOperationsLookup.set(i, inBetweenOperation);
        this.updateOperationsLookup.delete(i - 1);
        inBetweenOperation.fromIndex = i;
      }
    }
    this.updateOperationsLookup.set(operation.toIndex, operation);
  }

  insert(index: number) {
    this.updateOperationsLookupTo.set(index, {toIndex: index});
    for (let i = this.newLength - 1; i > index; i--) {
      const inBetweenOperation = this.updateOperationsLookup.get(i - 1);
      if (inBetweenOperation !== undefined) {
        this.updateOperationsLookup.set(i, inBetweenOperation);
        this.updateOperationsLookup.delete(i - 1);
        inBetweenOperation.fromIndex = i;
      }
    }
  }
}
