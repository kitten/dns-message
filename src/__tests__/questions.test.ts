import { describe, it, expect } from 'vitest';

import { RecordClass, RecordType } from '../constants';
import * as utils from './utils';

import { question } from '../questions';

describe('question', () => {
  const questionFixtures = utils.fixtures(question, [
    // "." NS IN: null-terminator type=2 class=1
    {
      case: 'root NS',
      output: '00 0002 0001',
      input: {
        name: '.',
        type: RecordType.NS,
        class: RecordClass.IN,
        qu: false,
      },
    },
    // "test" A IN: 04 "test" 00 type=1 class=1
    {
      case: 'test A',
      output: '04 74657374 00 0001 0001',
      input: {
        name: 'test',
        type: RecordType.A,
        class: RecordClass.IN,
        qu: false,
      },
    },
    // "example.com" A IN
    {
      case: 'example.com A',
      output: `07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00 0001 0001`,
      input: {
        name: 'example.com',
        type: RecordType.A,
        class: RecordClass.IN,
        qu: false,
      },
    },
    // "www.example.com" AAAA IN
    {
      case: 'www.example.com AAAA',
      output: `03 ${utils.u2h('www')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00 001c 0001`,
      input: {
        name: 'www.example.com',
        type: RecordType.AAAA,
        class: RecordClass.IN,
        qu: false,
      },
    },
    // "example.com" MX IN
    {
      case: 'example.com MX',
      output: `07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00 000f 0001`,
      input: {
        name: 'example.com',
        type: RecordType.MX,
        class: RecordClass.IN,
        qu: false,
      },
    },
    // "example.com" MX IN QU
    {
      case: 'example.com MX',
      output: `07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00 000f 8001`,
      input: {
        name: 'example.com',
        type: RecordType.MX,
        class: RecordClass.IN,
        qu: true,
      },
    },
  ]);

  questionFixtures.test();

  it('removes QU_BIT from class', () => {
    const actual = utils.roundtrip(question, {
      name: 'example.com',
      type: RecordType.MX,
      class: RecordClass.IN | (1 << 15),
      qu: false,
    });
    expect(actual).toEqual({
      name: 'example.com',
      type: RecordType.MX,
      class: RecordClass.IN,
      qu: true,
    });
  });
});
