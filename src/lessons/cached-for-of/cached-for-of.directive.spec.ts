import {DefaultIterableDiffer, IterableChanges, IterableDiffer} from '@angular/core';
import {produceMoveOperations} from './cached-for-of.directive';

describe('CachedForOfDirective', () => {
  // it('should create an instance', () => {
  //   const differ: IterableDiffer<string> = new DefaultIterableDiffer<string>();
  //   differ.diff(['a', 'b', 'c', 'd', 'e', 'f']);
  //   const changes: IterableChanges<string> = differ.diff(['g', 'c', 'd', 'a']);
  //
  //   const moveOperations = produceMoveOperations(changes);
  //   expect(moveOperations).toEqual([{fromIndex: 0, toIndex: 3}]);
  // });

  it('should reverse', () => {
    verifyMoveOperations(['a', 'b', 'c', 'd', 'e', 'f'], ['f', 'e', 'd', 'c', 'b', 'a']);
  });

  it('should move top to bottom', () => {
    verifyMoveOperations(['a', 'b', 'c', 'd', 'e', 'f'], ['b', 'c', 'd', 'e', 'f', 'a']);
  });

  it('should move bottom to top', () => {
    verifyMoveOperations(['a', 'b', 'c', 'd', 'e', 'f'], ['f', 'a', 'b', 'c', 'd', 'e']);
  });

  it('should move 1', () => {
    verifyMoveOperations(['a', 'x', 'c'], ['c', 'y', 'a'], ['c', 'x', 'a']);
  });

  it('should move 2', () => {
    verifyMoveOperations(['a', 'x', 'c'], ['y', 'c', 'a'], ['x', 'c', 'a']);
  });
});

function verifyMoveOperations<T>(fromArray: T[], toArray: T[], expectArray?: T[]) {
  const differ: IterableDiffer<T> = new DefaultIterableDiffer<T>();
  differ.diff(fromArray);
  const changes: IterableChanges<T> = differ.diff(toArray);
  const moveOperations = produceMoveOperations(changes);

  const a = [...fromArray];
  for (const moveOperation of moveOperations) {
    move(a, moveOperation.fromIndex, moveOperation.toIndex);
  }
  expect(a).toEqual(expectArray ? expectArray : toArray);
}

function move<T>(arr: T[], oldIndex: number, newIndex: number) {
  while (oldIndex < 0) {
    oldIndex += arr.length;
  }
  while (newIndex < 0) {
    newIndex += arr.length;
  }
  if (newIndex >= arr.length) {
    let k = newIndex - arr.length;
    while ((k--) + 1) {
      arr.push(undefined);
    }
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
  return arr;
}
