export interface IConfig {

    web: {
        jwtSecret: string,
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
