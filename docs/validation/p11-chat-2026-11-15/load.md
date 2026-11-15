| scenario | requests | ms | req/s | µs/req |
|---|---|---|---|---|
| 2000 accounts send one message each at the same moment | 2000 | 447 | 4476 | 223 |
| one account sends 200 at once | 200 | 14 | 14547 | 69 |
| 2000 accounts poll from 0 (50 newest each) | 2000 | 511 | 3914 | 256 |
| 2000 accounts poll with nothing new | 2000 | 152 | 13197 | 76 |
