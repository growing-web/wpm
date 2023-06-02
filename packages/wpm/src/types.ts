export type Importmap = {
  imports: Record<string, string>
  scopes: Record<string, Record<string, Record<string, string>>>
}

export interface WpmInstallOptions {
  /**
   * 不使用缓存，强制更新
   * @default false
   */
  force?: boolean
  /**
   * 项目根目录
   * @default process.cwd()
   */
  cwd?: string
  /**
   * 是否生成importmap文件
   * @default true
   */
  createImportmap?: boolean | string
  /**
   * 将importmap注入指定html
   */
  htmlInject?: string
  /**
   * cdn api路径
   */
  cdnApiUrl?: string
  /**
   * cdn路径
   */
  cdnUrl?: string
}

export interface InstanceDep {
  target: string
  alias?: string
}
