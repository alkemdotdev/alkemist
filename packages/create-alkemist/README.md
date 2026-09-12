# create-alkemist

Create a versioned Alkemist site without cloning the source repository:

```sh
npm create alkemist@beta -- my-lab --provider cloudflare
```

The command writes files only. In the new directory, run `npm install` and
`npm run verify` when ready. It does not initialize Git, install dependencies,
or create a hosting account or deployment.
