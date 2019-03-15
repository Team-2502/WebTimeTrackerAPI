import {Timetracker} from "../../Timetracker";

export class APITokenMiddleware {
    public static checkForToken = async (req, res, next) => {

        // Check if the requester
        if(APITokenMiddleware.checkReq(req)){
            return next()
        }

        return next(new Error("Unauthorized"));
    };

    public static checkReq = (req: any) => {
        return (APITokenMiddleware.getToken(req) === Timetracker.config.web.apiToken ||
            req.connection.remoteAddress === "127.0.0.1" ||
            req.connection.remoteAddress === "::ffff:127.0.0.1" ||
            req.connection.remoteAddress === "::1");
    };

    private static getToken = (req: any): string => {
        const {
            headers: {authorization}
        } = req;

        if (authorization && authorization.split(" ")[0] === "Token") {
            return authorization.split(" ")[1];
        }
        return null;
    };
}
