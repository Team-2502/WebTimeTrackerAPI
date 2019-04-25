export interface IConfig {

    web: {
        jwtSecret: string,
        host: string
        ports: {
            http: number,
            https: number
        }
    },
    database: string
}
