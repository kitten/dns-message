import { Buffer } from 'node:buffer';
import { it, expect } from 'vitest';
import { encodeIntoBuffer, Encoder } from '../encoders';

export interface Fixture<T> {
  case: string;
  output: string;
  input: T;
}

export interface FixtureTest<T> extends Array<Fixture<T>> {
  test(): void;
}

export function fixtures<const T>(
  encoder: Encoder<T>,
  fixtures: readonly Fixture<T>[]
): FixtureTest<T> {
  return Object.assign([...fixtures], {
    test() {
      it.each(fixtures)('decodes ($case)', ({ input, output }) => {
        const v = view(output);
        const result = encoder.read(v, { offset: 0, length: v.byteLength });
        expect(result).toEqual(input);
      });

      it.each(fixtures)('encodes ($case)', ({ input, output }) => {
        expect(toHex(encodeIntoBuffer(encoder, input))).toBe(toHex(output));
      });

      it.each(fixtures)('pre-calc bytes ($case)', ({ input, output }) => {
        const byteLength = encoder.bytes(input);
        expect(byteLength).toBe(hex(output).byteLength);
      });

      it.each(fixtures)('roundtrips ($case)', ({ input }) => {
        expect(roundtrip(encoder, input)).toEqual(input);
      });
    },
  });
}

export function roundtrip<T>(encoder: Encoder<T>, input: T): T {
  const bytes = encodeIntoBuffer(encoder, input);
  const v = view(bytes.slice());
  return encoder.read(v, { offset: 0, length: v.byteLength });
}

export const u2h = (s: string) => Buffer.from(s).toString('hex');

export const hex = (s: string) => {
  const buf = Buffer.from(s.replace(/\s+/g, ''), 'hex');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

export const view = (s: Uint8Array | string) => {
  const buf = typeof s === 'string' ? hex(s) : s;
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
};

export const toHex = (b: Uint8Array | string) =>
  typeof b === 'string'
    ? Buffer.from(hex(b)).toString('hex')
    : Buffer.from(b).toString('hex');
