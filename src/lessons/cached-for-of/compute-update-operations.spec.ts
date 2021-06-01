import {DefaultIterableDiffer, IterableChanges, IterableDiffer, NgIterable} from '@angular/core';
import {UpdateOperation, UpdateOperationsBuilder} from './compute-update-operations';

describe('UpdateOperationBuilder', () => {
  it('should do it', () => {
    const prevIterables = [
      ['a', 'b'],
    ];
    const nextIterables = [
      [],
      ['a'],
      ['b'],
      ['c'],
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'a'],
      ['b', 'c'],
      ['c', 'a'],
      ['c', 'b'],
      ['c', 'd'],
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
      ['b', 'c', 'a'],
      ['c', 'a', 'b'],
      ['c', 'b', 'a'],
      ['c', 'd', 'a'],
      ['c', 'a', 'd'],
      ['a', 'c', 'd'],
      ['c', 'd', 'b'],
      ['c', 'b', 'd'],
      ['b', 'c', 'd'],
      ['c', 'd', 'e'],
    ];

    for (const prevIterable of prevIterables) {
      for (const nextIterable of nextIterables) {
        new UpdateOperationsChecker<string>()
          .specifyPrevIterable(prevIterable)
          .specifyNextIterable(nextIterable)
          .checkFinalResult();
      }
    }
  });

  it('should reverse', () => {
    new UpdateOperationsChecker<string>()
      .specifyPrevIterable(['a', 'b', 'c', 'd', 'e', 'f'])
      .specifyNextIterable(['f', 'e', 'd', 'c', 'b', 'a'])
      .expectFinalIterable(['f', 'e', 'd', 'c', 'b', 'a']);
  });

  it('should move bottom to top', () => {
    new UpdateOperationsChecker<string>()
      .specifyPrevIterable(['a', 'b', 'c'])
      .specifyNextIterable(['c', 'a', 'b'])
      .checkFinalResult()
      .expectFinalIterable(['c', 'a', 'b']);
  });

  it('should move 1', () => {
    new UpdateOperationsChecker<string>()
      .specifyPrevIterable(['a', 'b', 'c', 'd'])
      .specifyNextIterable(['c', 'a', 'e'])
      .expectTransformSequence([
        ['a', 'b', 'c'],
        ['a', 'd', 'd'],
        ['b', 'a', 'd'],
      ])
      .checkFinalResult()
      .expectFinalIterable(['c', 'a', 'b']);
  });

  it('should move 2', () => {
    new UpdateOperationsChecker<string>()
      .specifyPrevIterable(['a', 'b'])
      .specifyNextIterable(['c', 'b', 'a'])
      .expectTransformSequence([
        ['x', 'a', 'b'],
        ['x', 'b', 'a'],
      ]);
    // .checkFinalResult()
    // .expectFinalIterable(['x', 'b', 'a']);
  });

  it('should move 3', () => {
    new UpdateOperationsChecker<string>()
      .specifyPrevIterable(['a', 'b'])
      .specifyNextIterable(['c', 'd', 'b', 'a'])
      .expectTransformSequence([
        ['c', 'a', 'b'],
        ['c', 'b', 'a'],
      ]);
    // .checkFinalResult()
    // .expectFinalIterable(['x', 'b', 'a']);
  });
});

class UpdateOperationsChecker<T> {
  private internalCurrentIterable?: NgIterable<T>;
  private internalTargetIterable?: NgIterable<T>;
  private transformSequence: Array<ReadonlyArray<T>> = [];
  private updateOperations: ReadonlyArray<UpdateOperation> = [];

  private newItemFactory: (index?: number) => T = () => 'x' as unknown as T;

  specifyPrevIterable(iterable: NgIterable<T>): UpdateOperationsChecker<T> {
    this.internalCurrentIterable = iterable;
    return this;
  }

  specifyNextIterable(iterable: NgIterable<T>): UpdateOperationsChecker<T> {
    this.internalTargetIterable = iterable;
    this.produceTransformSequenceIfNeeded();
    return this;
  }

  checkFinalResult(): UpdateOperationsChecker<T> {
    const fromArray = [...this.internalCurrentIterable];
    const toArray = [...this.internalTargetIterable];
    const lastTransform =
      this.transformSequence[this.transformSequence.length - 1];
    const actual = lastTransform ? [...lastTransform] : [...fromArray];
    const expected = [...this.internalTargetIterable];
    for (let i = 0; i < expected.length; i++) {
      if (!fromArray.includes(expected[i])) {
        delete expected[i];
      }
    }
    for (let i = 0; i < actual.length; i++) {
      if (!toArray.includes(actual[i])) {
        delete actual[i];
      }
    }
    expect(JSON.stringify(actual))
      .toBe(
        JSON.stringify(expected), `From ${fromArray} to array: ${toArray}`);
    return this;
  }

  expectTransformSequence(sequence: ReadonlyArray<NgIterable<T>>):
    UpdateOperationsChecker<T> {
    const fromArray = [...this.internalCurrentIterable];
    const toArray = [...this.internalTargetIterable];
    for (let i = 0;
         i < Math.max(sequence.length, this.transformSequence.length); i++) {
      const expected = [...sequence[i]];
      expect(JSON.stringify(this.transformSequence[i]))
        .toBe(
          JSON.stringify(expected),
          `Prev: ${JSON.stringify(fromArray)} to ${JSON.stringify(toArray)}. Step ${i}: ${
            this.updateOperations.map(
              ({fromIndex, toIndex}) =>
                `${fromIndex} -> ${toIndex}`)}`);
    }
    return this;
  }

  expectFinalIterable(transform: NgIterable<T>): UpdateOperationsChecker<T> {
    const fromArray = [...this.internalCurrentIterable];
    const toArray = [...this.internalTargetIterable];
    const lastTransform =
      this.transformSequence[this.transformSequence.length - 1];
    const actual = lastTransform ? [...lastTransform] : [...fromArray];
    expect(JSON.stringify(actual))
      .toBe(
        JSON.stringify([...transform]),
        `From ${fromArray} to array: ${toArray}`);
    return this;
  }

  produceTransformSequenceIfNeeded() {
    if (this.transformSequence.length > 0) {
      return;
    }
    expect(this.internalCurrentIterable).toBeTruthy();
    expect(this.internalTargetIterable).toBeTruthy();
    const differ: IterableDiffer<T> = new DefaultIterableDiffer<T>();
    differ.diff(this.internalCurrentIterable);
    const changes = differ.diff(this.internalTargetIterable);
    if (!changes) {
      return;
    }
    const updateOperations = new UpdateOperationsBuilder(changes).build();
    const interimArray = [...this.internalCurrentIterable];
    for (let i = 0; i < updateOperations.length; i++) {
      const {fromIndex, toIndex} = updateOperations[i];
      if (fromIndex !== undefined && toIndex !== undefined) {
        interimArray.splice(toIndex, 0, ...interimArray.splice(fromIndex, 1));
      } else if (fromIndex !== undefined) {
        interimArray.splice(fromIndex, 1);
      } else if (toIndex !== undefined) {
        interimArray.splice(toIndex, 0, this.newItemFactory(toIndex));
      } else {
        interimArray.push(this.newItemFactory());
      }
      this.updateOperations = updateOperations;
      this.transformSequence.push([...interimArray]);
    }
  }
}
