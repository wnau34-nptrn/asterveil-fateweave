| scenario | requests | ms | req/s | µs/req |
|---|---|---|---|---|
| 2000 accounts × 5 hits, one hit per request, HP never runs out | 10000 | 1152 | 8683 | 115 |
| 2000 accounts × 5 hits on 5000 HP (all but ~10 hits applied 0) | 10000 | 975 | 10262 | 97 |
| 10000 hits in batches of 64 | 157 | 594 | 264 | 3785 |
| the same 10000 hits resent in batches of 64 | 157 | 140 | 1118 | 894 |
| 500 identical retries of one hit | 500 | 11 | 45072 | 22 |
| 8000 requests, 90% status reads and 10% hits | 8000 | 366 | 21873 | 46 |
