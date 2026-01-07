import type { RecordType } from './constants';

export interface ReadPosition {
  offset: number;
  length: number;
}

export interface Encoder<T, R = T> {
  bytes(input: T): number;
  write(view: DataView, offset: number, input: T): number;
  read(view: DataView, position: ReadPosition): R;
}

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

const utf8ByteLength =
  typeof Buffer !== 'undefined'
    ? (str: string) => Buffer.byteLength(str)
    : (str: string) => {
        let length = str.length;
        for (let i = length - 1; i >= 0; i--) {
          const code = str.charCodeAt(i);
          if (code > 0x7f && code <= 0x7ff) {
            length++;
          } else if (code > 0x7ff && code <= 0xffff) {
            length += 2;
          }
          // UTF-16 Trail Surrogate
          if (code >= 0xdc00 && code <= 0xdfff) {
            i--;
          }
        }
        return length;
      };

export const name: Encoder<string> = {
  bytes(str) {
    let length = 2;
    switch (str) {
      case '':
      case '.':
      case '..':
        return 1;
      default:
        if (str[0] === '.') length--;
        if (str[str.length - 1] === '.') length--;
        return length + str.replace(/\\\./g, '.').length;
    }
  },
  write(view, offset, str) {
    const encoded = textEncoder.encode(str);
    for (
      let startIdx = encoded[0] === 46 /*'.'*/ ? 1 : 0, endIdx = 0;
      startIdx < encoded.byteLength;
      startIdx = endIdx + 1
    ) {
      endIdx = encoded.indexOf(46 /*'.'*/, startIdx);
      while (endIdx > -1 && encoded[endIdx - 1] === 92 /*'\\'*/)
        endIdx = encoded.indexOf(46 /*'.'*/, endIdx + 1);
      if (endIdx === -1) endIdx = encoded.byteLength;
      if (endIdx === startIdx) continue;
      let byteIdx = offset + 1;
      for (let idx = startIdx; idx < endIdx; idx++) {
        if (encoded[idx] === 92 /*'\\'*/ && encoded[idx + 1] === 46 /*'.'*/)
          idx++;
        view.setUint8(byteIdx++, encoded[idx]);
      }
      view.setUint8(offset, byteIdx - offset - 1);
      offset = byteIdx;
      startIdx = endIdx + 1;
    }
    return offset + 1;
  },
  read(view, position) {
    let { offset, length } = position;
    const labels: string[] = [];
    while (position.offset - offset < length) {
      const labelLength = view.getUint8(position.offset);
      advance(position, 1);
      if (labelLength === 0) {
        break;
      } else if ((labelLength & 0xc0) === 0) {
        const label = textDecoder.decode(
          sliceView(view, position, labelLength)
        );
        labels.push(label.replace(/\./g, '\\.'));
      } else if ((labelLength & 0xc0) === 0xc0) {
        // RFC 1035, section 4.1.4 states:
        // "[...] an entire domain name or a list of labels at the end of a domain name
        // is replaced with a pointer to a prior occurance (sic) of the same name."
        const bytesRead = position.offset - offset;
        offset = position.offset;
        length = position.length;
        // Set position to jump target with synthetic length
        position.offset = view.getUint16(position.offset - 1) - 0xc000;
        position.length = length - bytesRead;
        const jumpName = name.read(view, position);
        if (jumpName && jumpName !== '.') labels.push(jumpName);
        // Restore original position
        position.offset = offset;
        position.length = length;
        break;
      }
    }
    return labels.join('.') || '.';
  },
};

export const bytes: Encoder<Uint8Array | string, Uint8Array> = {
  bytes(data) {
    return typeof data === 'string' ? utf8ByteLength(data) : data.byteLength;
  },
  write(view, offset, data) {
    const bytes = typeof data === 'string' ? textEncoder.encode(data) : data;
    const target = new Uint8Array(
      view.buffer,
      view.byteOffset + offset,
      bytes.byteLength
    );
    target.set(bytes);
    offset += bytes.byteLength;
    return offset;
  },
  read(view, position) {
    return sliceView(view, position);
  },
};

export const string: Encoder<string> = {
  bytes(str) {
    return utf8ByteLength(str) + 1;
  },
  write(view, offset, data) {
    const buffer = textEncoder.encode(data);
    view.setUint8(offset++, buffer.byteLength);
    return bytes.write(view, offset, buffer);
  },
  read(view, position) {
    const length = view.getUint8(position.offset);
    advance(position, 1);
    return textDecoder.decode(sliceView(view, position, length));
  },
};

export const typeBitmap: Encoder<RecordType[]> = {
  bytes(types) {
    const extents: number[] = [];
    for (let idx = 0; idx < types.length; idx++)
      extents[types[idx] >> 8] = Math.max(
        extents[types[idx] >> 8] || 0,
        types[idx] & 0xff
      );
    let length = 0;
    for (let idx = 0; idx < extents.length; idx++)
      if (extents[idx] != null) length += 2 + Math.ceil((extents[idx] + 1) / 8);
    return length;
  },
  write(view, offset, types) {
    const typesByWindow: number[][] = [];
    for (let idx = 0; idx < types.length; idx++) {
      const window =
        typesByWindow[types[idx] >> 8] || (typesByWindow[types[idx] >> 8] = []);
      window[(types[idx] >> 3) & 0x1f] |= 1 << (7 - (types[idx] & 0x7));
    }
    for (let idx = 0; idx < typesByWindow.length; idx++) {
      const window = typesByWindow[idx];
      if (window != null) {
        view.setUint8(offset++, idx);
        view.setUint8(offset++, window.length);
        for (let byteIdx = 0; byteIdx < window.length; byteIdx++) {
          view.setUint8(offset++, window[byteIdx]);
        }
      }
    }
    return offset;
  },
  read(view, position) {
    const { offset, length } = position;
    const typelist: RecordType[] = [];
    while (position.offset - offset < length) {
      const window = view.getUint8(position.offset);
      const windowLength = view.getUint8(position.offset + 1);
      for (let idx = 0; idx < windowLength; idx++) {
        const bitmap = view.getUint8(position.offset + 2 + idx);
        for (let bit = 0; bit < 8; bit++) {
          if (bitmap & (1 << (7 - bit))) {
            typelist.push((window << 8) | (idx << 3) | bit);
          }
        }
      }
      advance(position, 2 + windowLength);
    }
    return typelist;
  },
};

export const ipv4: Encoder<string> = {
  bytes() {
    return 4;
  },
  write(view, offset, ip) {
    const octets = ip.split('.', 4);
    for (let octetIdx = 0; octetIdx < 4; octetIdx++)
      view.setUint8(offset++, parseInt(octets[octetIdx], 10));
    return offset;
  },
  read(view, position) {
    const length = Math.min(position.length, 4);
    const ip = new Array(4)
      .fill(0)
      .map((_, index) =>
        index < length ? view.getUint8(position.offset + index) : 0
      )
      .join('.');
    advance(position, length);
    return ip;
  },
};

export const uint16: Encoder<number> = {
  bytes() {
    return 2;
  },
  write(view, offset, key) {
    view.setUint16(offset, key);
    return offset + 2;
  },
  read(view, position) {
    const key = view.getUint16(position.offset);
    advance(position, 2);
    return key;
  },
};

export const ipv6: Encoder<string> = {
  bytes() {
    return 16;
  },
  write(view, offset, ip) {
    const middleIdx = ip.indexOf('::');
    const head = (middleIdx > -1 ? ip.slice(0, middleIdx) : ip).split(':');
    const tail = middleIdx > -1 ? ip.slice(middleIdx + 2).split(':') : [];
    const ipv4 =
      tail.length > 0 && tail[tail.length - 1].includes('.')
        ? tail.pop()
        : undefined;
    for (let headIdx = 0; headIdx < head.length; headIdx++) {
      view.setUint16(offset, parseInt(head[headIdx], 16));
      offset += 2;
    }
    const middleLength = 8 - (head.length + tail.length + (ipv4 ? 2 : 0));
    for (let pad = middleLength; pad > 0; pad--) {
      view.setUint16(offset, 0);
      offset += 2;
    }
    for (let tailIdx = 0; tailIdx < tail.length; tailIdx++) {
      view.setUint16(offset, parseInt(tail[tailIdx], 16));
      offset += 2;
    }
    if (ipv4) {
      const v4Parts = ipv4.split('.', 4).map(part => parseInt(part, 10));
      view.setUint16(offset, (v4Parts[0] << 8) | v4Parts[1]);
      view.setUint16(offset + 2, (v4Parts[2] << 8) | v4Parts[3]);
      offset += 4;
    }
    return offset;
  },
  read(view, position) {
    let output = '';
    const length = Math.min(position.length, 16);
    for (let idx = 0; idx < length; idx += 2) {
      if (idx !== 0) output += ':';
      output += view.getUint16(position.offset + idx).toString(16);
    }
    advance(position, length);
    return output
      .replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3')
      .replace(/:{3,4}/, '::');
  },
};

export const withRDLength = <T, R = T>(
  encoder: Encoder<T, R>
): Encoder<T, R> => ({
  bytes(data) {
    return encoder.bytes(data) + 2;
  },
  write(view, offset, data) {
    const startOffset = offset;
    offset = encoder.write(view, offset + 2, data);
    view.setUint16(startOffset, offset - startOffset - 2);
    return offset;
  },
  read(view, position) {
    const { offset, length } = position;
    const rdlength = (position.length = view.getUint16(position.offset));
    position.offset += 2;
    const data = encoder.read(view, position);
    // Restore original position and advance by specified size after
    position.offset = offset + 2 + rdlength;
    position.length = length;
    return data;
  },
});

export const array = <T>(encoder: Encoder<T>): Encoder<T[]> => ({
  bytes(data) {
    let byteLength = 0;
    for (let idx = 0; data != null && idx < data.length; idx++)
      byteLength += encoder.bytes(data[idx]);
    return byteLength;
  },
  write(view, offset, data) {
    for (let idx = 0; data != null && idx < data.length; idx++)
      offset = encoder.write(view, offset, data[idx]);
    return offset;
  },
  read(view, position) {
    const { offset, length } = position;
    const data: T[] = [];
    while (position.offset - offset < length)
      data.push(encoder.read(view, position));
    return data;
  },
});

export const advance = (position: ReadPosition, bytes: number) => {
  position.offset += bytes;
  position.length -= bytes;
};

export const encodeIntoBuffer = <T>(
  encoder: Encoder<T>,
  input: T
): Uint8Array => {
  const buffer = new ArrayBuffer(encoder.bytes(input));
  const endOffset = encoder.write(new DataView(buffer), 0, input);
  return new Uint8Array(buffer, 0, endOffset);
};

export const sliceView = (
  view: DataView,
  position: ReadPosition,
  length = position.length
) => {
  const slice = new Uint8Array(
    view.buffer,
    view.byteOffset + position.offset,
    length
  );
  advance(position, length);
  return slice;
};
