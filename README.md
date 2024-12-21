# Using Nx

```bash
# Build a specific project
nx build lit-agent-contracts

# Test a specific project
nx test lit-agent-contracts

# Run a command on all projects
nx run-many --target=build --all

# Run a command on affected projects only
nx affected --target=build
```

```bash
# View dependency graph
nx graph

# See what projects are affected by your changes
nx affected:graph

# Run multiple tasks
nx run-many --target=build,test,lint
```
