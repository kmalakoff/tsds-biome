# tsds-biome

Internal Biome formatter command used by `ts-dev-stack`.

```bash
npm install --save-dev ts-dev-stack tsds-config
```

Run it through the `tsds` CLI:

```bash
npx tsds format
```

When the project has no `biome.json`, the command uses the default configuration
from `tsds-config`. To use a project configuration, extend
`tsds-config/biome.json`. Pass `--dry-run` to check command selection without
formatting. See the
[ts-dev-stack documentation](https://www.npmjs.com/package/ts-dev-stack) for
project setup.
