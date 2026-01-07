import { OptCode } from './constants';
import {
  type Encoder,
  withRDLength,
  encodeIntoBuffer,
  advance,
  bytes,
  ipv4,
  ipv6,
} from './encoders';

export const enum IPType {
  v4 = 1,
  v6 = 2,
}

export interface BaseOpt {
  code: number;
}

export interface ClientSubnetOpt extends BaseOpt {
  code: OptCode.CLIENT_SUBNET;
  family?: IPType | (number & {});
  sourcePrefixLength?: number;
  scopePrefixLength?: number;
  ip: string;
}

export interface KeepAliveOpt extends BaseOpt {
  code: OptCode.TCP_KEEPALIVE;
  timeout?: number;
}

export interface PaddingOpt extends BaseOpt {
  code: OptCode.PADDING;
  length?: number;
}

export interface TagOpt extends BaseOpt {
  code: OptCode.KEY_TAG;
  tags: number[];
}

export interface UnknownOpt extends BaseOpt {
  data: Uint8Array;
}

export type PacketOpt =
  | ClientSubnetOpt
  | KeepAliveOpt
  | PaddingOpt
  | TagOpt
  | UnknownOpt;

export const unknownOpt: Encoder<UnknownOpt> = withRDLength({
  bytes(option) {
    return bytes.bytes(option.data);
  },
  write(view, offset, option) {
    return bytes.write(view, offset, option.data);
  },
  read(view, position) {
    return {
      code: OptCode.OPTION_0,
      data: bytes.read(view, position),
    };
  },
});

// See: https://github.com/nodejs/node/blob/842448b/lib/internal/net.js#L15-L18
const v4Seg = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])';
const v4Str = `(?:${v4Seg}\\.){3}${v4Seg}`;
const ipv4Re = new RegExp(`^${v4Str}$`);

const isIPv4 = (ip: string) => ipv4Re.test(ip);

export const clientSubnetOpt: Encoder<ClientSubnetOpt> = withRDLength({
  bytes(option) {
    const sourcePrefixLength = option.sourcePrefixLength || 0;
    return Math.ceil(sourcePrefixLength / 8) + 4;
  },
  write(view, offset, option) {
    const sourcePrefixLength = option.sourcePrefixLength || 0;
    const scopePrefixLength = option.scopePrefixLength || 0;
    const family = option.family || (isIPv4(option.ip) ? IPType.v4 : IPType.v6);
    const maskLength = Math.ceil(sourcePrefixLength / 8);
    view.setUint16(offset, family);
    view.setUint8(offset + 2, sourcePrefixLength);
    view.setUint8(offset + 3, scopePrefixLength);
    offset += 4;
    const ipBuffer = encodeIntoBuffer(
      family === IPType.v4 ? ipv4 : ipv6,
      option.ip
    );
    for (let byteIdx = 0; byteIdx < maskLength; byteIdx++)
      view.setUint8(offset++, ipBuffer[byteIdx]);
    return offset;
  },
  read(view, position) {
    const family = view.getUint16(position.offset);
    const sourcePrefixLength = view.getUint8(position.offset + 2);
    const scopePrefixLength = view.getUint8(position.offset + 3);
    advance(position, 4);
    return {
      code: OptCode.CLIENT_SUBNET,
      family,
      sourcePrefixLength,
      scopePrefixLength,
      ip:
        family === IPType.v4
          ? ipv4.read(view, position)
          : ipv6.read(view, position),
    };
  },
});

export const keepAliveOpt: Encoder<KeepAliveOpt> = withRDLength({
  bytes(option) {
    return option.timeout ? 2 : 0;
  },
  write(view, offset, option) {
    if (option.timeout) {
      view.setUint16(offset, option.timeout);
      offset += 2;
    }
    return offset;
  },
  read(view, position) {
    if (position.length) {
      const timeout = view.getUint16(position.offset);
      advance(position, 2);
      return { code: OptCode.TCP_KEEPALIVE, timeout };
    } else {
      return { code: OptCode.TCP_KEEPALIVE, timeout: undefined };
    }
  },
});

export const paddingOpt: Encoder<PaddingOpt> = withRDLength({
  bytes(option) {
    return option.length || 0;
  },
  write(_view, offset, option) {
    return offset + (option.length || 0);
  },
  read(_view, position) {
    const { length } = position;
    advance(position, length);
    return { code: OptCode.PADDING, length };
  },
});

export const tagOpt: Encoder<TagOpt> = withRDLength({
  bytes(option) {
    return option.tags.length * 2;
  },
  write(view, offset, option) {
    for (let idx = 0; idx < option.tags.length; idx++) {
      view.setUint16(offset, option.tags[idx]);
      offset += 2;
    }
    return offset;
  },
  read(view, position) {
    const { offset, length } = position;
    const tags: number[] = [];
    while (position.offset - offset < length) {
      tags.push(view.getUint16(position.offset));
      advance(position, 2);
    }
    return {
      code: OptCode.KEY_TAG,
      tags,
    };
  },
});

const isUnknownOpt = (option: PacketOpt): option is UnknownOpt =>
  !!(option as UnknownOpt).data;

export const option: Encoder<PacketOpt> = {
  bytes(option) {
    if (isUnknownOpt(option)) {
      return unknownOpt.bytes(option) + 2;
    }
    switch (option.code) {
      case OptCode.CLIENT_SUBNET:
        return clientSubnetOpt.bytes(option) + 2;
      case OptCode.TCP_KEEPALIVE:
        return keepAliveOpt.bytes(option) + 2;
      case OptCode.PADDING:
        return paddingOpt.bytes(option) + 2;
      case OptCode.KEY_TAG:
        return tagOpt.bytes(option) + 2;
    }
  },
  write(view, offset, option) {
    view.setUint16(offset, option.code);
    offset += 2;
    if (isUnknownOpt(option)) {
      return unknownOpt.write(view, offset, option);
    }
    switch (option.code) {
      case OptCode.CLIENT_SUBNET:
        return clientSubnetOpt.write(view, offset, option);
      case OptCode.TCP_KEEPALIVE:
        return keepAliveOpt.write(view, offset, option);
      case OptCode.PADDING:
        return paddingOpt.write(view, offset, option);
      case OptCode.KEY_TAG:
        return tagOpt.write(view, offset, option);
    }
  },
  read(view, position) {
    const code = view.getUint16(position.offset);
    advance(position, 2);
    switch (code) {
      case OptCode.CLIENT_SUBNET:
        return clientSubnetOpt.read(view, position);
      case OptCode.TCP_KEEPALIVE:
        return keepAliveOpt.read(view, position);
      case OptCode.PADDING:
        return paddingOpt.read(view, position);
      case OptCode.KEY_TAG:
        return tagOpt.read(view, position);
      default:
        const opt = unknownOpt.read(view, position);
        opt.code = code;
        return opt;
    }
  },
};
