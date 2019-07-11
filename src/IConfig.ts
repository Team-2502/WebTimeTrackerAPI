export interface IConfig {

    web: {
        jwtSecret: string,
        host: string
        ports: {
            http: number,
        }
    },
    database: string
}
