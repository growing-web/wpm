import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  entries: [
    {
      input: 'src/index.ts',
      name: 'index',
    },
    {
      input: 'src/common/fetch-vscode.ts',
      name: 'fetch-vscode',
    },
    {
      input: 'src/common/fetch-deno.ts',
      name: 'fetch-deno',
    },
    {
      input: 'src/common/fetch-node.ts',
      name: 'fetch-node',
    },
    {
      input: 'src/common/fetch-native.ts',
      name: 'fetch-native',
    },
  ],
  declaration: true,
  outDir: 'dist',
  externals: ['rimraf', '#fetch'],
})
