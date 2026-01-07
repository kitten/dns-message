# dns-message

`dns-message` is a web-compatible encoder and decoder of DNS message packets (derivative of [dns-packet](https://github.com/mafintosh/dns-packet))

## Implementation

The goal of `dns-message` is to be a derivative of [dns-packet](https://github.com/mafintosh/dns-packet) that uses typed arrays and `DataView`s to decode and encode DNS messages, removing the reliance on Node.js Buffer and being compatible with any JavaScript runtime that supports `DataView`s, while also having types baked-in.

## API Reference

For a full list of reference types, consult this library's typings.

### `interface Packet`

A DNS message input or decoded message.

- accepts `rtype: PacketRType` which is set using `PacketFlag` values
- flags `PacketFlag` as a bitfield (includes `rtype` and `type`)

### `interface Question`

A DNS question input or decoded payload.

- `qu` reflects the `class` field, which is a bit field usually set to `RecordClass`

### `encode(input: Packet): Uint8Array`

- Accepts a DNS packet of type `Packet`

Returns an encoded `Uint8Array` of the encoded DNS message

### `decode(bytes: ArrayBufferView | ArrayBufferLike): Packet`

- Accepts binary data of a DNS message
- May throw built-in `RangeError`s

Returns a decoded DNS `Packet`

### `encodingLength(input: Packet): number`

- Accepts a DNS packet of type `Packet`

Returns amount of bytes required for encoding

### `streamEncode(input: Packet): Uint8Array`

- Accepts a DNS packet of type `Packet`

Returns an encoded `Uint8Array` of the encoded DNS message, prefixed with a UInt16-BE length for TCP encoding.

### `streamDecode(bytes: ArrayBufferView | ArrayBufferLike): Packet`

- Accepts binary data of a DNS message, prefixed with a UInt16-BE length
- May throw built-in `RangeError`s

Returns a decoded DNS `Packet`
