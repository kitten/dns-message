import { describe } from 'vitest';

import * as utils from './utils';

import { SvcParamCode, svcParams } from '../svcparams';

describe('svcParams', () => {
  const svcParamsFixtures = utils.fixtures(svcParams, [
    {
      case: 'empty',
      output: '',
      input: {
        alpn: undefined,
        dohpath: undefined,
        echconfig: undefined,
        ipv4hint: undefined,
        ipv6hint: undefined,
        mandatory: undefined,
        'no-default-alpn': false,
        odoh: undefined,
        port: undefined,
      },
    },
    {
      case: 'full',
      output:
        '00000004000000070001000e06616c706e2d3106616c706e2d32000200000003000200500004000801010101080808080006002022ab000000000000000000000000000022cd000000000000000000000000000000050002dead000700052f7465737480010002beef',
      input: {
        mandatory: [SvcParamCode.Mandatory, SvcParamCode.DohPath],
        alpn: ['alpn-1', 'alpn-2'],
        'no-default-alpn': true,
        port: 80,
        ipv4hint: ['1.1.1.1', '8.8.8.8'],
        ipv6hint: ['22ab::', '22cd::'],
        echconfig: new Uint8Array([0xde, 0xad]),
        odoh: new Uint8Array([0xbe, 0xef]),
        dohpath: '/test',
      },
    },
  ]);

  svcParamsFixtures.test();
});
