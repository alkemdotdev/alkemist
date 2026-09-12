# create-alkemist

Create a versioned Alkemist site from a source checkout:

```sh
npm ci
npm run create:site -- ../my-lab --provider cloudflare
cd ../my-lab
npm install
npm run verify
```

The command writes an independent site into an empty destination. It does not
initialize Git, create a hosting account, or deploy.
