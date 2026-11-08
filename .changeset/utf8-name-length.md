---
'dns-message': patch
---

Count UTF-8 bytes instead of UTF-16 code units in `name.bytes()`, so names with non-ASCII characters are encoded without a `RangeError` (#20)
