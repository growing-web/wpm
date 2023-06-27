import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  entries: ['src/cli', 'src/index'],
  declaration: true,
  rollup: {
    emitCJS: true,
  },
})
