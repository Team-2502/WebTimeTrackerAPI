import {Timetracker} from "../../Timetracker";

export class APITokenMiddleware {
    public static checkForToken = async (req, res, next) => {
        // if(APITokenMiddleware.getToken(req) !== Timetracker.config.web.apiToken){
        //     return next(new Error("Unauthorized"))
        // }
        return next();
    };

    private static getToken = (req: any): string => {
        const {
            headers: { authorization }
        } = req;

        if (authorization && authorization.split(" ")[0] === "Token") {
            return authorization.split(" ")[1];
        }
        return null;
    };
}
