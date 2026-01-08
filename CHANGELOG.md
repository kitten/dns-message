# dns-message

## 1.0.3

### Patch Changes

- Add missing exports for types
  Submitted by [@kitten](https://github.com/kitten) (See [#11](https://github.com/kitten/dns-message/pull/11))

## 1.0.2

### Patch Changes

- Add typings workaround due to `const enum` not being transpiled to `enum` in typings
  Submitted by [@kitten](https://github.com/kitten) (See [#9](https://github.com/kitten/dns-message/pull/9))

## 1.0.1

### Patch Changes

- Clamp `position.length` to `>=0` to be defensive
  Submitted by [@kitten](https://github.com/kitten) (See [#2](https://github.com/kitten/dns-message/pull/2))
- ⚠️ Fix `issuerCritical` overriding CAA flags
  Submitted by [@kitten](https://github.com/kitten) (See [#8](https://github.com/kitten/dns-message/pull/8))
- Constrain message compression (name) pointer references
  Submitted by [@kitten](https://github.com/kitten) (See [#4](https://github.com/kitten/dns-message/pull/4))
- Encode/decode PTR, CNAME, and DNAME as names
  Submitted by [@kitten](https://github.com/kitten) (See [#1](https://github.com/kitten/dns-message/pull/1))
- Change NSEC3 salt and nextDomain data fields to Uint8Array
  Submitted by [@kitten](https://github.com/kitten) (See [#7](https://github.com/kitten/dns-message/pull/7))
- Enforce name and label length limits
  Submitted by [@kitten](https://github.com/kitten) (See [#3](https://github.com/kitten/dns-message/pull/3))
- ⚠️ Fix `streamEncode` and `streamDecode` treating length uint16 prefix as including the length bytes themselves, rather than excluding them
  Submitted by [@kitten](https://github.com/kitten) (See [#6](https://github.com/kitten/dns-message/pull/6))

## 1.0.0

Initial Release.
