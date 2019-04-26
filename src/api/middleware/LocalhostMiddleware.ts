export class LocalhostMiddleware {
    public static checkLocal = async (req, res, next) => {

        // Check if the requester
        if(LocalhostMiddleware.checkReq(req)){
            return next()
        }

        return next(new Error("Unauthorized"));
    };

    public static checkReq = (req: any) => {
        return (req.connection.remoteAddress === "127.0.0.1" ||
            req.connection.remoteAddress === "::ffff:127.0.0.1" ||
            req.connection.remoteAddress === "::1");
    };
}