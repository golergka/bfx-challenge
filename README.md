# Bitfinex interview challenge

## Running the project

Install dependencies:

```bash
npm i
```

Install `grape` in your system and run two servers:

```bash
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```

Run server instance:

```bash
npm run server
```

Run client instance:

```bash
npm run client
```

## Tasks

- [x] Basic hello world project following the challenge instructions
- _Optional_
  - [ ] Complete project setup with `grape` servers in one script

## Questions

- Why do I need to run two grape servers? Only the port number of the first one of them, 30001, is used anywhere in the example code. Both the challenge description and the referenced blog post don't have any explanation of this.
