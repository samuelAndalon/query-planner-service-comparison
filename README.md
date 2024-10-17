# Setup

## Install JS runtimes

1. [Install Bun](https://bun.sh/docs/installation)
2. [Install Deno 2](https://deno.com/)
3. [Install Node](https://nodejs.org/en/download/package-manager)

## Install Rust

https://www.rust-lang.org/tools/install

## Running the project

1. Install JS dependencies (bun is fast for this.)
```bash
bun install 
```
2. run the project
```bash 
bun start
```
This command will start 3 servers
1. Node (expressjs) port 3000
2. Bun (bundled server) port 3001
3. Deno 2 (bundled server) port 3002
4. Rust port 3004

## Benchmark
Recommend using [vegeta](https://github.com/tsenart/vegeta)
```bash
https://github.com/tsenart/vegeta
```

### Example usage

#### Comand
```bash
vegeta attack -duration=10s -rate=100 -targets=target.txt | vegeta report -type=text
```

#### target.txt
```
POST http://localhost:3000/build-query-plan
content-type: application/json
@./payload.json
```

#### payload.json
```
{
  "operationName": "TopProducts",
  "query": "query TopProducts($first: Int) { topProducts(first: $first) { upc name reviews { id product { name } author { id name } } } }"
}
```

change the port in target.txt file when attempting to benchmark an specific query planner service or runtime.