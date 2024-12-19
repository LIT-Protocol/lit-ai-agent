# Commands

- Deploy `PKPTools.sol` using existing Safe contract:

```bash
SAFE_ADDRESS=0x... forge script script/PKPTools.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key>
```

- Deploy `PKPTools.sol` using new Safe contract:

```bash
forge script script/PKPTools.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key>
```

