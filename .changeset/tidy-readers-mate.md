---
'dns-message': patch
---

Fix `streamEncode` and `streamDecode` treating length uint16 prefix as including the length bytes themselves, rather than excluding them
