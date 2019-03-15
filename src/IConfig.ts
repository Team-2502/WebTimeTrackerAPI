export interface IConfig {

    web: {
        apiToken: string,
        host: string
        ports: {
            http: number,
            https: number
        }
    },
    ssl: {
        key: string,
        cert: string
    },
    database: string
}
