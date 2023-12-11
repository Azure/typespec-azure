# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

## Instructions for editing or contributing to this website

### Build

```
$ npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Local testing

```
$ npm start
```

This command will build and start local server typically on localhost:3000

### Adding top level menu bar and footer

Edit `docusaurus.config.js` and add your content and links

### Adding content to Docs

Follow these steps to add doc contents:

- Create folder for topic section under docs OR
- Create markdown file in appropriate subfolder under docs
- Update `./sidebars.js`. \* See notes below

**Important**:

- For `Reference` and `Troubleshoot` sections, you DO NOT need to update `sidebars.js` since these two are auto-indexed. Just drop in the files in the correct folder.
- For other sections, please add the files in the right order in the `items:[]`
- Please note the doc IDs are case sensitive and must match the casing of folder and file name.

For sidebars definition and tutorial, see [here](https://docusaurus.io/docs/sidebar/items).
