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
  - [ ] Use proper money type instead of `number` and solve float-point arithmetic issues
  - [ ] Include hash of the whole block into order's hash. Currently orders are only ordered based on their own hashes, which incentivices order placers to come up with smaller hashes, which will increase the likelihood of conflict. If we include the hash of the whole block into the order's hash, the whole hash will be unpredictable.
  - [ ] Refactor order matching logic into separate files
	- [ ] Make order matching logic work in-place with array indexes for performance

## Questions

- Why do I need to run two grape servers? Only the port number of the first one of them, 30001, is used anywhere in the example code. Both the challenge description and the referenced blog post don't have any explanation of this.
- Why can't I use Typescript for this assignment? Working with Vanilla JS is making me really unproductive.
