declare function install(options: {
  force?: boolean
  includeTarget?: boolean
}): Promise<void>
declare function init(): Promise<void>

export { init, install }
