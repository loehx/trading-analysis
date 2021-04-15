const util = require('../../src/shared/util');

describe('util', () => {

    test.each([
        [0, [0, 5], undefined, [1, 0, 0, 0, 0, 0]],
        [1, [0, 5], undefined, [0, 1, 0, 0, 0, 0]],
        [2, [0, 5], undefined, [0, 0, 1, 0, 0, 0]],
        [5, [0, 5], undefined, [0, 0, 0, 0, 0, 1]],
        [-1, [0, 5], true, [0, 0, 0, 0, 0, 0]],
        [6, [0, 5], true, [0, 0, 0, 0, 0, 0]],
    ])('.oneHot(%p, %p, %p)', (value, range, ignoreOverflow, expected) => {
        expect(util.oneHot(value, range, ignoreOverflow)).toStrictEqual(expected);
    });

    test.each([
        [1, 3, 1, [1, 2, 3]],
        [1, 4, 1, [1, 2, 3, 4]],
        [1, 5, 1, [1, 2, 3, 4, 5]],

        [0, 3, 1, [0, 1, 2, 3]],
        [0, 4, 1, [0, 1, 2, 3, 4]],
        [0, 5, 1, [0, 1, 2, 3, 4, 5]],

        [1, 5, 2, [1, 3, 5]],
        [1, 5, 5, [1]],
        [1, 1, undefined, [1]],
    ])('.range(%p, %p, %p)', (start, end, step, expected) => {
        expect(util.range(start, end, step)).toStrictEqual(expected);
    });

    test('.avg()', () => {
        const array = util.range(0, 80 * 1000, 1);
        const average = util.avg(array);

        expect(average).toBeCloseTo(40000);
    }) 

    test('.crossJoinByProps()', () => {
        const joined = util.crossJoinByProps({
            A: [1,2],
            B: [1,2],
            C: 3
        });

        expect(joined).toStrictEqual([
            {A: 1, B: 1, C: 3}, 
            {A: 2, B: 1, C: 3}, 
            {A: 1, B: 2, C: 3}, 
            {A: 2, B: 2, C: 3}
        ]);
    }) 
})