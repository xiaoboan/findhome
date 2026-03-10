declare module '@amap/amap-jsapi-loader' {
  interface LoadOptions {
    key: string
    version: string
    plugins?: string[]
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function load(options: LoadOptions): Promise<any>
  export default { load }
}
